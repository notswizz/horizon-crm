import SwiftUI

struct JobsListView: View {
    var store: JobStore
    var locationManager: LocationManager
    var configStore: ConfigStore
    var networkMonitor: NetworkMonitor
    var syncQueue: PhotoSyncQueue
    var authManager: AuthManager
    var timeTracker: TimeTracker
    var onSettingsTap: () -> Void = {}
    var onCameraTap: () -> Void = {}
    @State private var searchText = ""
    @State private var navPath = NavigationPath()
    @State private var selectedStage: JobStage? = nil
    @State private var sortOrder: JobSortOrder = .nearest
    @State private var showFilter = false
    @State private var showError = false
    @State private var appeared: Set<UUID> = []
    @State private var listVersion = 0

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
        NavigationStack(path: $navPath) {
            VStack(spacing: 0) {
                SyncBanner(networkMonitor: networkMonitor, syncQueue: syncQueue, jobStore: store)

                Group {
                    if store.isLoading {
                        ProgressView("Loading jobs...")
                    } else if store.jobs.isEmpty {
                        emptyState
                    } else {
                        jobsList
                    }
                }
                .frame(maxHeight: .infinity)
            }
            .navigationBarTitleDisplayMode(.inline)
            .navigationDestination(for: UUID.self) { jobId in
                if let job = store.jobs.first(where: { $0.id == jobId }) {
                    JobDetailView(job: job, store: store, configStore: configStore, networkMonitor: networkMonitor, syncQueue: syncQueue, locationManager: locationManager, authManager: authManager, timeTracker: timeTracker)
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        showFilter = true
                    } label: {
                        Image(systemName: hasActiveFilters ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle")
                            .font(.body.weight(.semibold))
                            .foregroundStyle(hasActiveFilters ? DS.Colors.primary : .primary)
                    }
                }
                ToolbarItem(placement: .principal) {
                    Button(action: onSettingsTap) {
                        Image("Logo")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 36, height: 36)
                            .clipShape(.rect(cornerRadius: 8))
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink(destination: NewJobView(store: store)) {
                        Image(systemName: "plus")
                            .font(.body.weight(.semibold))
                    }
                }
            }
            .searchable(text: $searchText, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search by address or contact")
            .sheet(isPresented: $showFilter) {
                FilterSheet(sortOrder: $sortOrder)
                    .presentationDetents([.medium])
                    .presentationDragIndicator(.visible)
            }
            .sensoryFeedback(.selection, trigger: selectedStage)
            .onChange(of: selectedStage) { _, _ in appeared = []; listVersion += 1 }
            .onChange(of: sortOrder) { _, _ in appeared = []; listVersion += 1 }
            .onChange(of: searchText) { _, _ in appeared = []; listVersion += 1 }
            .onChange(of: store.errorMessage) { _, newValue in
                if newValue != nil { showError = true }
            }
            .alert("Firestore Error", isPresented: $showError) {
                Button("OK") { store.errorMessage = nil }
            } message: {
                Text(store.errorMessage ?? "Unknown error")
            }
        }

            // Floating camera button — only on root list
            if navPath.isEmpty {
                Button(action: onCameraTap) {
                    Image(systemName: "camera.fill")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 60, height: 60)
                        .background(DS.Gradients.primaryButton, in: .circle)
                        .shadow(color: DS.Colors.primary.opacity(0.35), radius: 8, y: 4)
                }
                .padding(.trailing, 20)
                .padding(.bottom, 24)
                .transition(.scale.combined(with: .opacity))
            }
        }
        .animation(.easeInOut(duration: 0.2), value: navPath.isEmpty)
    }

    private var hasActiveFilters: Bool {
        selectedStage != nil || sortOrder != .nearest
    }

    // MARK: - Summary Header

    private var summaryHeader: some View {
        VStack(spacing: DS.Spacing.s) {
            // Stage filter chips
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    // "All" chip
                    Button {
                        selectedStage = nil
                    } label: {
                        Text("All")
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 14)
                            .frame(height: 32)
                            .foregroundStyle(selectedStage == nil ? .white : DS.Colors.primary)
                            .background(
                                selectedStage == nil
                                    ? AnyShapeStyle(DS.Colors.primary)
                                    : AnyShapeStyle(DS.Colors.primary.opacity(0.1)),
                                in: .capsule
                            )
                    }

                    ForEach(JobStage.allCases) { stage in
                        Button {
                            selectedStage = selectedStage == stage ? nil : stage
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: stage.icon)
                                    .font(.system(size: 10))
                                Text(stage.shortLabel)
                            }
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 14)
                            .frame(height: 32)
                            .foregroundStyle(selectedStage == stage ? .white : stage.color)
                            .background(
                                selectedStage == stage
                                    ? AnyShapeStyle(stage.color)
                                    : AnyShapeStyle(stage.color.opacity(0.1)),
                                in: .capsule
                            )
                        }
                    }
                }
                .padding(.horizontal, DS.Spacing.m)
            }
        }
        .padding(.top, DS.Spacing.xs)
        .padding(.bottom, DS.Spacing.xs)
    }

    // MARK: - Jobs List

    private var jobsList: some View {
        ScrollView {
            summaryHeader

            if filteredJobs.isEmpty {
                ContentUnavailableView {
                    Label("No Matches", systemImage: "line.3.horizontal.decrease.circle")
                } description: {
                    Text("No jobs match the current filters.")
                }
                .padding(.top, 40)
            } else {
                LazyVStack(spacing: DS.Spacing.m) {
                    ForEach(Array(filteredJobs.enumerated()), id: \.element.id) { index, job in
                        NavigationLink(value: job.id) {
                            JobCard(job: job, isNearby: job.id == nearbyJobId)
                        }
                        .buttonStyle(DSCardPressStyle())
                        .opacity(appeared.contains(job.id) ? 1 : 0)
                        .offset(y: appeared.contains(job.id) ? 0 : 12)
                        .animation(
                            .spring(response: 0.45, dampingFraction: 0.8)
                            .delay(Double(index) * 0.04),
                            value: appeared.contains(job.id)
                        )
                        .onAppear { appeared.insert(job.id) }
                    }
                }
                .id(listVersion)
                .padding(.horizontal, DS.Spacing.m)
                .padding(.top, DS.Spacing.xs)
                .padding(.bottom, DS.Spacing.xl)
            }
        }
        .refreshable {
            await store.refreshJobs()
        }
        .background(DS.Colors.background)
    }

    private var filteredJobs: [Job] {
        var jobs = store.jobs
        if let stage = selectedStage {
            jobs = jobs.filter { $0.currentStage == stage }
        }
        if !searchText.isEmpty {
            jobs = jobs.filter {
                $0.address.localizedCaseInsensitiveContains(searchText) ||
                $0.contactName.localizedCaseInsensitiveContains(searchText) ||
                $0.contactEmail.localizedCaseInsensitiveContains(searchText) ||
                $0.currentStage.rawValue.localizedCaseInsensitiveContains(searchText)
            }
        }
        switch sortOrder {
        case .nearest: return locationManager.sortedByDistance(jobs)
        case .newest: jobs.sort { $0.createdAt > $1.createdAt }
        case .oldest: jobs.sort { $0.createdAt < $1.createdAt }
        case .address: jobs.sort { $0.address.localizedCompare($1.address) == .orderedAscending }
        case .issueCount: jobs.sort { $0.issueCount > $1.issueCount }
        }
        return jobs
    }

    /// ID of the closest job if the worker is within ~1 mile (1609m)
    private var nearbyJobId: UUID? {
        guard locationManager.currentLocation != nil else { return nil }
        var closestId: UUID?
        var closestDist: Double = .greatestFiniteMagnitude
        for job in store.jobs {
            if let d = locationManager.distance(to: job), d < closestDist {
                closestDist = d
                closestId = job.id
            }
        }
        guard closestDist <= 1609 else { return nil }
        return closestId
    }

    private var emptyState: some View {
        ContentUnavailableView {
            Label("No Jobs", systemImage: "briefcase")
        } description: {
            Text("Tap + to create your first job.")
        }
    }
}

// MARK: - Job Card

private struct JobCard: View {
    let job: Job
    var isNearby: Bool = false
    @Environment(\.colorScheme) private var colorScheme

    private var displayStreet: String {
        if !job.streetAddress.isEmpty { return job.streetAddress }
        if !job.address.isEmpty { return job.address }
        return "Untitled Job"
    }

    private var displayLocality: String? {
        let parts = [job.city, job.state].filter { !$0.isEmpty }
        return parts.isEmpty ? nil : parts.joined(separator: ", ")
    }

    private var progress: Double {
        let denominator = max(job.issueCount * 2, 1)
        return min(Double(job.photoCount + job.fixCount) / Double(denominator), 1.0)
    }

    var body: some View {
        let cardContent = HStack(spacing: 0) {
            // Left accent bar
            job.currentStage.color
                .frame(width: DS.Components.leftAccentWidth)

            HStack(spacing: 12) {
                // Property Photo with stage ring
                AsyncImage(url: job.houseImageURL.flatMap { URL(string: $0) }) { phase in
                    if let image = phase.image {
                        image
                            .resizable()
                            .scaledToFill()
                    } else {
                        Image(systemName: "house.fill")
                            .font(.system(size: 18))
                            .foregroundStyle(Color(.quaternaryLabel))
                    }
                }
                .frame(width: 56, height: 56)
                .background(Color(.tertiarySystemFill))
                .clipShape(.rect(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .strokeBorder(job.currentStage.color.opacity(0.2), lineWidth: 2)
                )
                .id(job.houseImageURL)

                // Content
                VStack(alignment: .leading, spacing: 5) {
                    // Address
                    Text(displayStreet)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(.primary)
                        .lineLimit(1)

                    if let locality = displayLocality {
                        Text(locality)
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                    }

                    // Metrics + Stage
                    HStack(spacing: 12) {
                        HStack(spacing: 3) {
                            Image(systemName: "camera.fill")
                                .font(.system(size: 9))
                                .foregroundStyle(DS.Colors.info)
                            Text("\(job.photoCount)")
                                .font(.system(size: 12, weight: .semibold, design: .rounded))
                                .foregroundStyle(DS.Colors.info)
                        }
                        HStack(spacing: 3) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.system(size: 9))
                                .foregroundStyle(DS.Colors.error)
                            Text("\(job.issueCount)")
                                .font(.system(size: 12, weight: .semibold, design: .rounded))
                                .foregroundStyle(DS.Colors.error)
                        }
                        HStack(spacing: 3) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 9))
                                .foregroundStyle(DS.Colors.success)
                            Text("\(job.fixCount)")
                                .font(.system(size: 12, weight: .semibold, design: .rounded))
                                .foregroundStyle(DS.Colors.success)
                        }

                        Spacer()

                        // Stage pill
                        Text(job.currentStage.shortLabel)
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(job.currentStage.color)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(job.currentStage.color.opacity(0.1), in: .capsule)
                    }

                    // Progress bar (only if there are issues)
                    if job.issueCount > 0 {
                        Capsule()
                            .fill(Color(.systemGray5))
                            .frame(height: 3)
                            .overlay(alignment: .leading) {
                                GeometryReader { geo in
                                    Capsule()
                                        .fill(job.currentStage.color)
                                        .frame(width: geo.size.width * progress)
                                }
                            }
                            .clipShape(Capsule())
                    }
                }

                // Chevron
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.quaternary)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 14)
        }
        .background(DS.Colors.surface, in: .rect(cornerRadius: 18))
        .clipShape(.rect(cornerRadius: 18))

        if isNearby {
            TimelineView(.animation) { timeline in
                let angle = timeline.date.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: 3) / 3 * 360
                cardContent
                    .overlay(
                        RoundedRectangle(cornerRadius: 18)
                            .strokeBorder(
                                AngularGradient(
                                    colors: [.red, .orange, .yellow, .green, .cyan, .blue, .purple, .red],
                                    center: .center,
                                    angle: .degrees(angle)
                                ),
                                lineWidth: 2.5
                            )
                    )
                    .shadow(color: .purple.opacity(0.18), radius: 10, y: 2)
                    .shadow(color: .orange.opacity(0.1), radius: 20, y: 4)
            }
        } else {
            cardContent
                .overlay(
                    RoundedRectangle(cornerRadius: 18)
                        .strokeBorder(
                            colorScheme == .dark
                                ? DS.Colors.border.opacity(0.8)
                                : Color.black.opacity(0.05),
                            lineWidth: 1
                        )
                )
                .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
                .shadow(color: .black.opacity(0.06), radius: 12, y: 4)
        }
    }
}

// MARK: - Sort Order

enum JobSortOrder: String, CaseIterable, Identifiable {
    case nearest = "Nearest First"
    case newest = "Newest First"
    case oldest = "Oldest First"
    case address = "Address A–Z"
    case issueCount = "Most Issues"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .nearest: "location.circle"
        case .newest: "arrow.down.circle"
        case .oldest: "arrow.up.circle"
        case .address: "textformat.abc"
        case .issueCount: "exclamationmark.triangle"
        }
    }
}

// MARK: - Filter Sheet (Sort only — stage filtering is now inline chips)

private struct FilterSheet: View {
    @Binding var sortOrder: JobSortOrder
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(JobSortOrder.allCases) { order in
                        Button {
                            sortOrder = order
                        } label: {
                            HStack(spacing: 10) {
                                Image(systemName: order.icon)
                                    .foregroundStyle(.secondary)
                                    .frame(width: 24)
                                Text(order.rawValue)
                                    .foregroundStyle(.primary)
                                Spacer()
                                if sortOrder == order {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(DS.Colors.primary)
                                        .font(.subheadline.weight(.semibold))
                                }
                            }
                        }
                    }
                } header: {
                    Text("Sort By")
                }
            }
            .navigationTitle("Sort")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if sortOrder != .nearest {
                        Button("Reset") {
                            sortOrder = .nearest
                        }
                        .foregroundStyle(DS.Colors.error)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .fontWeight(.semibold)
                }
            }
        }
    }
}
