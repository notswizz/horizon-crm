import SwiftUI

struct FormDetailView: View {
    let form: InspectionForm
    let job: Job
    var store: JobStore

    /// Live version of the form from the store's listener, falls back to the passed-in snapshot
    private var liveForm: InspectionForm {
        store.forms.first { $0.id == form.id } ?? form
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                formInfoCard

                if !liveForm.materials.isEmpty {
                    materialsCard
                }

                // Group by spot
                if liveForm.formType == .audit {
                    auditSpotSections
                } else {
                    inspectionSpotSections
                }
            }
            .padding()
        }
        .navigationTitle(form.formType.rawValue)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                ShareLink(item: shareText) {
                    Image(systemName: "square.and.arrow.up")
                }
            }
        }
        .refreshable { await store.refreshForms(for: job.id) }
    }

    // MARK: - Form Info Card

    private var formInfoCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(job.address.isEmpty ? "Untitled" : job.address)
                    .font(.title3.weight(.semibold))
                Spacer()
                FormTypeBadge(formType: liveForm.formType)
            }

            Divider()

            Label(liveForm.inspectorName.isEmpty ? "Unknown" : liveForm.inspectorName, systemImage: "person.fill")
                .font(.subheadline)
            Label(liveForm.date.formatted(date: .long, time: .shortened), systemImage: "calendar")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Text("\(liveForm.photoCount) photo\(liveForm.photoCount == 1 ? "" : "s")")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            if !liveForm.notes.isEmpty {
                Text(liveForm.notes)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.top, 2)
            }
        }
        .padding()
        .background(.background, in: .rect(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
    }

    // MARK: - Materials Card

    private var materialsCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label {
                    Text("Materials")
                        .font(.headline)
                } icon: {
                    Image(systemName: "shippingbox.fill")
                        .foregroundStyle(.purple)
                }
                Spacer()
                Text("\(liveForm.materials.count)")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(Color(.tertiarySystemFill), in: .capsule)
            }

            ForEach(liveForm.materials) { material in
                HStack(spacing: 10) {
                    Image(systemName: material.type.icon)
                        .font(.caption)
                        .foregroundStyle(material.type.color)
                        .frame(width: 24)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(material.name.isEmpty ? "Unnamed" : material.name)
                            .font(.subheadline.weight(.medium))
                        if !material.quantity.isEmpty {
                            Text(material.quantity)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }

                    Spacer()

                    Text(material.type.rawValue)
                        .font(.caption2.weight(.medium))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(material.type.color.opacity(0.15), in: .capsule)
                        .foregroundStyle(material.type.color)
                }
                .padding(10)
                .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 8))
            }
        }
        .padding()
        .background(.background, in: .rect(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
    }

    // MARK: - Audit: Grouped by Spot

    private var auditSpotSections: some View {
        let spotIds = uniqueSpotIds(from: liveForm.issuePhotos.map(\.spotId))
        return ForEach(spotIds, id: \.self) { spotId in
            let spot = job.spots.first { $0.id == spotId }
            let photos = liveForm.issuePhotos.filter { $0.spotId == spotId }
            spotIssueCard(spot: spot, photos: photos)
        }
    }

    private func spotIssueCard(spot: Spot?, photos: [IssuePhoto]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // Spot header
            HStack {
                Label {
                    Text(spot?.title ?? "Unknown Spot")
                        .font(.headline)
                } icon: {
                    Image(systemName: spot?.jobType.icon ?? "mappin")
                        .foregroundStyle(.orange)
                }

                Spacer()

                if let spot {
                    Text(spot.jobType.rawValue)
                        .font(.caption.weight(.medium))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(.orange.opacity(0.1), in: .capsule)
                        .foregroundStyle(.orange)
                }
            }

            Divider()

            // Issue photos
            if photos.count > 1 {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(photos) { photo in
                            issuePhotoCard(photo)
                                .frame(width: 260)
                        }
                    }
                }
            } else {
                ForEach(photos) { photo in
                    issuePhotoCard(photo)
                }
            }
        }
        .padding()
        .background(.background, in: .rect(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
    }

    private func issuePhotoCard(_ photo: IssuePhoto) -> some View {
        NavigationLink(destination: IssueDetailView(issueId: photo.id, formId: liveForm.id, job: job, store: store)) {
            VStack(alignment: .leading, spacing: 8) {
                // Category + severity
                HStack(spacing: 6) {
                    Image(systemName: photo.severity.icon)
                        .foregroundStyle(photo.severity.color)
                        .font(.caption)

                    Text(photo.category.rawValue)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.primary)
                        .lineLimit(1)

                    Text(photo.severity.rawValue)
                        .font(.caption2.weight(.medium))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(photo.severity.color.opacity(0.15), in: .capsule)
                        .foregroundStyle(photo.severity.color)
                }

                // Photo
                if let urlString = photo.photoURL, let url = URL(string: urlString) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFill()
                                .frame(maxWidth: .infinity)
                                .frame(height: 160)
                                .clipped()
                                .clipShape(.rect(cornerRadius: 8))
                        case .failure:
                            photoPlaceholder("Failed to load")
                        default:
                            ProgressView()
                                .frame(height: 160)
                        }
                    }
                }

                // Bottom: status badge — always same height
                HStack(spacing: 6) {
                    if linkedFixPhoto(for: photo.id) != nil {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.caption)
                            .foregroundStyle(.green)
                        Text("Resolved")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.green)
                    } else {
                        Image(systemName: "exclamationmark.circle")
                            .font(.caption)
                            .foregroundStyle(.orange)
                        Text("Open")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.orange)
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
                .frame(height: 20)
            }
            .padding(10)
            .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 8))
        }
        .buttonStyle(.plain)
    }

    // MARK: - Inspection: Grouped by Spot

    private var inspectionSpotSections: some View {
        let spotIds = uniqueSpotIds(from: liveForm.fixPhotos.map(\.spotId))
        return ForEach(spotIds, id: \.self) { spotId in
            let spot = job.spots.first { $0.id == spotId }
            let photos = liveForm.fixPhotos.filter { $0.spotId == spotId }
            spotFixCard(spot: spot, photos: photos)
        }
    }

    private func spotFixCard(spot: Spot?, photos: [FixPhoto]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // Spot header
            HStack {
                Label {
                    Text(spot?.title ?? "Unknown Spot")
                        .font(.headline)
                } icon: {
                    Image(systemName: spot?.jobType.icon ?? "mappin")
                        .foregroundStyle(.green)
                }

                Spacer()

                if let spot {
                    Text(spot.jobType.rawValue)
                        .font(.caption.weight(.medium))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(.green.opacity(0.1), in: .capsule)
                        .foregroundStyle(.green)
                }
            }

            Divider()

            // Fix photos
            if photos.count > 1 {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(photos) { photo in
                            fixPhotoCard(photo)
                                .frame(width: 260)
                        }
                    }
                }
            } else {
                ForEach(photos) { photo in
                    fixPhotoCard(photo)
                }
            }
        }
        .padding()
        .background(.background, in: .rect(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
    }

    private func fixPhotoCard(_ photo: FixPhoto) -> some View {
        NavigationLink(destination: FixDetailView(fixId: photo.id, formId: liveForm.id, job: job, store: store)) {
            VStack(alignment: .leading, spacing: 8) {
                // Linked issue info
                if let linkedId = photo.linkedAuditIssueId {
                    let linkedIssue = store.auditIssuePhotos.first { $0.id == linkedId }
                    if let issue = linkedIssue {
                        HStack(spacing: 6) {
                            Image(systemName: "link")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                            Text("Fixes: \(issue.category.rawValue)")
                                .font(.caption.weight(.medium))
                                .foregroundStyle(.primary)
                                .lineLimit(1)
                            Text(issue.severity.rawValue)
                                .font(.caption2.weight(.medium))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(issue.severity.color.opacity(0.15), in: .capsule)
                                .foregroundStyle(issue.severity.color)
                        }
                    }
                }

                // Photo
                if let urlString = photo.photoURL, let url = URL(string: urlString) {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFill()
                                .frame(maxWidth: .infinity)
                                .frame(height: 160)
                                .clipped()
                                .clipShape(.rect(cornerRadius: 8))
                        case .failure:
                            photoPlaceholder("Failed to load")
                        default:
                            ProgressView()
                                .frame(height: 160)
                        }
                    }
                }

                // Bottom row — consistent height
                HStack(spacing: 6) {
                    if !photo.resolutionNotes.isEmpty {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                            .font(.caption)
                        Text(photo.resolutionNotes)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    } else {
                        Image(systemName: "text.badge.plus")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                        Text("Add notes")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
                .frame(height: 20)
            }
            .padding(10)
            .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 8))
        }
        .buttonStyle(.plain)
    }

    // MARK: - Helpers

    private func photoPlaceholder(_ text: String) -> some View {
        RoundedRectangle(cornerRadius: 8)
            .fill(.gray.opacity(0.1))
            .frame(height: 200)
            .overlay {
                Text(text)
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
    }

    /// Finds the FixPhoto that resolves a given audit issue
    private func linkedFixPhoto(for issueId: UUID) -> FixPhoto? {
        for form in store.forms where form.formType == .inspection {
            if let fix = form.fixPhotos.first(where: { $0.linkedAuditIssueId == issueId }) {
                return fix
            }
        }
        return nil
    }

    /// Preserves ordering of first-seen spot IDs
    private func uniqueSpotIds(from ids: [UUID]) -> [UUID] {
        var seen = Set<UUID>()
        return ids.filter { seen.insert($0).inserted }
    }

    // MARK: - Share

    private var shareText: String {
        let f = liveForm
        var text = """
        Quality \(f.formType.rawValue) Report
        ========================
        Address: \(job.address)
        Contact: \(job.contactName)
        Inspector: \(f.inspectorName)
        Date: \(f.date.formatted(date: .long, time: .shortened))
        Type: \(f.formType.rawValue)
        """

        if !f.notes.isEmpty {
            text += "\nNotes: \(f.notes)"
        }

        if !f.materials.isEmpty {
            text += "\n\nMaterials:"
            for mat in f.materials {
                text += "\n  - \(mat.name) (\(mat.type.rawValue)) — \(mat.quantity)"
            }
        }

        // Group by spot
        if f.formType == .audit {
            let spotIds = uniqueSpotIds(from: f.issuePhotos.map(\.spotId))
            for spotId in spotIds {
                let spot = job.spots.first { $0.id == spotId }
                let photos = f.issuePhotos.filter { $0.spotId == spotId }
                text += "\n\n--- Spot: \(spot?.title ?? "Unknown") (\(spot?.jobType.rawValue ?? "")) ---"
                for photo in photos {
                    text += "\n  Issue: \(photo.category.rawValue) (\(photo.severity.rawValue))"
                    if !photo.notes.isEmpty {
                        text += "\n  Notes: \(photo.notes)"
                    }
                }
            }
        } else {
            let spotIds = uniqueSpotIds(from: f.fixPhotos.map(\.spotId))
            for spotId in spotIds {
                let spot = job.spots.first { $0.id == spotId }
                let photos = f.fixPhotos.filter { $0.spotId == spotId }
                text += "\n\n--- Spot: \(spot?.title ?? "Unknown") (\(spot?.jobType.rawValue ?? "")) ---"
                for photo in photos {
                    if let linkedId = photo.linkedAuditIssueId,
                       let issue = store.auditIssuePhotos.first(where: { $0.id == linkedId }) {
                        text += "\n  Fixes: \(issue.category.rawValue) (\(issue.severity.rawValue))"
                    }
                    if !photo.resolutionNotes.isEmpty {
                        text += "\n  Resolution: \(photo.resolutionNotes)"
                    }
                }
            }
        }

        return text
    }
}
