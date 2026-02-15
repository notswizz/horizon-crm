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

                VStack(spacing: 0) {
                    // ── Green header bar ──
                    HStack(spacing: 8) {
                        ZStack {
                            Circle()
                                .fill(.white.opacity(0.2))
                                .frame(width: 28, height: 28)
                            Image(systemName: "checkmark")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(.white)
                        }

                        Text("Issue Resolved")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundStyle(.white)

                        Spacer()

                        Text(linkedFix.dateTaken.formatted(date: .abbreviated, time: .omitted))
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(.white.opacity(0.7))
                    }
                    .padding(.horizontal, 18)
                    .padding(.vertical, 14)
                    .background(
                        LinearGradient(
                            colors: [DS.Colors.success, DS.Colors.success.opacity(0.85)],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )

                    // ── Before / After photos ──
                    if issue.photoURL != nil || linkedFix.photoURL != nil {
                        HStack(spacing: 0) {
                            // Before
                            VStack(spacing: 6) {
                                fixComparisonPhoto(url: issue.photoURL)
                                Text("BEFORE")
                                    .font(.system(size: 9, weight: .bold))
                                    .tracking(1)
                                    .foregroundStyle(.tertiary)
                            }
                            .frame(maxWidth: .infinity)

                            // Arrow
                            ZStack {
                                Circle()
                                    .fill(DS.Colors.success.opacity(0.1))
                                    .frame(width: 32, height: 32)
                                Image(systemName: "arrow.right")
                                    .font(.system(size: 12, weight: .bold))
                                    .foregroundStyle(DS.Colors.success)
                            }

                            // After
                            VStack(spacing: 6) {
                                fixComparisonPhoto(url: linkedFix.photoURL)
                                Text("AFTER")
                                    .font(.system(size: 9, weight: .bold))
                                    .tracking(1)
                                    .foregroundStyle(.tertiary)
                            }
                            .frame(maxWidth: .infinity)
                        }
                        .padding(.horizontal, 18)
                        .padding(.top, 16)
                        .padding(.bottom, 12)
                    }

                    // ── Resolution notes ──
                    if !linkedFix.resolutionNotes.isEmpty {
                        HStack(alignment: .top, spacing: 10) {
                            Image(systemName: "quote.opening")
                                .font(.system(size: 10))
                                .foregroundStyle(DS.Colors.success.opacity(0.4))
                                .padding(.top, 2)
                            Text(linkedFix.resolutionNotes)
                                .font(.system(size: 14))
                                .foregroundStyle(.secondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .padding(.horizontal, 18)
                        .padding(.vertical, 12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(DS.Colors.success.opacity(0.04))
                    }

                    // ── View Inspection link ──
                    if let inspectionForm {
                        NavigationLink(destination: FormDetailView(form: inspectionForm, job: job, store: store)) {
                            HStack(spacing: 8) {
                                Image(systemName: "doc.text.magnifyingglass")
                                    .font(.system(size: 13, weight: .medium))
                                Text("View Inspection Form")
                                    .font(.system(size: 14, weight: .semibold))
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundStyle(.tertiary)
                            }
                            .foregroundStyle(DS.Colors.success)
                            .padding(.horizontal, 18)
                            .padding(.vertical, 14)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .clipShape(.rect(cornerRadius: DS.Radius.card))
                .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
                .overlay(
                    RoundedRectangle(cornerRadius: DS.Radius.card)
                        .strokeBorder(DS.Colors.success.opacity(0.15), lineWidth: 1)
                )
                .shadow(color: DS.Colors.success.opacity(0.08), radius: 12, y: 4)

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

    private func fixComparisonPhoto(url: String?) -> some View {
        Group {
            if let urlString = url, let imageURL = URL(string: urlString) {
                AsyncImage(url: imageURL) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                            .frame(width: 110, height: 80)
                            .clipped()
                            .clipShape(.rect(cornerRadius: 10))
                    case .failure:
                        photoPlaceholder
                    default:
                        ProgressView()
                            .frame(width: 110, height: 80)
                    }
                }
            } else {
                photoPlaceholder
            }
        }
    }

    private var photoPlaceholder: some View {
        RoundedRectangle(cornerRadius: 10)
            .fill(Color(.tertiarySystemFill))
            .frame(width: 110, height: 80)
            .overlay {
                Image(systemName: "photo")
                    .font(.title3)
                    .foregroundStyle(.quaternary)
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
