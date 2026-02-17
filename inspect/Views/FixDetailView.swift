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
            VStack(spacing: 0) {
                // Hero photo
                photoHero

                // Content
                VStack(spacing: 14) {
                    linkedIssueCard
                    detailsCard
                    notesCard
                    saveButton
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
                .padding(.bottom, 32)
            }
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Fix Detail")
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
                        if let urlString = fix?.photoURL, let url = URL(string: urlString) {
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
                    }
                }
                .clipped()

            // Gradient scrim
            LinearGradient(
                stops: [
                    .init(color: .clear, location: 0.4),
                    .init(color: .black.opacity(0.6), location: 1.0),
                ],
                startPoint: .top,
                endPoint: .bottom
            )

            // Bottom overlay
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 6) {
                    // "Fix applied" badge
                    HStack(spacing: 5) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 10, weight: .bold))
                        Text("Fix Applied")
                            .font(.system(size: 12, weight: .bold))
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(DS.Colors.success.opacity(0.4), in: .capsule)
                    .overlay(Capsule().strokeBorder(DS.Colors.success.opacity(0.5), lineWidth: 1))

                    // Linked issue category
                    if let issue = linkedIssue {
                        Text(issue.category)
                            .font(.system(size: 20, weight: .bold))
                            .foregroundStyle(.white)
                            .shadow(color: .black.opacity(0.3), radius: 4, y: 2)
                    }
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

    // MARK: - Linked Issue Card

    private var linkedIssueCard: some View {
        Group {
            if let issue = linkedIssue {
                VStack(alignment: .leading, spacing: 0) {
                    // Header
                    HStack(spacing: 6) {
                        Image(systemName: "arrow.uturn.right")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(DS.Colors.info)
                        Text("LINKED ISSUE")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(.secondary)
                            .tracking(0.5)
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 14)
                    .padding(.bottom, 10)

                    // Issue details row
                    HStack(spacing: 12) {
                        // Issue photo thumbnail
                        if let urlString = issue.photoURL, let url = URL(string: urlString) {
                            AsyncImage(url: url) { phase in
                                if let img = phase.image {
                                    img.resizable().scaledToFill()
                                } else {
                                    Color(.systemGray5)
                                }
                            }
                            .frame(width: 52, height: 52)
                            .clipShape(.rect(cornerRadius: 10))
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .strokeBorder(issue.severity.color.opacity(0.4), lineWidth: 2)
                            )
                        }

                        VStack(alignment: .leading, spacing: 4) {
                            Text(issue.category)
                                .font(.system(size: 14, weight: .semibold))

                            HStack(spacing: 6) {
                                HStack(spacing: 3) {
                                    Circle()
                                        .fill(issue.severity.color)
                                        .frame(width: 6, height: 6)
                                    Text(issue.severity.rawValue)
                                        .font(.system(size: 11, weight: .semibold))
                                        .foregroundStyle(issue.severity.color)
                                }

                                if let spot {
                                    Text(spot.title)
                                        .font(.system(size: 11))
                                        .foregroundStyle(.tertiary)
                                }
                            }
                        }

                        Spacer()
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 14)

                    // Issue notes
                    if !issue.notes.isEmpty {
                        Divider().padding(.horizontal, 16)
                        Text(issue.notes)
                            .font(.system(size: 12))
                            .foregroundStyle(.tertiary)
                            .lineLimit(3)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                    }
                }
                .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
                .overlay(
                    RoundedRectangle(cornerRadius: DS.Radius.card)
                        .strokeBorder(DS.Colors.info.opacity(0.1), lineWidth: 1)
                )
                .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
            }
        }
    }

    // MARK: - Details Card

    private var detailsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "wrench.and.screwdriver.fill")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(DS.Colors.success)
                Text("FIX DETAILS")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.secondary)
                    .tracking(0.5)
            }

            // Spot info
            if let spot {
                HStack(spacing: 10) {
                    Image(systemName: JobType.icon(for: spot.jobType))
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(width: 28, height: 28)
                        .background(DS.Colors.success.gradient, in: .rect(cornerRadius: 8))

                    Text(spot.title)
                        .font(.system(size: 14, weight: .semibold))

                    Spacer()

                    Text(spot.jobType)
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(DS.Colors.success)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(DS.Colors.success.opacity(0.1), in: .capsule)
                }
            }

            if let fix {
                HStack(spacing: 6) {
                    Image(systemName: "calendar")
                        .font(.system(size: 10, weight: .semibold))
                    Text(fix.dateTaken.formatted(date: .abbreviated, time: .shortened))
                        .font(.system(size: 12, weight: .medium))
                }
                .foregroundStyle(.tertiary)
            }
        }
        .padding(16)
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }

    // MARK: - Notes Card

    private var notesCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("RESOLUTION NOTES")
                .font(.system(size: 11, weight: .bold))
                .foregroundStyle(.secondary)
                .tracking(0.5)

            TextField("How was this fixed?", text: $resolutionNotes, axis: .vertical)
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
                    : AnyShapeStyle(DS.Colors.success.opacity(0.9).gradient),
                in: .rect(cornerRadius: 14)
            )
            .shadow(color: DS.Colors.success.opacity(0.25), radius: 8, y: 4)
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
}
