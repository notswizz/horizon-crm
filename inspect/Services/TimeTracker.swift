import Foundation
import CoreLocation
import Observation
import UserNotifications
import FirebaseFirestore

@Observable
final class TimeTracker {
    var activeEntry: TimeEntry?
    var elapsedSeconds: Int = 0
    var timeEntries: [TimeEntry] = []

    var isTracking: Bool { activeEntry != nil }
    var activeJobId: UUID? { activeEntry?.jobId }

    private var timer: Timer?
    private var geofenceTimer: Timer?
    private var consecutiveOutOfRange = 0
    private let geofenceRadius: Double = 1000  // meters
    private let clockInRadius: Double = 500     // meters
    private let geofenceCheckInterval: TimeInterval = 30
    private let consecutiveChecksToAutoStop = 3

    @ObservationIgnored private lazy var db = Firestore.firestore()
    private weak var _locationManager: LocationManager?
    private weak var _store: JobStore?

    // MARK: - Persistence

    private static let activeEntryKey = "activeTimeEntry"

    func restoreActiveSession() {
        guard let data = UserDefaults.standard.data(forKey: Self.activeEntryKey),
              let entry = try? JSONDecoder().decode(TimeEntry.self, from: data) else { return }
        activeEntry = entry
        elapsedSeconds = Int(Date().timeIntervalSince(entry.clockInTime))
        startTimer()
    }

    private func persistActiveEntry() {
        guard let entry = activeEntry,
              let data = try? JSONEncoder().encode(entry) else {
            UserDefaults.standard.removeObject(forKey: Self.activeEntryKey)
            return
        }
        UserDefaults.standard.set(data, forKey: Self.activeEntryKey)
    }

    private func clearPersistedEntry() {
        UserDefaults.standard.removeObject(forKey: Self.activeEntryKey)
    }

    // MARK: - Distance Check

    func distanceToJob(_ job: Job, from locationManager: LocationManager) -> Double? {
        locationManager.distance(to: job)
    }

    func canClockIn(job: Job, locationManager: LocationManager) -> Bool {
        guard let dist = distanceToJob(job, from: locationManager) else { return false }
        return dist <= clockInRadius
    }

    // MARK: - Clock In

    func clockIn(job: Job, workerId: String, workerName: String, locationManager: LocationManager, store: JobStore) -> String? {
        guard !isTracking else { return "Already clocked in to another job" }

        guard let location = locationManager.currentLocation else {
            return "Location unavailable. Enable location services."
        }

        guard let dist = distanceToJob(job, from: locationManager), dist <= clockInRadius else {
            return "You must be within 500m of the job site to clock in"
        }

        let entry = TimeEntry(
            jobId: job.id,
            workerId: workerId,
            workerName: workerName,
            clockInTime: Date(),
            clockInLocation: GeoPoint(
                latitude: location.coordinate.latitude,
                longitude: location.coordinate.longitude
            ),
            isAutoStopped: false
        )

        activeEntry = entry
        elapsedSeconds = 0
        consecutiveOutOfRange = 0
        _locationManager = locationManager
        _store = store
        persistActiveEntry()
        startTimer()
        startGeofenceMonitoring(job: job, locationManager: locationManager)
        return nil // success
    }

    // MARK: - Clock Out

    func clockOut(locationManager: LocationManager, store: JobStore, isAutoStopped: Bool = false) async {
        guard var entry = activeEntry else { return }

        let now = Date()
        entry.clockOutTime = now
        entry.totalSeconds = Int(now.timeIntervalSince(entry.clockInTime))
        entry.isAutoStopped = isAutoStopped

        if let location = locationManager.currentLocation {
            entry.clockOutLocation = GeoPoint(
                latitude: location.coordinate.latitude,
                longitude: location.coordinate.longitude
            )
        }

        stopTimer()
        stopGeofenceMonitoring()
        activeEntry = nil
        elapsedSeconds = 0
        clearPersistedEntry()

        // Write to Firestore
        await writeTimeEntry(entry)

        // Add to local list if viewing this job
        timeEntries.insert(entry, at: 0)

        if isAutoStopped {
            sendAutoStopNotification(entry: entry, store: store)
        }
    }

    // MARK: - Firestore

    private func writeTimeEntry(_ entry: TimeEntry) async {
        do {
            let data = try Firestore.Encoder().encode(entry)
            try await db
                .collection("jobs").document(entry.jobId.uuidString)
                .collection("timeEntries").document(entry.id.uuidString)
                .setData(data)
        } catch {
            print("Failed to write time entry: \(error)")
        }
    }

    func fetchTimeEntries(for jobId: UUID) async {
        do {
            let snapshot = try await db
                .collection("jobs").document(jobId.uuidString)
                .collection("timeEntries")
                .order(by: "clockInTime", descending: true)
                .getDocuments()

            let entries = snapshot.documents.compactMap { doc -> TimeEntry? in
                try? doc.data(as: TimeEntry.self)
            }
            timeEntries = entries
        } catch {
            print("Failed to fetch time entries: \(error)")
        }
    }

    // MARK: - Timer

    private func startTimer() {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            guard let self, let entry = self.activeEntry else { return }
            self.elapsedSeconds = Int(Date().timeIntervalSince(entry.clockInTime))
        }
    }

    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }

    // MARK: - Geofence Monitoring

    private func startGeofenceMonitoring(job: Job, locationManager: LocationManager) {
        geofenceTimer?.invalidate()
        consecutiveOutOfRange = 0
        geofenceTimer = Timer.scheduledTimer(withTimeInterval: geofenceCheckInterval, repeats: true) { [weak self] _ in
            guard let self else { return }
            guard let dist = self.distanceToJob(job, from: locationManager) else { return }

            if dist > self.geofenceRadius {
                self.consecutiveOutOfRange += 1
                if self.consecutiveOutOfRange >= self.consecutiveChecksToAutoStop {
                    Task { @MainActor in
                        guard let lm = self._locationManager, let st = self._store else { return }
                        await self.clockOut(locationManager: lm, store: st, isAutoStopped: true)
                    }
                }
            } else {
                self.consecutiveOutOfRange = 0
            }
        }
    }

    private func stopGeofenceMonitoring() {
        geofenceTimer?.invalidate()
        geofenceTimer = nil
        consecutiveOutOfRange = 0
    }

    // MARK: - Notification

    private func sendAutoStopNotification(entry: TimeEntry, store: JobStore) {
        let jobAddress = store.jobs.first(where: { $0.id == entry.jobId })?.streetAddress ?? "job site"
        let duration = formatDuration(entry.totalSeconds ?? 0)

        let content = UNMutableNotificationContent()
        content.title = "Time Tracking Stopped"
        content.body = "You left \(jobAddress). Time tracked: \(duration)."
        content.sound = .default

        let request = UNNotificationRequest(
            identifier: "autoStop-\(entry.id.uuidString)",
            content: content,
            trigger: nil
        )
        UNUserNotificationCenter.current().add(request)
    }

    // MARK: - Formatting

    static func formatDuration(_ seconds: Int) -> String {
        let h = seconds / 3600
        let m = (seconds % 3600) / 60
        let s = seconds % 60
        return String(format: "%02d:%02d:%02d", h, m, s)
    }

    func formatDuration(_ seconds: Int) -> String {
        Self.formatDuration(seconds)
    }
}
