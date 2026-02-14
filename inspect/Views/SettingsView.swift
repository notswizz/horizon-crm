import SwiftUI
import UIKit

struct SettingsView: View {
    var store: JobStore
    @AppStorage("inspectorName") private var inspectorName = ""
    @State private var showDeleteConfirm = false
    @State private var isExporting = false
    @State private var exportFileURL: URL?
    @State private var showShareSheet = false
    @State private var estimatedValue: String = "—"
    @State private var isEstimating = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    inspectorCard
                    exportCard
                    dangerZoneCard
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
            .alert("Delete All Jobs?", isPresented: $showDeleteConfirm) {
                Button("Delete Everything", role: .destructive) {
                    store.deleteAllJobs()
                }
                Button("Cancel", role: .cancel) { }
            } message: {
                Text("This will permanently delete all \(store.jobs.count) job\(store.jobs.count == 1 ? "" : "s"), forms, and photos. This cannot be undone.")
            }
            .sheet(isPresented: $showShareSheet) {
                if let url = exportFileURL {
                    ShareSheetView(items: [url])
                }
            }
        }
    }

    // MARK: - Inspector Card

    private var inspectorCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label {
                Text("Inspector / Auditor")
                    .font(.headline)
            } icon: {
                Image(systemName: "person.crop.circle.fill")
                    .foregroundStyle(.orange)
            }

            Text("This name is automatically attached to every form you submit.")
                .font(.caption)
                .foregroundStyle(.secondary)

            StyledTextField(
                icon: "person.fill",
                label: "NAME",
                placeholder: "Your name",
                text: $inspectorName,
                contentType: .name
            )
        }
        .cardStyle()
    }

    // MARK: - Export Card

    private var exportCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label {
                Text("Export Training Data")
                    .font(.headline)
            } icon: {
                Image(systemName: "square.and.arrow.up")
                    .foregroundStyle(.blue)
            }

            Text("Export all jobs and forms as a JSONL file for AI training.")
                .font(.caption)
                .foregroundStyle(.secondary)

            Button {
                Task {
                    isExporting = true
                    let jsonl = await store.exportAllAsJSONL()
                    let datestamp = { let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; return f.string(from: Date()) }()
                    let tempURL = FileManager.default.temporaryDirectory
                        .appendingPathComponent("horizon_training_data_\(datestamp).jsonl")
                    try? jsonl.data(using: .utf8)?.write(to: tempURL)
                    exportFileURL = tempURL
                    isExporting = false
                    showShareSheet = true
                }
            } label: {
                HStack(spacing: 8) {
                    Spacer()
                    if isExporting {
                        ProgressView()
                            .tint(.blue)
                    } else {
                        Image(systemName: "arrow.down.doc.fill")
                    }
                    Text(isExporting ? "Exporting..." : "Export Data")
                    Spacer()
                }
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.blue)
                .frame(height: 44)
                .background(.blue.opacity(0.1), in: .rect(cornerRadius: 10))
            }
            .disabled(isExporting || store.jobs.isEmpty)

            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(store.jobs.count) job\(store.jobs.count == 1 ? "" : "s")")
                        .font(.caption.weight(.medium))
                    Text("\(totalPhotos) photo\(totalPhotos == 1 ? "" : "s") \u{2022} \(totalIssues) issue\(totalIssues == 1 ? "" : "s")")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text("est. value")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    if isEstimating {
                        ProgressView()
                            .controlSize(.small)
                    } else {
                        Text(estimatedValue)
                            .font(.subheadline.weight(.bold).monospacedDigit())
                            .foregroundStyle(.green)
                    }
                }
            }
        }
        .cardStyle()
        .task(id: store.jobs.count) {
            await computeEstimate()
        }
    }

    /// Computes estimated dollar value by fetching actual form data per job.
    ///
    /// Base per job = $5/job + $2/photo + $3/issue
    /// Multipliers:
    ///   ×1.5 if rebate outcome known (approved or declined)
    ///   ×1.3 if >80% of issues have linked fix photos (actual before+after pairs)
    ///   ×1.2 if any materials have cost data
    private func computeEstimate() async {
        guard !store.jobs.isEmpty else {
            estimatedValue = "$0"
            return
        }
        isEstimating = true
        defer { isEstimating = false }

        var total: Double = 0

        for job in store.jobs {
            let base = 5.0 + Double(job.photoCount) * 2 + Double(job.issueCount) * 3

            // Rebate multiplier
            let hasRebateOutcome = job.rebateOutcome == .approved || job.rebateOutcome == .declined
            let rebateMult: Double = hasRebateOutcome ? 1.5 : 1.0

            // Fetch real form data for pair ratio + material cost check
            let forms = await store.fetchForms(for: job.id)

            // Count actual linked fixes
            let allFixPhotos = forms
                .filter { $0.formType == .inspection }
                .flatMap { $0.fixPhotos }
            let linkedFixCount = allFixPhotos.filter { $0.linkedAuditIssueId != nil }.count
            let pairRatio = job.issueCount > 0 ? Double(linkedFixCount) / Double(job.issueCount) : 0
            let pairMult: Double = pairRatio > 0.8 ? 1.3 : 1.0

            // Check if any materials have actual cost data
            let allMaterials = forms.flatMap { $0.allMaterials }
            let hasCostData = allMaterials.contains { $0.cost != nil && $0.cost! > 0 }
            let materialMult: Double = hasCostData ? 1.2 : 1.0

            total += base * rebateMult * pairMult * materialMult
        }

        estimatedValue = total < 1 ? "$0" : "$\(Int(total))"
    }

    private var totalPhotos: Int {
        store.jobs.reduce(0) { $0 + $1.photoCount }
    }

    private var totalIssues: Int {
        store.jobs.reduce(0) { $0 + $1.issueCount }
    }

    // MARK: - Danger Zone

    private var dangerZoneCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label {
                Text("Danger Zone")
                    .font(.headline)
            } icon: {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(.red)
            }

            Button(role: .destructive) {
                showDeleteConfirm = true
            } label: {
                HStack(spacing: 8) {
                    Spacer()
                    Image(systemName: "trash.fill")
                    Text("Delete All Jobs")
                    Spacer()
                }
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.red)
                .frame(height: 44)
                .background(.red.opacity(0.1), in: .rect(cornerRadius: 10))
            }

            Text("Permanently removes all jobs, forms, and uploaded photos from the database.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .cardStyle()
    }
}

// MARK: - Share Sheet

struct ShareSheetView: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
