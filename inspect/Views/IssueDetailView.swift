import SwiftUI

struct IssueDetailView: View {
    let issueId: UUID
    let formId: UUID
    let job: Job
    var store: JobStore

    @Environment(\.dismiss) private var dismiss

    @State private var category: IssueCategory = .other
    @State private var severity: IssueSeverity = .major
    @State private var notes: String = ""
    @State private var hasLoaded = false
    @State private var showSaved = false

    private var liveForm: InspectionForm? {
        store.forms.first { $0.id == formId }
    }

    private var issue: IssuePhoto? {
        liveForm?.issuePhotos.first { $0.id == issueId }
    }

    private var spot: Spot? {
        guard let issue else { return nil }
        return job.spots.first { $0.id == issue.spotId }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                photoSection
                detailsCard
                notesCard
                fixStatusCard
                saveButton
            }
            .padding()
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Issue Detail")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { loadFields() }
        .refreshable { await store.refreshForms(for: job.id) }
    }

    // MARK: - Photo

    private var photoSection: some View {
        Group {
            if let urlString = issue?.photoURL, let url = URL(string: urlString) {
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

    // MARK: - Details Card

    private var detailsCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 5) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.caption)
                    .foregroundStyle(.red)
                Text("Issue Details")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }

            // Spot info
            if let spot {
                HStack(spacing: 8) {
                    Image(systemName: spot.jobType.icon)
                        .font(.caption)
                        .foregroundStyle(.orange)
                    Text(spot.title)
                        .font(.subheadline.weight(.medium))
                    Spacer()
                    Text(spot.jobType.rawValue)
                        .font(.caption2.weight(.medium))
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(.orange.opacity(0.1), in: .capsule)
                        .foregroundStyle(.orange)
                }
            }

            Divider()

            // Category picker
            VStack(alignment: .leading, spacing: 6) {
                Text("CATEGORY")
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(.tertiary)

                Menu {
                    let categories: [IssueCategory] = if let spot {
                        IssueCategory.categories(for: spot.jobType)
                    } else {
                        IssueCategory.allCases.map { $0 }
                    }
                    ForEach(categories) { cat in
                        Button(cat.rawValue) { category = cat }
                    }
                } label: {
                    HStack {
                        Text(category.rawValue)
                            .font(.subheadline)
                        Spacer()
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                    .padding(10)
                    .background(Color(.tertiarySystemFill), in: .rect(cornerRadius: 8))
                }
                .foregroundStyle(.primary)
            }

            // Severity picker
            VStack(alignment: .leading, spacing: 6) {
                Text("SEVERITY")
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(.tertiary)

                HStack(spacing: 8) {
                    ForEach(IssueSeverity.allCases) { sev in
                        Button {
                            severity = sev
                        } label: {
                            Text(sev.rawValue)
                                .font(.caption.weight(.semibold))
                                .frame(maxWidth: .infinity)
                                .frame(height: 34)
                                .foregroundStyle(severity == sev ? .white : sev.color)
                                .background(
                                    severity == sev
                                        ? AnyShapeStyle(sev.color)
                                        : AnyShapeStyle(sev.color.opacity(0.1)),
                                    in: .capsule
                                )
                        }
                    }
                }
            }

            if let issue {
                HStack(spacing: 6) {
                    Image(systemName: "calendar")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                    Text(issue.dateTaken.formatted(date: .abbreviated, time: .shortened))
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }
        }
        .padding(14)
        .background(.background, in: .rect(cornerRadius: 14))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 2)
    }

    // MARK: - Notes Card

    private var notesCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 5) {
                Image(systemName: "text.alignleft")
                    .font(.caption)
                    .foregroundStyle(.orange)
                Text("Notes")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }

            TextField("Add notes about this issue...", text: $notes, axis: .vertical)
                .lineLimit(3...8)
                .font(.subheadline)
                .padding(12)
                .background(Color(.tertiarySystemFill), in: .rect(cornerRadius: 8))
        }
        .padding(14)
        .background(.background, in: .rect(cornerRadius: 14))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 2)
    }

    // MARK: - Fix Status Card

    private var fixStatusCard: some View {
        Group {
            if let issue, let linkedFix = linkedFixPhoto(for: issue.id) {
                let inspectionForm = store.forms.first {
                    $0.formType == .inspection && $0.fixPhotos.contains { $0.id == linkedFix.id }
                }
                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: 5) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.caption)
                            .foregroundStyle(.green)
                        Text("Resolved")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.green)
                    }

                    if !linkedFix.resolutionNotes.isEmpty {
                        Text(linkedFix.resolutionNotes)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }

                    if let inspectionForm {
                        NavigationLink(destination: FormDetailView(form: inspectionForm, job: job, store: store)) {
                            HStack(spacing: 6) {
                                Text("View Inspection")
                                    .font(.caption.weight(.medium))
                                Image(systemName: "chevron.right")
                                    .font(.caption2)
                            }
                            .foregroundStyle(.blue)
                        }
                    }
                }
                .padding(14)
                .background(.background, in: .rect(cornerRadius: 14))
                .shadow(color: .black.opacity(0.04), radius: 6, y: 2)
            } else if let issue {
                NavigationLink(destination: SubmitFixView(job: job, issue: issue, store: store)) {
                    HStack(spacing: 8) {
                        Spacer()
                        Image(systemName: "wrench.and.screwdriver.fill")
                        Text("Fix This Issue")
                        Spacer()
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.green)
                    .frame(height: 44)
                    .background(.green.opacity(0.1), in: .rect(cornerRadius: 14))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .strokeBorder(.green.opacity(0.2), lineWidth: 1)
                    )
                }
            }
        }
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
                showSaved ? .green : .orange,
                in: .capsule
            )
        }
        .disabled(showSaved)
        .padding(.top, 4)
    }

    // MARK: - Helpers

    private func loadFields() {
        guard !hasLoaded, let issue else { return }
        category = issue.category
        severity = issue.severity
        notes = issue.notes
        hasLoaded = true
    }

    private func saveChanges() {
        guard var form = liveForm,
              let index = form.issuePhotos.firstIndex(where: { $0.id == issueId }) else { return }

        form.issuePhotos[index].category = category
        form.issuePhotos[index].severity = severity
        form.issuePhotos[index].notes = notes

        store.updateForm(form, in: job)

        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
            showSaved = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
            showSaved = false
        }
    }

    private func linkedFixPhoto(for issueId: UUID) -> FixPhoto? {
        for form in store.forms where form.formType == .inspection {
            if let fix = form.fixPhotos.first(where: { $0.linkedAuditIssueId == issueId }) {
                return fix
            }
        }
        return nil
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
