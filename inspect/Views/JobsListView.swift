import SwiftUI

struct JobsListView: View {
    var store: JobStore
    var locationManager: LocationManager
    var configStore: ConfigStore
    @State private var searchText = ""
    @State private var selectedStage: JobStage? = nil
    @State private var sortOrder: JobSortOrder = .nearest
    @State private var showFilter = false
    @State private var showError = false

    var body: some View {
        NavigationStack {
            Group {
                if store.isLoading {
                    ProgressView("Loading jobs...")
                } else if store.jobs.isEmpty {
                    emptyState
                } else {
                    jobsList
                }
            }
            .navigationTitle("Jobs")
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
                    Image("Logo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 36, height: 36)
                        .clipShape(.rect(cornerRadius: 8))
                }
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink(destination: NewJobView(store: store)) {
                        Image(systemName: "plus")
                            .font(.body.weight(.semibold))
                    }
                }
            }
            .searchable(text: $searchText, prompt: "Search by address or contact")
            .sheet(isPresented: $showFilter) {
                FilterSheet(selectedStage: $selectedStage, sortOrder: $sortOrder)
                    .presentationDetents([.medium])
                    .presentationDragIndicator(.visible)
            }
            .onChange(of: store.errorMessage) { _, newValue in
                if newValue != nil { showError = true }
            }
            .alert("Firestore Error", isPresented: $showError) {
                Button("OK") { store.errorMessage = nil }
            } message: {
                Text(store.errorMessage ?? "Unknown error")
            }
        }
    }

    private var hasActiveFilters: Bool {
        selectedStage != nil || sortOrder != .nearest
    }

    private var jobsList: some View {
        ScrollView {
            if filteredJobs.isEmpty {
                ContentUnavailableView {
                    Label("No Matches", systemImage: "line.3.horizontal.decrease.circle")
                } description: {
                    Text("No jobs match the current filters.")
                }
                .padding(.top, 40)
            } else {
                LazyVStack(spacing: DS.Spacing.m) {
                    ForEach(filteredJobs) { job in
                        NavigationLink(destination: JobDetailView(job: job, store: store, configStore: configStore)) {
                            JobCard(job: job)
                        }
                        .buttonStyle(DSCardPressStyle())
                    }
                }
                .padding(.horizontal, DS.Spacing.m)
                .padding(.top, DS.Spacing.xs)
                .padding(.bottom, DS.Spacing.xl)
            }
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

    private var emptyState: some View {
        ContentUnavailableView {
            Label("No Jobs", systemImage: "briefcase")
        } description: {
            Text("Create a new job from the New Job tab.")
        }
    }
}

// MARK: - Job Card

private struct JobCard: View {
    let job: Job
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

    var body: some View {
        HStack(spacing: 14) {
            // Property Photo
            AsyncImage(url: job.houseImageURL.flatMap { URL(string: $0) }) { phase in
                if let image = phase.image {
                    image
                        .resizable()
                        .scaledToFill()
                } else {
                    Image(systemName: "house.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(Color(.quaternaryLabel))
                }
            }
            .frame(width: 72, height: 72)
            .background(Color(.tertiarySystemFill))
            .clipShape(.rect(cornerRadius: 14))
            .id(job.houseImageURL)

            // Content
            VStack(alignment: .leading, spacing: 6) {
                // Address
                Text(displayStreet)
                    .font(.system(size: 17, weight: .bold))
                    .foregroundStyle(.primary)
                    .lineLimit(1)

                if let locality = displayLocality {
                    Text(locality)
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                }

                // Metrics + Stage
                HStack(spacing: 14) {
                    HStack(spacing: 4) {
                        Image(systemName: "camera.fill")
                            .font(.system(size: 10))
                            .foregroundStyle(DS.Colors.info)
                        Text("\(job.photoCount)")
                            .font(.system(size: 13, weight: .semibold, design: .rounded))
                            .foregroundStyle(DS.Colors.info)
                    }
                    HStack(spacing: 4) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.system(size: 10))
                            .foregroundStyle(DS.Colors.error)
                        Text("\(job.issueCount)")
                            .font(.system(size: 13, weight: .semibold, design: .rounded))
                            .foregroundStyle(DS.Colors.error)
                    }
                    HStack(spacing: 4) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 10))
                            .foregroundStyle(DS.Colors.success)
                        Text("\(job.fixCount)")
                            .font(.system(size: 13, weight: .semibold, design: .rounded))
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
            }

            // Chevron
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(.quaternary)
        }
        .padding(16)
        .background(DS.Colors.surface, in: .rect(cornerRadius: 18))
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

// MARK: - Filter Sheet

private struct FilterSheet: View {
    @Binding var selectedStage: JobStage?
    @Binding var sortOrder: JobSortOrder
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Button {
                        selectedStage = nil
                    } label: {
                        HStack {
                            Text("All Stages")
                                .foregroundStyle(.primary)
                            Spacer()
                            if selectedStage == nil {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(DS.Colors.primary)
                                    .font(.subheadline.weight(.semibold))
                            }
                        }
                    }
                    ForEach(JobStage.allCases) { stage in
                        Button {
                            selectedStage = stage
                        } label: {
                            HStack(spacing: 10) {
                                Image(systemName: stage.icon)
                                    .foregroundStyle(stage.color)
                                    .frame(width: 24)
                                Text(stage.rawValue)
                                    .foregroundStyle(.primary)
                                Spacer()
                                if selectedStage == stage {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(DS.Colors.primary)
                                        .font(.subheadline.weight(.semibold))
                                }
                            }
                        }
                    }
                } header: {
                    Text("Stage")
                }

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
            .navigationTitle("Filter & Sort")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if selectedStage != nil || sortOrder != .nearest {
                        Button("Reset") {
                            selectedStage = nil
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
