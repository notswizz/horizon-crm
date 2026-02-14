import SwiftUI

struct IssueDetailView: View {
    let issueId: UUID
    let formId: UUID
    let spotId: UUID
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
        liveForm?.spots.first { $0.id == spotId }?.issuePhotos.first { $0.id == issueId }
    }

    private var spot: Spot? {
        job.spots.first { $0.id == spotId }
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
                    .foregroundStyle(DS.Colors.error)
                Text("Issue Details")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }

            // Spot info
            if let spot {
                HStack(spacing: 8) {
                    Image(systemName: spot.jobType.icon)
                        .font(.caption)
                        .foregroundStyle(DS.Colors.primary)
                    Text(spot.title)
                        .font(.subheadline.weight(.medium))
                    Spacer()
                    Text(spot.jobType.rawValue)
                        .font(.caption2.weight(.medium))
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(DS.Colors.primary.opacity(0.1), in: .capsule)
                        .foregroundStyle(DS.Colors.primary)
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
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }

    // MARK: - Notes Card

    private var notesCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 5) {
                Image(systemName: "text.alignleft")
                    .font(.caption)
                    .foregroundStyle(DS.Colors.primary)
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
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }

    // MARK: - Fix Status Card

    private var fixStatusCard: some View {
        Group {
            if let issue, let linkedFix = linkedFixPhoto(for: issue.id) {
                let inspectionForm = store.forms.first {
                    $0.formType == .inspection && $0.spots.flatMap(\.fixPhotos).contains { $0.id == linkedFix.id }
                }
                VStack(alignment: .leading, spacing: 10) {
                    HStack(spacing: 5) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.caption)
                            .foregroundStyle(DS.Colors.success)
                        Text("Resolved")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(DS.Colors.success)
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
                            .foregroundStyle(DS.Colors.info)
                        }
                    }
                }
                .padding(14)
                .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
                .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
            } else if let issue {
                NavigationLink(destination: SubmitFixView(job: job, issue: issue, spotId: spotId, store: store)) {
                    HStack(spacing: 8) {
                        Spacer()
                        Image(systemName: "wrench.and.screwdriver.fill")
                        Text("Fix This Issue")
                        Spacer()
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(DS.Colors.success)
                    .frame(height: 44)
                    .background(DS.Colors.success.opacity(0.1), in: .rect(cornerRadius: 14))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .strokeBorder(DS.Colors.success.opacity(0.2), lineWidth: 1)
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
                showSaved ? DS.Colors.success : DS.Colors.primary,
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
              let si = form.spots.firstIndex(where: { $0.id == spotId }),
              let pi = form.spots[si].issuePhotos.firstIndex(where: { $0.id == issueId }) else { return }

        form.spots[si].issuePhotos[pi].category = category
        form.spots[si].issuePhotos[pi].severity = severity
        form.spots[si].issuePhotos[pi].notes = notes

        store.updateForm(form, in: job)

        withAnimation(DS.Animation.defaultSpring) {
            showSaved = true
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
            showSaved = false
        }
    }

    private func linkedFixPhoto(for issueId: UUID) -> FixPhoto? {
        for form in store.forms where form.formType == .inspection {
            for spot in form.spots {
                if let fix = spot.fixPhotos.first(where: { $0.linkedAuditIssueId == issueId }) {
                    return fix
                }
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
