import SwiftUI

struct JobsListView: View {
    var store: JobStore
    var locationManager: LocationManager
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
                        NavigationLink(destination: JobDetailView(job: job, store: store)) {
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

    private var progressRatio: CGFloat {
        if job.issueCount == 0 { return job.currentStage == .completed ? 1.0 : 0.0 }
        return min(CGFloat(job.fixCount) / CGFloat(job.issueCount), 1.0)
    }

    private var displayStreet: String {
        if !job.streetAddress.isEmpty { return job.streetAddress }
        if !job.address.isEmpty { return job.address }
        return "Untitled Job"
    }

    private var displayLocality: String? {
        let parts = [job.city, job.state].filter { !$0.isEmpty }
        return parts.isEmpty ? nil : parts.joined(separator: ", ")
    }

    private var hasMetrics: Bool {
        job.photoCount > 0 || job.issueCount > 0 || job.fixCount > 0
    }

    private var progressColor: Color {
        if progressRatio >= 1.0 { return DS.Colors.success }
        if progressRatio >= 0.5 { return job.currentStage.color }
        return DS.Colors.warning
    }

    var body: some View {
        VStack(spacing: 0) {
            // ── Main content ──────────────────────────────
            VStack(alignment: .leading, spacing: DS.Spacing.m) {

                // Row 1: House thumbnail + Address + Rebate
                HStack(alignment: .top, spacing: DS.Spacing.s) {
                    // House thumbnail
                    AsyncImage(url: job.houseImageURL.flatMap { URL(string: $0) }) { phase in
                        if let image = phase.image {
                            image
                                .resizable()
                                .scaledToFill()
                        } else {
                            Image(systemName: "house.fill")
                                .font(.system(size: 18))
                                .foregroundStyle(.tertiary)
                        }
                    }
                    .frame(width: 48, height: 48)
                    .background(Color(.tertiarySystemFill))
                    .clipShape(.circle)
                    .id(job.houseImageURL)

                    VStack(alignment: .leading, spacing: 3) {
                        Text(displayStreet)
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(.primary)
                            .lineLimit(2)

                        if let locality = displayLocality {
                            Text(locality)
                                .font(.system(size: 13))
                                .foregroundStyle(.tertiary)
                        }
                    }

                    Spacer(minLength: DS.Spacing.s)

                    if job.rebateAmount > 0 {
                        VStack(alignment: .trailing, spacing: 1) {
                            Text("$\(Int(job.rebateAmount))")
                                .font(.system(size: 22, weight: .heavy, design: .rounded))
                                .foregroundStyle(DS.Colors.success)
                            Text("REBATE")
                                .font(.system(size: 9, weight: .bold))
                                .tracking(1)
                                .foregroundStyle(DS.Colors.success.opacity(0.6))
                        }
                    }
                }

                // Row 2: Contact + Stage badge
                HStack(spacing: 0) {
                    if !job.contactName.isEmpty {
                        HStack(spacing: 6) {
                            Image(systemName: "person.fill")
                                .font(.system(size: 10))
                                .foregroundStyle(.quaternary)
                            Text(job.contactName)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }
                    }

                    Spacer(minLength: DS.Spacing.xs)

                    // Stage pill
                    HStack(spacing: 5) {
                        Circle()
                            .fill(job.currentStage.color)
                            .frame(width: 7, height: 7)
                        Text(job.currentStage.rawValue)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(job.currentStage.color)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(job.currentStage.color.opacity(0.1), in: .capsule)
                }
            }
            .padding(.horizontal, 22)
            .padding(.top, 22)
            .padding(.bottom, DS.Spacing.m)

            // ── Metrics footer ────────────────────────────
            if hasMetrics {
                // Separator
                Rectangle()
                    .fill(colorScheme == .dark ? Color.white.opacity(0.06) : Color.black.opacity(0.04))
                    .frame(height: 1)

                HStack(spacing: 0) {
                    // Metric chips
                    HStack(spacing: 6) {
                        if job.photoCount > 0 {
                            CompactMetric(icon: "camera.fill", value: "\(job.photoCount)", color: DS.Colors.info)
                        }
                        if job.issueCount > 0 {
                            CompactMetric(icon: "exclamationmark.triangle.fill", value: "\(job.issueCount)", color: DS.Colors.error)
                        }
                        if job.fixCount > 0 {
                            CompactMetric(icon: "checkmark.circle.fill", value: "\(job.fixCount)", color: DS.Colors.success)
                        }
                    }

                    Spacer(minLength: DS.Spacing.xs)

                    Text(job.createdAt.formatted(date: .abbreviated, time: .omitted))
                        .font(.system(size: 11))
                        .foregroundStyle(.quaternary)
                }
                .padding(.horizontal, 22)
                .padding(.vertical, DS.Spacing.s)
            } else {
                // Just date when no metrics
                HStack {
                    Spacer()
                    Text(job.createdAt.formatted(date: .abbreviated, time: .omitted))
                        .font(.system(size: 11))
                        .foregroundStyle(.quaternary)
                }
                .padding(.horizontal, 22)
                .padding(.bottom, DS.Spacing.s)
            }

            // ── Bottom progress bar ──────────────────────
            if job.issueCount > 0 {
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        Rectangle()
                            .fill(progressColor.opacity(0.08))

                        Rectangle()
                            .fill(
                                LinearGradient(
                                    colors: [progressColor, progressColor.opacity(0.7)],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(width: geo.size.width * progressRatio)
                    }
                }
                .frame(height: 3)
            }
        }
        .clipShape(.rect(cornerRadius: 20))
        .background(
            ZStack {
                // Base surface
                RoundedRectangle(cornerRadius: 20)
                    .fill(DS.Colors.surface)

                // Subtle stage glow at top-leading
                RoundedRectangle(cornerRadius: 20)
                    .fill(
                        RadialGradient(
                            colors: [
                                job.currentStage.color.opacity(colorScheme == .dark ? 0.06 : 0.04),
                                .clear
                            ],
                            center: .topLeading,
                            startRadius: 0,
                            endRadius: 180
                        )
                    )
            }
        )
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .strokeBorder(
                    colorScheme == .dark
                        ? DS.Colors.border.opacity(0.8)
                        : Color.black.opacity(0.06),
                    lineWidth: 1
                )
        )
        // Double shadow for realistic depth
        .shadow(color: .black.opacity(0.03), radius: 3, y: 1)
        .shadow(color: .black.opacity(0.08), radius: 16, y: 6)
    }
}

// MARK: - Compact Metric Chip

private struct CompactMetric: View {
    let icon: String
    let value: String
    let color: Color

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(color)
            Text(value)
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundStyle(color)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 5)
        .background(color.opacity(0.1), in: .capsule)
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
