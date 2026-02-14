import SwiftUI

struct JobsListView: View {
    var store: JobStore
    @State private var searchText = ""
    @State private var selectedStage: JobStage? = nil
    @State private var sortOrder: JobSortOrder = .newest
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
        selectedStage != nil || sortOrder != .newest
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
                LazyVStack(spacing: DS.Spacing.s) {
                    ForEach(filteredJobs) { job in
                        NavigationLink(destination: JobDetailView(job: job, store: store)) {
                            JobCard(job: job)
                        }
                        .buttonStyle(DSCardPressStyle())
                    }
                }
                .padding(.horizontal)
                .padding(.top, DS.Spacing.micro)
                .padding(.bottom, DS.Spacing.l)
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

    var body: some View {
        HStack(spacing: 0) {
            // Left accent border
            RoundedRectangle(cornerRadius: 2)
                .fill(job.currentStage.color)
                .frame(width: DS.Components.leftAccentWidth)

            VStack(spacing: 0) {
                // Top section
                HStack(alignment: .top, spacing: DS.Spacing.s) {
                    // Stage icon circle
                    Circle()
                        .fill(job.currentStage.color.opacity(0.12))
                        .frame(width: DS.Components.stageCircle, height: DS.Components.stageCircle)
                        .overlay {
                            Image(systemName: job.currentStage.icon)
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundStyle(job.currentStage.color)
                        }

                    VStack(alignment: .leading, spacing: 3) {
                        Text(job.address.isEmpty ? "Untitled" : job.address)
                            .font(.subheadline.weight(.semibold))
                            .lineLimit(1)
                            .foregroundStyle(.primary)

                        if !job.contactName.isEmpty {
                            Text(job.contactName)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }
                    }

                    Spacer(minLength: DS.Spacing.micro)

                    StageBadge(stage: job.currentStage)
                }
                .padding(.horizontal, 14)
                .padding(.top, 14)
                .padding(.bottom, DS.Spacing.s)

                // Divider
                Rectangle()
                    .fill(Color(.separator).opacity(0.3))
                    .frame(height: 0.5)
                    .padding(.horizontal, 14)

                // Bottom meta row
                HStack(spacing: 0) {
                    HStack(spacing: 10) {
                        if job.photoCount > 0 {
                            MetaChip(icon: "photo", value: "\(job.photoCount)")
                        }
                        if job.issueCount > 0 {
                            MetaChip(icon: "exclamationmark.triangle.fill", value: "\(job.issueCount)", color: DS.Colors.error)
                        }
                        if job.fixCount > 0 {
                            MetaChip(icon: "wrench.and.screwdriver.fill", value: "\(job.fixCount)", color: DS.Colors.success)
                        }
                        if job.spots.count > 0 {
                            MetaChip(icon: "mappin.and.ellipse", value: "\(job.spots.count)")
                        }
                    }

                    Spacer()

                    HStack(spacing: 10) {
                        if job.rebateAmount > 0 {
                            Text("$\(job.rebateAmount, specifier: "%.0f")")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(DS.Colors.success)
                        }

                        Text(job.createdAt.formatted(date: .abbreviated, time: .omitted))
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
            }
        }
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.card)
                .strokeBorder(colorScheme == .dark ? DS.Colors.border : .clear, lineWidth: 1)
        )
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }
}

// MARK: - Sort Order

enum JobSortOrder: String, CaseIterable, Identifiable {
    case newest = "Newest First"
    case oldest = "Oldest First"
    case address = "Address A–Z"
    case issueCount = "Most Issues"

    var id: String { rawValue }

    var icon: String {
        switch self {
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
                    if selectedStage != nil || sortOrder != .newest {
                        Button("Reset") {
                            selectedStage = nil
                            sortOrder = .newest
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
