import SwiftUI

struct FixDetailView: View {
    let fixId: UUID
    let formId: UUID
    let spotId: UUID
    let job: Job
    var store: JobStore

    @Environment(\.dismiss) private var dismiss

    @State private var resolutionNotes: String = ""
    @State private var hasLoaded = false
    @State private var showSaved = false

    private var liveForm: InspectionForm? {
        store.forms.first { $0.id == formId }
    }

    private var fix: FixPhoto? {
        liveForm?.spots.first { $0.id == spotId }?.fixPhotos.first { $0.id == fixId }
    }

    private var spot: Spot? {
        job.spots.first { $0.id == spotId }
    }

    private var linkedIssue: IssuePhoto? {
        guard let linkedId = fix?.linkedAuditIssueId else { return nil }
        return store.auditIssuePhotos.first { $0.id == linkedId }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                photoSection
                linkedIssueCard
                detailsCard
                notesCard
                saveButton
            }
            .padding()
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Fix Detail")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { loadFields() }
        .refreshable { await store.refreshForms(for: job.id) }
    }

    // MARK: - Photo

    private var photoSection: some View {
        Group {
            if let urlString = fix?.photoURL, let url = URL(string: urlString) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                            .frame(maxWidth: .infinity)
                            .frame(maxHeight: 300)
                            .clipped()
                            .clipShape(.rect(cornerRadius: 14))
                    case .failure:
                        placeholderBox("Failed to load photo")
                    default:
                        ProgressView()
                            .frame(height: 220)
                    }
                }
            } else {
                placeholderBox("No photo")
            }
        }
    }

    // MARK: - Linked Issue Card

    private var linkedIssueCard: some View {
        Group {
            if let issue = linkedIssue {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: 5) {
                        Image(systemName: "link")
                            .font(.caption)
                            .foregroundStyle(DS.Colors.info)
                        Text("Linked Issue")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                    }

                    HStack(spacing: 8) {
                        Image(systemName: issue.severity.icon)
                            .foregroundStyle(issue.severity.color)
                            .font(.subheadline)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(issue.category)
                                .font(.subheadline.weight(.semibold))

                            HStack(spacing: 8) {
                                Text(issue.severity.rawValue)
                                    .font(.caption2.weight(.medium))
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(issue.severity.color.opacity(0.12), in: .capsule)
                                    .foregroundStyle(issue.severity.color)

                                if let spot {
                                    Text(spot.title)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }

                        Spacer()
                    }

                    if !issue.notes.isEmpty {
                        Text(issue.notes)
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                            .lineLimit(3)
                    }
                }
                .padding(14)
                .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
                .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
            }
        }
    }

    // MARK: - Details Card

    private var detailsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 5) {
                Image(systemName: "wrench.and.screwdriver.fill")
                    .font(.caption)
                    .foregroundStyle(DS.Colors.success)
                Text("Fix Details")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }

            // Spot info
            if let spot {
                HStack(spacing: 8) {
                    Image(systemName: JobType.icon(for: spot.jobType))
                        .font(.caption)
                        .foregroundStyle(DS.Colors.success)
                    Text(spot.title)
                        .font(.subheadline.weight(.medium))
                    Spacer()
                    Text(spot.jobType)
                        .font(.caption2.weight(.medium))
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(DS.Colors.success.opacity(0.1), in: .capsule)
                        .foregroundStyle(DS.Colors.success)
                }
            }

            if let fix {
                HStack(spacing: 6) {
                    Image(systemName: "calendar")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                    Text(fix.dateTaken.formatted(date: .abbreviated, time: .shortened))
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }
        }
        .padding(14)
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }

    // MARK: - Notes Card

    private var notesCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 5) {
                Image(systemName: "text.alignleft")
                    .font(.caption)
                    .foregroundStyle(DS.Colors.success)
                Text("Resolution Notes")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }

            TextField("How was this fixed?", text: $resolutionNotes, axis: .vertical)
                .lineLimit(3...8)
                .font(.subheadline)
                .padding(12)
                .background(Color(.tertiarySystemFill), in: .rect(cornerRadius: 8))
        }
        .padding(14)
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }

    // MARK: - Save Button

    private var saveButton: some View {
        Button {
            saveChanges()
        } label: {
            HStack(spacing: 8) {
                Spacer()
                if showSaved {
                    Image(systemName: "checkmark.circle.fill")
                    Text("Saved")
                } else {
                    Image(systemName: "square.and.arrow.down")
                    Text("Save Changes")
                }
                Spacer()
            }
            .font(.headline)
            .foregroundStyle(.white)
            .frame(height: 50)
            .background(
                showSaved ? DS.Colors.success : DS.Colors.success.opacity(0.85),
                in: .capsule
            )
        }
        .disabled(showSaved)
        .padding(.top, 4)
    }

    // MARK: - Helpers

    private func loadFields() {
        guard !hasLoaded, let fix else { return }
        resolutionNotes = fix.resolutionNotes
        hasLoaded = true
    }

    private func saveChanges() {
        guard var form = liveForm,
              let si = form.spots.firstIndex(where: { $0.id == spotId }),
              let pi = form.spots[si].fixPhotos.firstIndex(where: { $0.id == fixId }) else { return }

        form.spots[si].fixPhotos[pi].resolutionNotes = resolutionNotes

        store.updateForm(form, in: job)

        withAnimation(DS.Animation.defaultSpring) {
            showSaved = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
            showSaved = false
        }
    }

    private func placeholderBox(_ text: String) -> some View {
        RoundedRectangle(cornerRadius: 14)
            .fill(Color(.tertiarySystemFill))
            .frame(height: 220)
            .overlay {
                Text(text)
                    .font(.subheadline)
                    .foregroundStyle(.tertiary)
            }
    }
}
