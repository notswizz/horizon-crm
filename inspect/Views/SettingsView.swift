import SwiftUI

struct SettingsView: View {
    var store: JobStore
    @AppStorage("inspectorName") private var inspectorName = ""
    @State private var showDeleteConfirm = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    inspectorCard
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
