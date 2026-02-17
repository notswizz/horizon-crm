import Foundation

struct GeoPoint: Codable, Equatable, Sendable {
    let latitude: Double
    let longitude: Double
}

struct TimeEntry: Codable, Identifiable, Equatable, Sendable {
    let id: UUID
    let jobId: UUID
    let workerId: String
    let workerName: String
    let clockInTime: Date
    var clockOutTime: Date?
    let clockInLocation: GeoPoint
    var clockOutLocation: GeoPoint?
    var totalSeconds: Int?
    var isAutoStopped: Bool

    init(
        id: UUID = UUID(),
        jobId: UUID,
        workerId: String,
        workerName: String,
        clockInTime: Date = Date(),
        clockOutTime: Date? = nil,
        clockInLocation: GeoPoint,
        clockOutLocation: GeoPoint? = nil,
        totalSeconds: Int? = nil,
        isAutoStopped: Bool = false
    ) {
        self.id = id
        self.jobId = jobId
        self.workerId = workerId
        self.workerName = workerName
        self.clockInTime = clockInTime
        self.clockOutTime = clockOutTime
        self.clockInLocation = clockInLocation
        self.clockOutLocation = clockOutLocation
        self.totalSeconds = totalSeconds
        self.isAutoStopped = isAutoStopped
    }
}
