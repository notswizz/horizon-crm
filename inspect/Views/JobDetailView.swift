import SwiftUI
import PhotosUI

// MARK: - Job Detail View

struct JobDetailView: View {
    let job: Job
    var store: JobStore
    var configStore: ConfigStore
    var networkMonitor: NetworkMonitor
    var syncQueue: PhotoSyncQueue
    var locationManager: LocationManager
    var authManager: AuthManager
    var timeTracker: TimeTracker

    @State private var editedStage: JobStage
    @State private var rebateText: String
    @State private var showRebateAlert = false
    @State private var showNewSpotSheet = false
    @State private var newSpotTitle = ""
    @State private var newSpotJobType = "Insulation"
    @State private var selectedSpotForIssue: Spot?
    @State private var selectedHousePhoto: PhotosPickerItem?
    @State private var isUploadingHouseImage = false
    @State private var notesExpanded = false
    @State private var clockInError: String?
    @State private var showTimeLog = false

    /// Live version from the store's listener, falls back to the passed-in snapshot
    private var liveJob: Job {
        store.jobs.first { $0.id == job.id } ?? job
    }

    init(job: Job, store: JobStore, configStore: ConfigStore, networkMonitor: NetworkMonitor, syncQueue: PhotoSyncQueue, locationManager: LocationManager, authManager: AuthManager, timeTracker: TimeTracker) {
        self.job = job
        self.store = store
        self.configStore = configStore
        self.networkMonitor = networkMonitor
        self.syncQueue = syncQueue
        self.locationManager = locationManager
        self.authManager = authManager
        self.timeTracker = timeTracker
        self._editedStage = State(initialValue: job.currentStage)
        self._rebateText = State(initialValue: job.rebateAmount > 0 ? String(format: "%.0f", job.rebateAmount) : "")
    }

    private var audit: InspectionForm? {
        store.forms.first { $0.formType == .audit }
    }

    private var inspections: [InspectionForm] {
        store.forms.filter { $0.formType == .inspection }
    }

    var body: some View {
        VStack(spacing: 0) {
            SyncBanner(networkMonitor: networkMonitor, syncQueue: syncQueue, jobStore: store)

            ScrollView {
                VStack(spacing: 0) {
                    heroBanner

                    VStack(spacing: DS.Spacing.s) {
                        contactMetricsStrip
                        spotsSection
                        auditSection
                        inspectionsSection
                    }
                    .padding(.horizontal, DS.Spacing.m)
                    .padding(.top, DS.Spacing.s)
                    .padding(.bottom, DS.Spacing.xl)
                }
            }
        }
        .overlay(alignment: .bottomTrailing) {
            floatingClockButton
        }
        .background(DS.Colors.background)
        .navigationTitle(liveJob.streetAddress.isEmpty ? (liveJob.address.isEmpty ? "Job" : liveJob.address) : liveJob.streetAddress)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showTimeLog = true } label: {
                    Image(systemName: "clock.arrow.circlepath")
                }
            }
        }
        .onAppear {
            store.startListeningToForms(for: liveJob.id)
            Task { await timeTracker.fetchTimeEntries(for: liveJob.id) }
        }
        .refreshable { await store.refreshForms(for: liveJob.id) }
        .sheet(isPresented: $showTimeLog) { timeLogSheet }
        .sheet(isPresented: $showNewSpotSheet) { newSpotSheet }
        .sheet(item: $selectedSpotForIssue) { spot in
            NavigationStack {
                AddIssueView(job: liveJob, spot: spot, store: store, configStore: configStore)
            }
        }
        .alert("Rebate Amount", isPresented: $showRebateAlert) {
            TextField("Amount", text: $rebateText)
                .keyboardType(.decimalPad)
            Button("Save") {
                var updated = liveJob
                updated.rebateOutcome = .approved
                updated.rebateAmount = Double(rebateText) ?? 0
                store.updateJob(updated)
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("Enter the approved rebate amount.")
        }
    }

    // MARK: - Time Tracking

    private var isClockedInToThisJob: Bool {
        timeTracker.activeJobId == liveJob.id
    }

    private var isClockedInToOtherJob: Bool {
        timeTracker.isTracking && timeTracker.activeJobId != liveJob.id
    }

    private var distanceToJob: Double? {
        locationManager.distance(to: liveJob)
    }

    private var floatingClockButton: some View {
        VStack(alignment: .trailing, spacing: 8) {
            // Show timer label when clocked in to this job
            if isClockedInToThisJob {
                Text(TimeTracker.formatDuration(timeTracker.elapsedSeconds))
                    .font(.system(size: 13, weight: .bold, design: .monospaced))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(DS.Colors.success.gradient, in: .capsule)
                    .shadow(color: .black.opacity(0.15), radius: 6, y: 3)
            }

            // FAB
            Button {
                if isClockedInToThisJob {
                    Task {
                        await timeTracker.clockOut(locationManager: locationManager, store: store)
                    }
                } else if !isClockedInToOtherJob {
                    guard let uid = authManager.uid else { return }
                    let error = timeTracker.clockIn(
                        job: liveJob,
                        workerId: uid,
                        workerName: authManager.displayName,
                        locationManager: locationManager,
                        store: store
                    )
                    clockInError = error
                }
            } label: {
                ZStack {
                    if isClockedInToThisJob {
                        // Clocked in — stop icon, red
                        Image(systemName: "stop.fill")
                            .font(.system(size: 22, weight: .semibold))
                            .foregroundStyle(.white)
                            .frame(width: 56, height: 56)
                            .background(DS.Colors.error.gradient, in: .circle)
                    } else if isClockedInToOtherJob {
                        // Clocked in elsewhere — warning
                        Image(systemName: "clock.badge.exclamationmark")
                            .font(.system(size: 22, weight: .semibold))
                            .foregroundStyle(.white)
                            .frame(width: 56, height: 56)
                            .background(DS.Colors.warning.gradient, in: .circle)
                    } else {
                        // Not clocked in — clock icon, green if in range, gray if not
                        let canClock = timeTracker.canClockIn(job: liveJob, locationManager: locationManager)
                        Image(systemName: "clock")
                            .font(.system(size: 24, weight: .semibold))
                            .foregroundStyle(.white)
                            .frame(width: 56, height: 56)
                            .background(
                                canClock ? AnyShapeStyle(DS.Colors.success.gradient) : AnyShapeStyle(Color.gray.gradient),
                                in: .circle
                            )
                    }
                }
                .shadow(color: .black.opacity(0.2), radius: 8, y: 4)
            }
            .disabled(isClockedInToOtherJob)
        }
        .padding(.trailing, 20)
        .padding(.bottom, 24)
    }

    // MARK: - Time History

    private var timeLogSheet: some View {
        NavigationStack {
            Group {
                if timeTracker.timeEntries.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "clock")
                            .font(.system(size: 36))
                            .foregroundStyle(.tertiary)
                        Text("No time entries yet")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        let totalSecs = timeTracker.timeEntries.compactMap(\.totalSeconds).reduce(0, +)
                        let hours = Double(totalSecs) / 3600.0

                        Section {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(String(format: "%.1f hours", hours))
                                        .font(.system(size: 20, weight: .bold, design: .rounded))
                                    Text("\(timeTracker.timeEntries.count) visit\(timeTracker.timeEntries.count == 1 ? "" : "s")")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                            }
                        }

                        Section {
                            ForEach(timeTracker.timeEntries) { entry in
                                HStack(spacing: 10) {
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(entry.workerName.isEmpty ? "Unknown" : entry.workerName)
                                            .font(.system(size: 14, weight: .semibold))
                                        Text(entry.clockInTime.formatted(date: .abbreviated, time: .shortened))
                                            .font(.system(size: 12))
                                            .foregroundStyle(.secondary)
                                    }

                                    Spacer()

                                    if entry.isAutoStopped {
                                        Text("Auto")
                                            .font(.system(size: 9, weight: .bold))
                                            .foregroundStyle(DS.Colors.warning)
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 2)
                                            .background(DS.Colors.warning.opacity(0.12), in: .capsule)
                                    }

                                    if let secs = entry.totalSeconds {
                                        Text(TimeTracker.formatDuration(secs))
                                            .font(.system(size: 14, weight: .bold, design: .monospaced))
                                            .foregroundStyle(.primary)
                                    } else {
                                        Text("In progress")
                                            .font(.caption)
                                            .foregroundStyle(DS.Colors.success)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Time Log")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { showTimeLog = false }
                        .fontWeight(.semibold)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    // MARK: - Hero Helpers

    private var heroDisplayStreet: String {
        if !liveJob.streetAddress.isEmpty { return liveJob.streetAddress }
        if !liveJob.address.isEmpty { return liveJob.address }
        return "Untitled Job"
    }

    private var heroDisplayLocality: String? {
        let parts = [liveJob.city, liveJob.state].filter { !$0.isEmpty }
        return parts.isEmpty ? nil : parts.joined(separator: ", ")
    }

    // MARK: - Hero Banner

    private var heroBanner: some View {
        PhotosPicker(selection: $selectedHousePhoto, matching: .images) {
            VStack {
                Spacer()

                // Bottom text
                VStack(alignment: .leading, spacing: 6) {
                    // Address
                    Text(heroDisplayStreet)
                        .font(.system(size: 26, weight: .heavy, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                        .shadow(color: .black.opacity(0.4), radius: 6, y: 3)

                    if let locality = heroDisplayLocality {
                        HStack(spacing: 4) {
                            Image(systemName: "location.fill")
                                .font(.system(size: 9, weight: .bold))
                            Text(locality)
                                .font(.system(size: 13, weight: .semibold))
                        }
                        .foregroundStyle(.white.opacity(0.9))
                        .shadow(color: .black.opacity(0.3), radius: 4, y: 2)
                    }

                    // Inline date + photo count
                    HStack(spacing: 10) {
                        HStack(spacing: 4) {
                            Image(systemName: "calendar")
                                .font(.system(size: 9, weight: .semibold))
                            Text(liveJob.createdAt.formatted(date: .abbreviated, time: .omitted))
                        }

                        if liveJob.photoCount > 0 {
                            HStack(spacing: 4) {
                                Image(systemName: "camera.fill")
                                    .font(.system(size: 9, weight: .semibold))
                                Text("\(liveJob.photoCount)")
                            }
                        }
                    }
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.white.opacity(0.7))
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 18)
                .padding(.bottom, 18)
            }
            .frame(height: 220)
            .frame(maxWidth: .infinity)
            .background {
                ZStack {
                    // Image or placeholder
                    if let urlString = liveJob.houseImageURL, let url = URL(string: urlString) {
                        AsyncImage(url: url) { phase in
                            if let image = phase.image {
                                image
                                    .resizable()
                                    .scaledToFill()
                            } else if phase.error != nil {
                                placeholderBackground
                            } else {
                                ZStack {
                                    DS.Colors.primary.opacity(0.3)
                                    ProgressView().tint(.white)
                                }
                            }
                        }
                    } else {
                        placeholderBackground
                    }

                    // Cinematic gradient scrim
                    LinearGradient(
                        stops: [
                            .init(color: .black.opacity(0.15), location: 0),
                            .init(color: .clear, location: 0.25),
                            .init(color: .clear, location: 0.4),
                            .init(color: .black.opacity(0.35), location: 0.6),
                            .init(color: .black.opacity(0.85), location: 1.0),
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                }
            }
            .clipped()
        }
        .buttonStyle(.plain)
        .disabled(isUploadingHouseImage)
        .overlay(alignment: .topTrailing) {
            stageDropdown
                .padding(.top, 14)
                .padding(.trailing, 14)
        }
        .overlay(alignment: .bottomTrailing) {
            if liveJob.rebateOutcome != .pending {
                rebateMenu
                    .padding(.bottom, 18)
                    .padding(.trailing, 14)
            }
        }
        .overlay {
            if isUploadingHouseImage {
                ZStack {
                    Color.black.opacity(0.4)
                    ProgressView().tint(.white)
                }
            }
        }
        .clipShape(UnevenRoundedRectangle(bottomLeadingRadius: 24, bottomTrailingRadius: 24))
        .shadow(color: .black.opacity(0.15), radius: 16, y: 8)
        .onChange(of: selectedHousePhoto) { _, newItem in
            guard let newItem else { return }
            isUploadingHouseImage = true
            Task {
                defer { isUploadingHouseImage = false; selectedHousePhoto = nil }
                guard let data = try? await newItem.loadTransferable(type: Data.self) else { return }
                guard let urlString = try? await store.uploadHouseImage(imageData: data, jobId: liveJob.id) else { return }
                var updated = liveJob
                updated.houseImageURL = urlString
                store.updateJob(updated)
            }
        }
    }

    private var placeholderBackground: some View {
        ZStack {
            LinearGradient(
                stops: [
                    .init(color: DS.Colors.primaryDark, location: 0),
                    .init(color: DS.Colors.primary, location: 0.45),
                    .init(color: DS.Colors.primaryDark.opacity(0.95), location: 1),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            VStack(spacing: 6) {
                Image(systemName: "camera.fill")
                    .font(.system(size: 28, weight: .light))
                Text("Tap to add photo")
                    .font(.system(size: 13, weight: .medium))
            }
            .foregroundStyle(.white.opacity(0.45))
        }
    }

    private var stageDropdown: some View {
        Menu {
            ForEach(JobStage.allCases) { stage in
                Button {
                    editedStage = stage
                    var updated = liveJob
                    updated.currentStage = stage
                    store.updateJob(updated)
                } label: {
                    Label(stage.rawValue, systemImage: stage.icon)
                }
            }
        } label: {
            HStack(spacing: 5) {
                Image(systemName: liveJob.currentStage.icon)
                    .font(.system(size: 9, weight: .bold))
                Text(liveJob.currentStage.rawValue)
                    .font(.system(size: 11, weight: .bold))
                    .tracking(0.3)
                Image(systemName: "chevron.up.chevron.down")
                    .font(.system(size: 7, weight: .bold))
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(.ultraThinMaterial, in: .capsule)
        }
    }

    // MARK: - Contact + Metrics Strip

    private var contactMetricsStrip: some View {
        VStack(spacing: 0) {
            // Contact row
            if !liveJob.contactName.isEmpty || !liveJob.contactPhone.isEmpty || !liveJob.contactEmail.isEmpty {
                HStack(spacing: 10) {
                    // Initials avatar
                    Text(String(liveJob.contactName.prefix(1)).uppercased())
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 32, height: 32)
                        .background(DS.Colors.primary.gradient, in: .circle)

                    VStack(alignment: .leading, spacing: 1) {
                        if !liveJob.contactName.isEmpty {
                            Text(liveJob.contactName)
                                .font(.system(size: 14, weight: .semibold))
                                .lineLimit(1)
                        }
                    }

                    Spacer()

                    HStack(spacing: 8) {
                        if !liveJob.contactPhone.isEmpty,
                           let url = URL(string: "tel:\(liveJob.contactPhone.filter { $0.isNumber })") {
                            Link(destination: url) {
                                Image(systemName: "phone.fill")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(DS.Colors.info)
                                    .frame(width: 34, height: 34)
                                    .background(DS.Colors.info.opacity(0.1), in: .circle)
                            }
                        }

                        if !liveJob.contactEmail.isEmpty,
                           let url = URL(string: "mailto:\(liveJob.contactEmail)") {
                            Link(destination: url) {
                                Image(systemName: "envelope.fill")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(DS.Colors.info)
                                    .frame(width: 34, height: 34)
                                    .background(DS.Colors.info.opacity(0.1), in: .circle)
                            }
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }

            // Metrics row
            HStack(spacing: 0) {
                metricPill(value: liveJob.spots.count, label: "Spots", color: DS.Colors.primary)
                metricPill(value: liveJob.photoCount, label: "Photos", color: DS.Colors.info)
                metricPill(value: liveJob.issueCount, label: "Issues", color: DS.Colors.error)
                metricPill(value: liveJob.fixCount, label: "Fixes", color: DS.Colors.success)
            }
            .padding(.horizontal, 12)
            .padding(.bottom, 12)
            .padding(.top, (liveJob.contactName.isEmpty && liveJob.contactPhone.isEmpty && liveJob.contactEmail.isEmpty) ? 12 : 0)

            // Notes expandable
            if !liveJob.notes.isEmpty {
                Divider().padding(.horizontal, 16)

                Button {
                    withAnimation(.easeInOut(duration: 0.25)) {
                        notesExpanded.toggle()
                    }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "note.text")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(.tertiary)
                        Text(notesExpanded ? liveJob.notes : liveJob.notes)
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                            .lineLimit(notesExpanded ? nil : 1)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Image(systemName: "chevron.right")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(.quaternary)
                            .rotationEffect(.degrees(notesExpanded ? 90 : 0))
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                }
                .buttonStyle(.plain)
            }
        }
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }

    private func metricPill(value: Int, label: String, color: Color) -> some View {
        VStack(spacing: 2) {
            Text("\(value)")
                .font(.system(size: 18, weight: .bold, design: .rounded))
                .foregroundStyle(value > 0 ? color : Color(.quaternaryLabel))
            Text(label)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Rebate Menu

    private var rebateMenu: some View {
        Menu {
            ForEach(RebateOutcome.allCases) { outcome in
                Button {
                    if outcome == .approved {
                        showRebateAlert = true
                    } else {
                        var updated = liveJob
                        updated.rebateOutcome = outcome
                        updated.rebateAmount = 0
                        rebateText = ""
                        if outcome == .declined {
                            updated.currentStage = .cancelled
                            editedStage = .cancelled
                        }
                        store.updateJob(updated)
                    }
                } label: {
                    if outcome == liveJob.rebateOutcome {
                        Label(outcome.rawValue, systemImage: "checkmark")
                    } else {
                        Text(outcome.rawValue)
                    }
                }
            }
        } label: {
            HStack(spacing: 4) {
                if liveJob.rebateOutcome == .approved && liveJob.rebateAmount > 0 {
                    Text("$\(Int(liveJob.rebateAmount))")
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                } else {
                    Text(liveJob.rebateOutcome.rawValue)
                        .font(.system(size: 11, weight: .bold))
                }
                Image(systemName: "chevron.up.chevron.down")
                    .font(.system(size: 8, weight: .bold))
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(.ultraThinMaterial, in: .capsule)
            .overlay(
                Capsule().strokeBorder(
                    liveJob.rebateOutcome == .approved ? DS.Colors.success : DS.Colors.error,
                    lineWidth: 1.5
                )
            )
        }
    }

    // MARK: - Stage Pipeline

    // MARK: - Spots Section

    private var spotsSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack(alignment: .center) {
                Text("Spots")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
                    .tracking(0.8)

                if !liveJob.spots.isEmpty {
                    Text("\(liveJob.spots.count)")
                        .font(.system(size: 11, weight: .heavy, design: .rounded))
                        .foregroundStyle(DS.Colors.primary)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 2)
                        .background(DS.Colors.primary.opacity(0.1), in: .capsule)
                }

                Spacer()

                Button {
                    showNewSpotSheet = true
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 22))
                        .foregroundStyle(DS.Colors.primary)
                        .symbolRenderingMode(.hierarchical)
                }
            }
            .padding(.horizontal, 18)
            .padding(.top, 16)
            .padding(.bottom, 12)

            // Content
            if liveJob.spots.isEmpty {
                Button { showNewSpotSheet = true } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "plus.circle")
                            .font(.system(size: 24, weight: .light))
                            .foregroundStyle(DS.Colors.primary.opacity(0.5))

                        VStack(alignment: .leading, spacing: 2) {
                            Text("Add your first spot")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(.primary)
                            Text("e.g. Kitchen Window, Attic Hatch")
                                .font(.system(size: 12))
                                .foregroundStyle(.tertiary)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(14)
                    .background(DS.Colors.primary.opacity(0.03), in: .rect(cornerRadius: 12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .strokeBorder(DS.Colors.primary.opacity(0.1), style: StrokeStyle(lineWidth: 1, dash: [6, 4]))
                    )
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 18)
                .padding(.bottom, 16)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(liveJob.spots) { spot in
                            Button {
                                selectedSpotForIssue = spot
                            } label: {
                                VStack(spacing: 0) {
                                    // Icon area with gradient
                                    Image(systemName: JobType.icon(for: spot.jobType))
                                        .font(.system(size: 20, weight: .medium))
                                        .foregroundStyle(.white)
                                        .frame(width: 56, height: 52)
                                        .frame(maxWidth: .infinity)
                                        .background(
                                            LinearGradient(
                                                colors: [DS.Colors.primary, DS.Colors.primary.opacity(0.75)],
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )

                                    // Text area
                                    VStack(spacing: 2) {
                                        Text(spot.title.isEmpty ? "Untitled" : spot.title)
                                            .font(.system(size: 13, weight: .semibold))
                                            .foregroundStyle(.primary)
                                            .lineLimit(1)
                                        Text(spot.jobType)
                                            .font(.system(size: 10, weight: .medium))
                                            .foregroundStyle(.secondary)
                                            .lineLimit(1)
                                    }
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 8)
                                }
                                .frame(width: 100)
                                .background(DS.Colors.surface, in: .rect(cornerRadius: 14))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14)
                                        .strokeBorder(Color(.systemGray5), lineWidth: 1)
                                )
                                .shadow(color: .black.opacity(0.06), radius: 6, y: 3)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 18)
                }
                .padding(.bottom, 16)
            }
        }
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }

    // MARK: - Audit Section

    private var auditSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack(alignment: .center) {
                Text("Audit")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
                    .tracking(0.8)

                Spacer()

                if let audit, audit.issuePhotos.count > 0 {
                    // Severity breakdown dots
                    let crits = audit.issuePhotos.filter { $0.severity == .critical }.count
                    let majors = audit.issuePhotos.filter { $0.severity == .major }.count
                    let minors = audit.issuePhotos.filter { $0.severity == .minor }.count

                    HStack(spacing: 6) {
                        if crits > 0 {
                            HStack(spacing: 3) {
                                Circle().fill(DS.Colors.error).frame(width: 7, height: 7)
                                Text("\(crits)")
                                    .font(.system(size: 11, weight: .bold, design: .rounded))
                                    .foregroundStyle(DS.Colors.error)
                            }
                        }
                        if majors > 0 {
                            HStack(spacing: 3) {
                                Circle().fill(DS.Colors.warning).frame(width: 7, height: 7)
                                Text("\(majors)")
                                    .font(.system(size: 11, weight: .bold, design: .rounded))
                                    .foregroundStyle(DS.Colors.warning)
                            }
                        }
                        if minors > 0 {
                            HStack(spacing: 3) {
                                Circle().fill(Color(.systemGray3)).frame(width: 7, height: 7)
                                Text("\(minors)")
                                    .font(.system(size: 11, weight: .bold, design: .rounded))
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color(.secondarySystemGroupedBackground), in: .capsule)
                }
            }
            .padding(.horizontal, 18)
            .padding(.top, 16)
            .padding(.bottom, 12)

            // Content
            if let audit {
                NavigationLink(destination: FormDetailView(form: audit, job: liveJob, store: store, configStore: configStore, syncQueue: syncQueue)) {
                    VStack(spacing: 12) {
                        // Inspector row
                        HStack(spacing: 10) {
                            // Initials avatar
                            Text(String(audit.inspectorName.prefix(1)).uppercased())
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(.white)
                                .frame(width: 34, height: 34)
                                .background(DS.Colors.info.gradient, in: .circle)

                            VStack(alignment: .leading, spacing: 1) {
                                Text(audit.inspectorName.isEmpty ? "Unknown Inspector" : audit.inspectorName)
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(.primary)

                                Text(audit.date.formatted(date: .abbreviated, time: .omitted))
                                    .font(.system(size: 12))
                                    .foregroundStyle(.tertiary)
                            }

                            Spacer()

                            Image(systemName: "chevron.right")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(.quaternary)
                        }

                        // Photo thumbnails strip
                        if !audit.issuePhotos.isEmpty {
                            let photos = Array(audit.issuePhotos.prefix(5))
                            let remaining = audit.issuePhotos.count - photos.count

                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 6) {
                                    ForEach(photos) { photo in
                                        ZStack(alignment: .topTrailing) {
                                            if let urlStr = photo.photoURL, let url = URL(string: urlStr) {
                                                AsyncImage(url: url) { phase in
                                                    if let img = phase.image {
                                                        img.resizable().scaledToFill()
                                                    } else {
                                                        Color(.systemGray5)
                                                    }
                                                }
                                            } else {
                                                Color(.systemGray5)
                                                    .overlay(
                                                        Image(systemName: "camera")
                                                            .font(.system(size: 12))
                                                            .foregroundStyle(.tertiary)
                                                    )
                                            }
                                        }
                                        .frame(width: 56, height: 56)
                                        .clipShape(.rect(cornerRadius: 10))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 10)
                                                .strokeBorder(photo.severity.color.opacity(0.5), lineWidth: 2)
                                        )
                                    }

                                    if remaining > 0 {
                                        Text("+\(remaining)")
                                            .font(.system(size: 13, weight: .bold, design: .rounded))
                                            .foregroundStyle(.secondary)
                                            .frame(width: 56, height: 56)
                                            .background(Color(.systemGray6), in: .rect(cornerRadius: 10))
                                    }
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 18)
                    .padding(.bottom, 16)
                }
                .buttonStyle(.plain)
            } else {
                HStack(spacing: 10) {
                    Image(systemName: "plus.circle")
                        .font(.system(size: 14))
                        .foregroundStyle(.tertiary)
                    Text("Tap a spot to add an issue")
                        .font(.system(size: 14))
                        .foregroundStyle(.tertiary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 18)
                .padding(.bottom, 18)
            }
        }
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }

    // MARK: - Inspections Section

    private var inspectionsSection: some View {
        let totalIssues = audit?.issuePhotos.count ?? 0
        let totalFixes = inspections.flatMap(\.fixPhotos).count
        let fixRatio = totalIssues > 0 ? Double(totalFixes) / Double(totalIssues) : 0

        return VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack(alignment: .center) {
                Text("Inspections")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
                    .tracking(0.8)

                Spacer()

                // Fix progress pill
                if totalIssues > 0 {
                    HStack(spacing: 6) {
                        // Mini progress ring
                        ZStack {
                            Circle()
                                .stroke(Color(.systemGray5), lineWidth: 2.5)
                            Circle()
                                .trim(from: 0, to: fixRatio)
                                .stroke(
                                    fixRatio >= 1.0 ? DS.Colors.success : DS.Colors.warning,
                                    style: StrokeStyle(lineWidth: 2.5, lineCap: .round)
                                )
                                .rotationEffect(.degrees(-90))
                            if fixRatio >= 1.0 {
                                Image(systemName: "checkmark")
                                    .font(.system(size: 6, weight: .black))
                                    .foregroundStyle(DS.Colors.success)
                            }
                        }
                        .frame(width: 16, height: 16)

                        Text("\(totalFixes)/\(totalIssues) fixed")
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                            .foregroundStyle(fixRatio >= 1.0 ? DS.Colors.success : .secondary)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(Color(.secondarySystemGroupedBackground), in: .capsule)
                }
            }
            .padding(.horizontal, 18)
            .padding(.top, 16)
            .padding(.bottom, 12)

            // Content
            if inspections.isEmpty {
                HStack(spacing: 10) {
                    Image(systemName: "checkmark.shield")
                        .font(.system(size: 14))
                        .foregroundStyle(.tertiary)
                    Text("No inspections yet")
                        .font(.system(size: 14))
                        .foregroundStyle(.tertiary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 18)
                .padding(.bottom, 18)
            } else {
                VStack(spacing: 10) {
                    ForEach(inspections) { inspection in
                        NavigationLink(destination: FormDetailView(form: inspection, job: liveJob, store: store, configStore: configStore, syncQueue: syncQueue)) {
                            VStack(spacing: 10) {
                                // Inspector row
                                HStack(spacing: 10) {
                                    Text(String(inspection.inspectorName.prefix(1)).uppercased())
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundStyle(.white)
                                        .frame(width: 34, height: 34)
                                        .background(DS.Colors.success.gradient, in: .circle)

                                    VStack(alignment: .leading, spacing: 1) {
                                        Text(inspection.inspectorName.isEmpty ? "Unknown Inspector" : inspection.inspectorName)
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundStyle(.primary)

                                        HStack(spacing: 8) {
                                            Text(inspection.date.formatted(date: .abbreviated, time: .omitted))
                                                .font(.system(size: 12))
                                                .foregroundStyle(.tertiary)

                                            if inspection.fixPhotos.count > 0 {
                                                HStack(spacing: 3) {
                                                    Image(systemName: "wrench.fill")
                                                        .font(.system(size: 9))
                                                    Text("\(inspection.fixPhotos.count)")
                                                        .font(.system(size: 11, weight: .semibold))
                                                }
                                                .foregroundStyle(DS.Colors.success)
                                            }
                                        }
                                    }

                                    Spacer()

                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundStyle(.quaternary)
                                }

                                // Fix photo thumbnails
                                if !inspection.fixPhotos.isEmpty {
                                    let photos = Array(inspection.fixPhotos.prefix(5))
                                    let remaining = inspection.fixPhotos.count - photos.count

                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack(spacing: 6) {
                                            ForEach(photos) { photo in
                                                if let urlStr = photo.photoURL, let url = URL(string: urlStr) {
                                                    AsyncImage(url: url) { phase in
                                                        if let img = phase.image {
                                                            img.resizable().scaledToFill()
                                                        } else {
                                                            Color(.systemGray5)
                                                        }
                                                    }
                                                    .frame(width: 56, height: 56)
                                                    .clipShape(.rect(cornerRadius: 10))
                                                    .overlay(
                                                        RoundedRectangle(cornerRadius: 10)
                                                            .strokeBorder(DS.Colors.success.opacity(0.4), lineWidth: 2)
                                                    )
                                                } else {
                                                    Color(.systemGray5)
                                                        .overlay(
                                                            Image(systemName: "wrench.fill")
                                                                .font(.system(size: 12))
                                                                .foregroundStyle(.tertiary)
                                                        )
                                                        .frame(width: 56, height: 56)
                                                        .clipShape(.rect(cornerRadius: 10))
                                                }
                                            }

                                            if remaining > 0 {
                                                Text("+\(remaining)")
                                                    .font(.system(size: 13, weight: .bold, design: .rounded))
                                                    .foregroundStyle(.secondary)
                                                    .frame(width: 56, height: 56)
                                                    .background(Color(.systemGray6), in: .rect(cornerRadius: 10))
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        .buttonStyle(.plain)

                        if inspection.id != inspections.last?.id {
                            Divider().padding(.leading, 52)
                        }
                    }
                }
                .padding(.horizontal, 18)
                .padding(.bottom, 16)
            }
        }
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }



    // MARK: - New Spot Sheet

    private var newSpotSheet: some View {
        NavigationStack {
            VStack(spacing: 16) {
                // Title field
                HStack(spacing: 10) {
                    Image(systemName: "mappin.circle.fill")
                        .font(.system(size: 18))
                        .foregroundStyle(DS.Colors.primary)

                    TextField("Spot title (e.g. Kitchen Window)", text: $newSpotTitle)
                        .font(.system(size: 16, weight: .medium))
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .strokeBorder(
                            newSpotTitle.isEmpty ? Color(.systemGray4) : DS.Colors.primary.opacity(0.4),
                            lineWidth: 1
                        )
                )

                // Job type picker
                VStack(alignment: .leading, spacing: 8) {
                    Text("JOB TYPE")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(.secondary)
                        .tracking(0.5)

                    ScrollView(.vertical, showsIndicators: false) {
                        FlowLayout(spacing: 8) {
                            ForEach(configStore.jobTypes, id: \.self) { type in
                                let selected = newSpotJobType == type
                                Button {
                                    newSpotJobType = type
                                } label: {
                                    HStack(spacing: 5) {
                                        Image(systemName: JobType.icon(for: type))
                                            .font(.system(size: 11, weight: .semibold))
                                        Text(type)
                                            .font(.system(size: 13, weight: .medium))
                                    }
                                    .padding(.horizontal, 12)
                                    .frame(height: 34)
                                    .foregroundStyle(selected ? .white : .primary)
                                    .background(
                                        selected
                                            ? AnyShapeStyle(DS.Colors.primary.gradient)
                                            : AnyShapeStyle(Color(.secondarySystemGroupedBackground)),
                                        in: .capsule
                                    )
                                    .overlay(
                                        Capsule()
                                            .strokeBorder(
                                                selected ? .clear : Color(.systemGray4),
                                                lineWidth: 1
                                            )
                                    )
                                }
                                .sensoryFeedback(.selection, trigger: selected)
                            }
                        }
                    }
                    .frame(maxHeight: 120)
                }

                // Add button
                Button {
                    let spot = Spot(title: newSpotTitle, jobType: newSpotJobType)
                    store.addSpot(spot, to: liveJob)
                    showNewSpotSheet = false
                    newSpotTitle = ""
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 15, weight: .semibold))
                        Text("Add Spot")
                            .font(.system(size: 15, weight: .bold))
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .background(
                        newSpotTitle.trimmingCharacters(in: .whitespaces).isEmpty
                            ? AnyShapeStyle(Color(.systemGray3))
                            : AnyShapeStyle(DS.Colors.primary.gradient),
                        in: .rect(cornerRadius: 14)
                    )
                }
                .disabled(newSpotTitle.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .padding(.horizontal, 18)
            .padding(.top, 8)
            .padding(.bottom, 6)
            .navigationTitle("New Spot")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showNewSpotSheet = false
                        newSpotTitle = ""
                    }
                }
            }
        }
        .presentationDetents([.height(320)])
        .presentationCornerRadius(24)
    }

    // MARK: - Helpers

    private var rebateOutcomeColor: Color {
        switch liveJob.rebateOutcome {
        case .pending: DS.Colors.primary
        case .approved: DS.Colors.success
        case .declined: DS.Colors.error
        }
    }


    // MARK: - Share

    private var shareText: String {
        var text = """
        Job Report
        ========================
        Address: \(liveJob.address)
        Contact: \(liveJob.contactName)
        Phone: \(liveJob.contactPhone)
        Email: \(liveJob.contactEmail)
        Stage: \(liveJob.currentStage.rawValue)
        Rebate: $\(String(format: "%.0f", liveJob.rebateAmount)) (\(liveJob.rebateOutcome.rawValue))
        Created: \(liveJob.createdAt.formatted(date: .long, time: .shortened))
        """

        if !liveJob.notes.isEmpty {
            text += "\nNotes: \(liveJob.notes)"
        }

        if !liveJob.spots.isEmpty {
            text += "\n\n--- SPOTS ---"
            for spot in liveJob.spots {
                text += "\n  - \(spot.title) (\(spot.jobType))"
            }
        }

        if !store.allMaterials.isEmpty {
            text += "\n\n--- ALL MATERIALS ---"
            for mat in store.allMaterials {
                let costStr = mat.cost.map { " — $\(String(format: "%.2f", $0))" } ?? ""
                text += "\n  - \(mat.name) (\(mat.type)) — \(mat.quantity)\(costStr)"
            }
        }

        if let audit {
            text += "\n\n--- AUDIT ---"
            text += formShareText(audit)
        }

        for (i, inspection) in inspections.enumerated() {
            text += "\n\n--- INSPECTION \(i + 1) ---"
            text += formShareText(inspection)
        }

        return text
    }

    private func formShareText(_ form: InspectionForm) -> String {
        var text = "\nInspector: \(form.inspectorName)"
        text += "\nDate: \(form.date.formatted(date: .long, time: .shortened))"

        if !form.notes.isEmpty {
            text += "\nNotes: \(form.notes)"
        }

        if !form.allMaterials.isEmpty {
            text += "\nMaterials:"
            for mat in form.allMaterials {
                let costStr = mat.cost.map { " — $\(String(format: "%.2f", $0))" } ?? ""
                text += "\n  - \(mat.name) (\(mat.type)) — \(mat.quantity)\(costStr)"
            }
        }

        if form.formType == .audit {
            for spot in form.spots where !spot.issuePhotos.isEmpty {
                text += "\n\n  Spot: \(spot.title.isEmpty ? "Unknown" : spot.title) (\(spot.jobType))"
                for photo in spot.issuePhotos {
                    text += "\n    Issue: \(photo.category) (\(photo.severity.rawValue))"
                    if !photo.notes.isEmpty {
                        text += "\n    Notes: \(photo.notes)"
                    }
                }
            }
        } else {
            for spot in form.spots where !spot.fixPhotos.isEmpty {
                text += "\n\n  Spot: \(spot.title.isEmpty ? "Unknown" : spot.title) (\(spot.jobType))"
                for photo in spot.fixPhotos {
                    if let linkedId = photo.linkedAuditIssueId,
                       let issue = store.auditIssuePhotos.first(where: { $0.id == linkedId }) {
                        text += "\n    Fixes: \(issue.category) (\(issue.severity.rawValue))"
                    }
                    if !photo.resolutionNotes.isEmpty {
                        text += "\n    Resolution: \(photo.resolutionNotes)"
                    }
                }
            }
        }

        return text
    }
}

