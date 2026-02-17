import SwiftUI

struct IssueDetailView: View {
    let issueId: UUID
    let formId: UUID
    let spotId: UUID
    let job: Job
    var store: JobStore
    var configStore: ConfigStore
    var syncQueue: PhotoSyncQueue

    @Environment(\.dismiss) private var dismiss

    @State private var category = "Other"
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
            VStack(spacing: 0) {
                // Hero photo with overlays
                photoHero

                // Content
                VStack(spacing: 14) {
                    detailsCard
                    notesCard
                    fixStatusCard
                    saveButton
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
                .padding(.bottom, 32)
            }
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Issue Detail")
        .navigationBarTitleDisplayMode(.inline)
        .ignoresSafeArea(.container, edges: .top)
        .onAppear { loadFields() }
        .refreshable { await store.refreshForms(for: job.id) }
    }

    // MARK: - Photo Hero

    private var photoHero: some View {
        ZStack(alignment: .bottom) {
            // Photo
            Color.clear
                .frame(height: 320)
                .overlay {
                    Group {
                        if let urlString = issue?.photoURL {
                            if urlString.hasPrefix("pending://") {
                                let photoId = String(urlString.dropFirst("pending://".count))
                                if let localImage = syncQueue.loadPendingImage(photoId: photoId) {
                                    Image(uiImage: localImage)
                                        .resizable()
                                        .scaledToFill()
                                } else {
                                    photoPlaceholder
                                }
                            } else if let url = URL(string: urlString) {
                                AsyncImage(url: url) { phase in
                                    if let img = phase.image {
                                        img.resizable().scaledToFill()
                                    } else if phase.error != nil {
                                        photoPlaceholder
                                    } else {
                                        ZStack {
                                            Color(.systemGray5)
                                            ProgressView()
                                        }
                                    }
                                }
                            } else {
                                photoPlaceholder
                            }
                        } else {
                            photoPlaceholder
                        }
                    }
                }
                .clipped()

            // Bottom gradient scrim
            LinearGradient(
                stops: [
                    .init(color: .clear, location: 0.4),
                    .init(color: .black.opacity(0.6), location: 1.0),
                ],
                startPoint: .top,
                endPoint: .bottom
            )

            // Bottom overlay: severity + category + spot
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 6) {
                    // Severity pill
                    if let issue {
                        HStack(spacing: 5) {
                            Circle()
                                .fill(issue.severity.color)
                                .frame(width: 8, height: 8)
                            Text(issue.severity.rawValue)
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(.white)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(issue.severity.color.opacity(0.3), in: .capsule)
                        .overlay(Capsule().strokeBorder(issue.severity.color.opacity(0.4), lineWidth: 1))
                    }

                    // Category
                    Text(category)
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(.white)
                        .shadow(color: .black.opacity(0.3), radius: 4, y: 2)
                }

                Spacer()

                // Spot badge
                if let spot {
                    HStack(spacing: 5) {
                        Image(systemName: JobType.icon(for: spot.jobType))
                            .font(.system(size: 10, weight: .semibold))
                        Text(spot.title)
                            .font(.system(size: 11, weight: .semibold))
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(.ultraThinMaterial, in: .capsule)
                }
            }
            .padding(18)
        }
        .overlay(alignment: .topTrailing) {
            // Resolution badge
            if linkedFix != nil {
                HStack(spacing: 5) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 12, weight: .bold))
                    Text("Resolved")
                        .font(.system(size: 12, weight: .bold))
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(DS.Colors.success.gradient, in: .capsule)
                .shadow(color: DS.Colors.success.opacity(0.3), radius: 6, y: 3)
                .padding(.top, 56)
                .padding(.trailing, 16)
            }
        }
    }

    private var photoPlaceholder: some View {
        ZStack {
            Color(.systemGray5)
            VStack(spacing: 6) {
                Image(systemName: "camera")
                    .font(.system(size: 28, weight: .light))
                Text("No photo")
                    .font(.system(size: 13, weight: .medium))
            }
            .foregroundStyle(.tertiary)
        }
    }

    // MARK: - Details Card

    private var detailsCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Category picker
            VStack(alignment: .leading, spacing: 6) {
                Text("CATEGORY")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.secondary)
                    .tracking(0.5)

                Menu {
                    ForEach(configStore.categories(for: spot?.jobType ?? ""), id: \.self) { cat in
                        Button(cat) { category = cat }
                    }
                } label: {
                    HStack {
                        Text(category)
                            .font(.system(size: 15, weight: .medium))
                        Spacer()
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(.tertiary)
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 11)
                    .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 10))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .strokeBorder(Color(.systemGray4), lineWidth: 1)
                    )
                }
                .foregroundStyle(.primary)
            }

            // Severity picker
            VStack(alignment: .leading, spacing: 8) {
                Text("SEVERITY")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.secondary)
                    .tracking(0.5)

                HStack(spacing: 8) {
                    ForEach(IssueSeverity.allCases) { sev in
                        Button {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                severity = sev
                            }
                        } label: {
                            VStack(spacing: 4) {
                                Circle()
                                    .fill(severity == sev ? sev.color : sev.color.opacity(0.2))
                                    .frame(width: 10, height: 10)
                                Text(sev.rawValue)
                                    .font(.system(size: 12, weight: .semibold))
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .foregroundStyle(severity == sev ? .white : sev.color)
                            .background(
                                severity == sev
                                    ? AnyShapeStyle(sev.color.gradient)
                                    : AnyShapeStyle(sev.color.opacity(0.08)),
                                in: .rect(cornerRadius: 12)
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .strokeBorder(
                                        severity == sev ? .clear : sev.color.opacity(0.15),
                                        lineWidth: 1
                                    )
                            )
                        }
                        .sensoryFeedback(.selection, trigger: severity == sev)
                    }
                }
            }

            // Date
            if let issue {
                HStack(spacing: 6) {
                    Image(systemName: "calendar")
                        .font(.system(size: 10, weight: .semibold))
                    Text(issue.dateTaken.formatted(date: .abbreviated, time: .shortened))
                        .font(.system(size: 12, weight: .medium))
                }
                .foregroundStyle(.tertiary)
                .padding(.top, 2)
            }
        }
        .padding(16)
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }

    // MARK: - Notes Card

    private var notesCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("NOTES")
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(.secondary)
                .tracking(0.5)

            TextField("Add notes about this issue...", text: $notes, axis: .vertical)
                .lineLimit(3...8)
                .font(.system(size: 15))
                .padding(12)
                .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .strokeBorder(Color(.systemGray4), lineWidth: 1)
                )
        }
        .padding(16)
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }

    // MARK: - Fix Status Card

    private var linkedFix: FixPhoto? {
        guard let issue else { return nil }
        return linkedFixPhoto(for: issue.id)
    }

    private var inspectionFormForFix: InspectionForm? {
        guard let linkedFix else { return nil }
        return store.forms.first { form in
            form.formType == .inspection && form.spots.contains { spot in
                spot.fixPhotos.contains { $0.id == linkedFix.id }
            }
        }
    }

    private var fixStatusCard: some View {
        Group {
            if let issue, let linkedFix {
                resolvedCard(issue: issue, fix: linkedFix)
            } else if let issue {
                fixIssueButton(issue: issue)
            }
        }
    }

    private func resolvedCard(issue: IssuePhoto, fix: FixPhoto) -> some View {
        VStack(spacing: 0) {
            // Header
            HStack(spacing: 8) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 16, weight: .bold))
                Text("Resolved")
                    .font(.system(size: 15, weight: .bold))
                Spacer()
                Text(fix.dateTaken.formatted(date: .abbreviated, time: .omitted))
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.white.opacity(0.7))
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(DS.Colors.success.gradient)

            // Before/after comparison
            if issue.photoURL != nil || fix.photoURL != nil {
                HStack(spacing: 0) {
                    VStack(spacing: 5) {
                        fixComparisonPhoto(url: issue.photoURL)
                        Text("BEFORE")
                            .font(.system(size: 9, weight: .bold))
                            .tracking(0.8)
                            .foregroundStyle(.tertiary)
                    }
                    .frame(maxWidth: .infinity)

                    ZStack {
                        Circle()
                            .fill(DS.Colors.success.opacity(0.1))
                            .frame(width: 28, height: 28)
                        Image(systemName: "arrow.right")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(DS.Colors.success)
                    }

                    VStack(spacing: 5) {
                        fixComparisonPhoto(url: fix.photoURL)
                        Text("AFTER")
                            .font(.system(size: 9, weight: .bold))
                            .tracking(0.8)
                            .foregroundStyle(.tertiary)
                    }
                    .frame(maxWidth: .infinity)
                }
                .padding(16)
            }

            // Resolution notes
            if !fix.resolutionNotes.isEmpty {
                HStack(alignment: .top, spacing: 8) {
                    Image(systemName: "quote.opening")
                        .font(.system(size: 9))
                        .foregroundStyle(DS.Colors.success.opacity(0.4))
                        .padding(.top, 2)
                    Text(fix.resolutionNotes)
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(DS.Colors.success.opacity(0.04))
            }

            // Link to inspection
            if let inspectionForm = inspectionFormForFix {
                Divider()
                NavigationLink(destination: FormDetailView(form: inspectionForm, job: job, store: store, configStore: configStore, syncQueue: syncQueue)) {
                    HStack(spacing: 8) {
                        Image(systemName: "doc.text.magnifyingglass")
                            .font(.system(size: 12, weight: .medium))
                        Text("View Inspection")
                            .font(.system(size: 13, weight: .semibold))
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(.tertiary)
                    }
                    .foregroundStyle(DS.Colors.success)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }
                .buttonStyle(.plain)
            }
        }
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .overlay(
            RoundedRectangle(cornerRadius: DS.Radius.card)
                .strokeBorder(DS.Colors.success.opacity(0.12), lineWidth: 1)
        )
        .clipShape(.rect(cornerRadius: DS.Radius.card))
        .shadow(color: DS.Colors.success.opacity(0.1), radius: 10, y: 4)
    }

    private func fixIssueButton(issue: IssuePhoto) -> some View {
        NavigationLink(destination: SubmitFixView(job: job, issue: issue, spotId: spotId, store: store, configStore: configStore)) {
            HStack(spacing: 8) {
                Image(systemName: "wrench.and.screwdriver.fill")
                    .font(.system(size: 14, weight: .semibold))
                Text("Fix This Issue")
                    .font(.system(size: 15, weight: .bold))
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(DS.Colors.success.gradient, in: .rect(cornerRadius: 14))
            .shadow(color: DS.Colors.success.opacity(0.25), radius: 8, y: 4)
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
                        comparisonPlaceholder
                    default:
                        ProgressView()
                            .frame(width: 110, height: 80)
                    }
                }
            } else {
                comparisonPlaceholder
            }
        }
    }

    private var comparisonPlaceholder: some View {
        RoundedRectangle(cornerRadius: 10)
            .fill(Color(.tertiarySystemFill))
            .frame(width: 110, height: 80)
            .overlay {
                Image(systemName: "photo")
                    .font(.system(size: 16))
                    .foregroundStyle(.quaternary)
            }
    }

    // MARK: - Save Button

    private var saveButton: some View {
        Button {
            saveChanges()
        } label: {
            HStack(spacing: 8) {
                if showSaved {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 16, weight: .semibold))
                    Text("Saved")
                        .font(.system(size: 16, weight: .bold))
                } else {
                    Image(systemName: "square.and.arrow.down")
                        .font(.system(size: 16, weight: .semibold))
                    Text("Save Changes")
                        .font(.system(size: 16, weight: .bold))
                }
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(
                showSaved
                    ? AnyShapeStyle(DS.Colors.success.gradient)
                    : AnyShapeStyle(DS.Colors.primary.gradient),
                in: .rect(cornerRadius: 14)
            )
            .shadow(color: (showSaved ? DS.Colors.success : DS.Colors.primary).opacity(0.25), radius: 8, y: 4)
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
}
