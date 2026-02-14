import SwiftUI

struct JobsListView: View {
    var store: JobStore
    @State private var searchText = ""
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
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink(destination: NewJobView(store: store)) {
                        Image(systemName: "plus")
                            .font(.body.weight(.semibold))
                    }
                }
            }
            .searchable(text: $searchText, prompt: "Search by address or contact")
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

    private var jobsList: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                ForEach(filteredJobs) { job in
                    NavigationLink(destination: JobDetailView(job: job, store: store)) {
                        JobCard(job: job)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
            .padding(.top, 4)
            .padding(.bottom, 20)
        }
        .background(Color(.systemGroupedBackground))
    }

    private var filteredJobs: [Job] {
        if searchText.isEmpty { return store.jobs }
        return store.jobs.filter {
            $0.address.localizedCaseInsensitiveContains(searchText) ||
            $0.contactName.localizedCaseInsensitiveContains(searchText) ||
            $0.contactEmail.localizedCaseInsensitiveContains(searchText) ||
            $0.currentStage.rawValue.localizedCaseInsensitiveContains(searchText)
        }
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

    var body: some View {
        VStack(spacing: 0) {
            // Top section
            HStack(alignment: .top, spacing: 12) {
                // Stage icon circle
                Circle()
                    .fill(job.currentStage.color.opacity(0.12))
                    .frame(width: 40, height: 40)
                    .overlay {
                        Image(systemName: job.currentStage.icon)
                            .font(.system(size: 16, weight: .semibold))
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

                Spacer(minLength: 4)

                StageBadge(stage: job.currentStage)
            }
            .padding(.horizontal, 14)
            .padding(.top, 14)
            .padding(.bottom, 12)

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
                        MetaChip(icon: "exclamationmark.triangle.fill", value: "\(job.issueCount)", color: .red)
                    }
                    if job.fixCount > 0 {
                        MetaChip(icon: "wrench.and.screwdriver.fill", value: "\(job.fixCount)", color: .green)
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
                            .foregroundStyle(.green)
                    }

                    Text(job.createdAt.formatted(date: .abbreviated, time: .omitted))
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
        }
        .background(.background, in: .rect(cornerRadius: 14))
        .shadow(color: .black.opacity(0.06), radius: 8, y: 3)
    }
}

// MARK: - Meta Chip

private struct MetaChip: View {
    let icon: String
    let value: String
    var color: Color = .secondary

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 10))
            Text(value)
                .font(.caption2.weight(.semibold))
        }
        .foregroundStyle(color)
    }
}

// MARK: - Stage Badge

struct StageBadge: View {
    let stage: JobStage

    var body: some View {
        Text(stage.rawValue)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(stage.color.opacity(0.12), in: .capsule)
            .foregroundStyle(stage.color)
    }
}
