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
            LazyVStack(spacing: 10) {
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
        HStack(spacing: 0) {
            // Stage color edge
            RoundedRectangle(cornerRadius: 2)
                .fill(job.currentStage.color)
                .frame(width: 4)
                .padding(.vertical, 8)

            VStack(spacing: 10) {
                // Row 1: address + stage
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 2) {
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

                    Spacer(minLength: 8)

                    StageBadge(stage: job.currentStage)
                }

                // Row 2: meta
                HStack(spacing: 0) {
                    HStack(spacing: 8) {
                        if job.photoCount > 0 {
                            MetaChip(icon: "photo", value: "\(job.photoCount)")
                        }
                        if job.issueCount > 0 {
                            MetaChip(icon: "exclamationmark.triangle.fill", value: "\(job.issueCount)", color: .red)
                        }
                        if job.spots.count > 0 {
                            MetaChip(icon: "mappin", value: "\(job.spots.count)")
                        }
                    }

                    Spacer()

                    HStack(spacing: 8) {
                        if job.rebateAmount > 0 {
                            Text("$\(job.rebateAmount, specifier: "%.0f")")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(.green)
                        }

                        Text(job.createdAt.formatted(date: .abbreviated, time: .omitted))
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 12)
        }
        .background(.background, in: .rect(cornerRadius: 12))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 2)
    }
}

// MARK: - Meta Chip

private struct MetaChip: View {
    let icon: String
    let value: String
    var color: Color = .secondary

    var body: some View {
        HStack(spacing: 3) {
            Image(systemName: icon)
                .font(.system(size: 9))
            Text(value)
                .font(.caption2.weight(.medium))
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
