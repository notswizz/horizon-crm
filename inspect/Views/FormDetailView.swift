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

                if !liveForm.allMaterials.isEmpty {
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
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
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
                Text("\(liveForm.allMaterials.count)")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(Color(.tertiarySystemFill), in: .capsule)
            }

            ForEach(liveForm.allMaterials) { material in
                HStack(spacing: 10) {
                    Image(systemName: material.type.icon)
                        .font(.caption)
                        .foregroundStyle(material.type.color)
                        .frame(width: 24)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(material.name.isEmpty ? "Unnamed" : material.name)
                            .font(.subheadline.weight(.medium))
                        HStack(spacing: 8) {
                            if !material.quantity.isEmpty {
                                Text(material.quantity)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            if let cost = material.cost {
                                Text("$\(cost, specifier: "%.2f")")
                                    .font(.caption.weight(.medium))
                                    .foregroundStyle(DS.Colors.success)
                            }
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
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }

    // MARK: - Audit: Grouped by Spot

    private var auditSpotSections: some View {
        ForEach(liveForm.spots.filter { !$0.issuePhotos.isEmpty }) { spot in
            spotIssueCard(spot: spot)
        }
    }

    private func spotIssueCard(spot: FormSpot) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // Spot header
            HStack {
                Label {
                    Text(spot.title.isEmpty ? "Unknown Spot" : spot.title)
                        .font(.headline)
                } icon: {
                    Image(systemName: spot.jobType.icon)
                        .foregroundStyle(DS.Colors.primary)
                }

                Spacer()

                Text(spot.jobType.rawValue)
                    .font(.caption.weight(.medium))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(DS.Colors.primary.opacity(0.1), in: .capsule)
                    .foregroundStyle(DS.Colors.primary)
            }

            Divider()

            // Issue photos
            if spot.issuePhotos.count > 1 {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(spot.issuePhotos) { photo in
                            issuePhotoCard(photo, spotId: spot.id)
                                .frame(width: 260)
                        }
                    }
                }
            } else {
                ForEach(spot.issuePhotos) { photo in
                    issuePhotoCard(photo, spotId: spot.id)
                }
            }
        }
        .padding()
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }

    private func issuePhotoCard(_ photo: IssuePhoto, spotId: UUID) -> some View {
        NavigationLink(destination: IssueDetailView(issueId: photo.id, formId: liveForm.id, spotId: spotId, job: job, store: store)) {
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
                            .foregroundStyle(DS.Colors.success)
                        Text("Resolved")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(DS.Colors.success)
                    } else {
                        Image(systemName: "exclamationmark.circle")
                            .font(.caption)
                            .foregroundStyle(DS.Colors.primary)
                        Text("Open")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(DS.Colors.primary)
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
        ForEach(liveForm.spots.filter { !$0.fixPhotos.isEmpty }) { spot in
            spotFixCard(spot: spot)
        }
    }

    private func spotFixCard(spot: FormSpot) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // Spot header
            HStack {
                Label {
                    Text(spot.title.isEmpty ? "Unknown Spot" : spot.title)
                        .font(.headline)
                } icon: {
                    Image(systemName: spot.jobType.icon)
                        .foregroundStyle(DS.Colors.success)
                }

                Spacer()

                Text(spot.jobType.rawValue)
                    .font(.caption.weight(.medium))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(DS.Colors.success.opacity(0.1), in: .capsule)
                    .foregroundStyle(DS.Colors.success)
            }

            Divider()

            // Fix photos
            if spot.fixPhotos.count > 1 {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(spot.fixPhotos) { photo in
                            fixPhotoCard(photo, spotId: spot.id)
                                .frame(width: 260)
                        }
                    }
                }
            } else {
                ForEach(spot.fixPhotos) { photo in
                    fixPhotoCard(photo, spotId: spot.id)
                }
            }
        }
        .padding()
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }

    private func fixPhotoCard(_ photo: FixPhoto, spotId: UUID) -> some View {
        NavigationLink(destination: FixDetailView(fixId: photo.id, formId: liveForm.id, spotId: spotId, job: job, store: store)) {
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
                            .foregroundStyle(DS.Colors.success)
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
            for spot in form.spots {
                if let fix = spot.fixPhotos.first(where: { $0.linkedAuditIssueId == issueId }) {
                    return fix
                }
            }
        }
        return nil
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

        if !f.allMaterials.isEmpty {
            text += "\n\nMaterials:"
            for mat in f.allMaterials {
                let costStr = mat.cost.map { " — $\(String(format: "%.2f", $0))" } ?? ""
                text += "\n  - \(mat.name) (\(mat.type.rawValue)) — \(mat.quantity)\(costStr)"
            }
        }

        // Group by spot
        if f.formType == .audit {
            for spot in f.spots where !spot.issuePhotos.isEmpty {
                text += "\n\n--- Spot: \(spot.title.isEmpty ? "Unknown" : spot.title) (\(spot.jobType.rawValue)) ---"
                for photo in spot.issuePhotos {
                    text += "\n  Issue: \(photo.category.rawValue) (\(photo.severity.rawValue))"
                    if !photo.notes.isEmpty {
                        text += "\n  Notes: \(photo.notes)"
                    }
                }
            }
        } else {
            for spot in f.spots where !spot.fixPhotos.isEmpty {
                text += "\n\n--- Spot: \(spot.title.isEmpty ? "Unknown" : spot.title) (\(spot.jobType.rawValue)) ---"
                for photo in spot.fixPhotos {
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
