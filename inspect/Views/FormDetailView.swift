import SwiftUI

struct FormDetailView: View {
    let form: InspectionForm
    let job: Job
    var store: JobStore
    var configStore: ConfigStore
    var syncQueue: PhotoSyncQueue

    /// Live version of the form from the store's listener, falls back to the passed-in snapshot
    private var liveForm: InspectionForm {
        store.forms.first { $0.id == form.id } ?? form
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
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
            .padding(.horizontal, 16)
            .padding(.top, 8)
            .padding(.bottom, 32)
        }
        .background(Color(.systemGroupedBackground))
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

    private var formAccent: Color {
        liveForm.formType == .audit ? DS.Colors.info : DS.Colors.success
    }

    private var formInfoCard: some View {
        let isAudit = liveForm.formType == .audit
        let resolved = isAudit ? resolvedCount : 0
        let total = isAudit ? liveForm.issuePhotos.count : 0

        return VStack(alignment: .leading, spacing: 0) {
            // Top row: date + type badge
            HStack {
                Text(liveForm.date.formatted(date: .abbreviated, time: .omitted))
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.white.opacity(0.5))

                Spacer()

                HStack(spacing: 5) {
                    Image(systemName: isAudit ? "clipboard.fill" : "checkmark.shield.fill")
                        .font(.system(size: 9, weight: .bold))
                    Text(liveForm.formType.rawValue)
                        .font(.system(size: 11, weight: .bold))
                        .tracking(0.3)
                }
                .foregroundStyle(.white)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(.white.opacity(0.15), in: .capsule)
                .overlay(Capsule().strokeBorder(.white.opacity(0.12), lineWidth: 1))
            }
            .padding(.bottom, 14)

            // Address
            Text(job.streetAddress.isEmpty ? (job.address.isEmpty ? "Untitled" : job.address) : job.streetAddress)
                .font(.system(size: 22, weight: .heavy, design: .rounded))
                .foregroundStyle(.white)
                .lineLimit(2)

            if !job.city.isEmpty || !job.state.isEmpty {
                Text([job.city, job.state, job.zipCode].filter { !$0.isEmpty }.joined(separator: ", "))
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.white.opacity(0.55))
                    .padding(.top, 2)
            }

            // Inspector + time
            HStack(spacing: 0) {
                // Initials avatar
                Text(String(liveForm.inspectorName.prefix(1)).uppercased())
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(formAccent)
                    .frame(width: 26, height: 26)
                    .background(.white.opacity(0.2), in: .circle)

                Text(liveForm.inspectorName.isEmpty ? "Unknown" : liveForm.inspectorName)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.85))
                    .padding(.leading, 8)

                Spacer()

                HStack(spacing: 4) {
                    Image(systemName: "clock")
                        .font(.system(size: 9, weight: .semibold))
                    Text(liveForm.date.formatted(date: .omitted, time: .shortened))
                        .font(.system(size: 11, weight: .medium))
                }
                .foregroundStyle(.white.opacity(0.45))
            }
            .padding(.top, 14)

            // Stats row
            HStack(spacing: 8) {
                FormHeroStat(value: "\(liveForm.photoCount)", label: "Photos", icon: "camera.fill")
                if isAudit {
                    FormHeroStat(value: "\(liveForm.issuePhotos.count)", label: "Issues", icon: "exclamationmark.triangle.fill")
                } else {
                    FormHeroStat(value: "\(liveForm.fixPhotos.count)", label: "Fixes", icon: "wrench.and.screwdriver.fill")
                }
                FormHeroStat(value: "\(liveForm.spots.count)", label: "Spots", icon: "mappin")
            }
            .padding(.top, 14)

            // Resolution progress bar (audit only)
            if isAudit && total > 0 {
                VStack(spacing: 6) {
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule()
                                .fill(.white.opacity(0.12))
                                .frame(height: 4)

                            Capsule()
                                .fill(resolved == total ? DS.Colors.success : DS.Colors.warning)
                                .frame(width: geo.size.width * CGFloat(resolved) / CGFloat(total), height: 4)
                        }
                    }
                    .frame(height: 4)

                    HStack {
                        Text("\(resolved) of \(total) resolved")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(.white.opacity(0.5))
                        Spacer()
                        Text("\(Int(Double(resolved) / Double(total) * 100))%")
                            .font(.system(size: 10, weight: .bold, design: .rounded))
                            .foregroundStyle(resolved == total ? DS.Colors.success : .white.opacity(0.7))
                    }
                }
                .padding(.top, 12)
            }

            // Notes
            if !liveForm.notes.isEmpty {
                Text(liveForm.notes)
                    .font(.system(size: 12))
                    .foregroundStyle(.white.opacity(0.65))
                    .lineLimit(3)
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(.white.opacity(0.08), in: .rect(cornerRadius: 10))
                    .padding(.top, 12)
            }
        }
        .padding(20)
        .background(
            ZStack {
                LinearGradient(
                    stops: isAudit ? [
                        .init(color: Color(red: 0.15, green: 0.28, blue: 0.55), location: 0),
                        .init(color: DS.Colors.info, location: 0.5),
                        .init(color: Color(red: 0.1, green: 0.18, blue: 0.38), location: 1),
                    ] : [
                        .init(color: Color(red: 0.1, green: 0.45, blue: 0.35), location: 0),
                        .init(color: DS.Colors.success, location: 0.5),
                        .init(color: Color(red: 0.06, green: 0.25, blue: 0.2), location: 1),
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                // Subtle bokeh circles
                Circle()
                    .fill((isAudit ? Color.blue : Color.mint).opacity(0.15))
                    .frame(width: 180, height: 180)
                    .blur(radius: 60)
                    .offset(x: 110, y: -40)

                Circle()
                    .fill((isAudit ? Color.indigo : Color.teal).opacity(0.15))
                    .frame(width: 140, height: 140)
                    .blur(radius: 45)
                    .offset(x: -90, y: 60)
            }
        )
        .clipShape(.rect(cornerRadius: 22))
        .shadow(color: formAccent.opacity(0.18), radius: 3, y: 2)
        .shadow(color: formAccent.opacity(0.12), radius: 16, y: 8)
    }

    // MARK: - Materials Card

    private var materialsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "shippingbox.fill")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.purple)
                    Text("Materials")
                        .font(.system(size: 14, weight: .bold))
                }

                Spacer()

                let totalCost = liveForm.allMaterials.compactMap(\.cost).reduce(0, +)
                if totalCost > 0 {
                    Text("$\(totalCost, specifier: "%.0f")")
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .foregroundStyle(DS.Colors.success)
                }
            }

            ForEach(liveForm.allMaterials) { material in
                HStack(spacing: 10) {
                    Image(systemName: MaterialType.icon(for: material.type))
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(MaterialType.color(for: material.type))
                        .frame(width: 28, height: 28)
                        .background(MaterialType.color(for: material.type).opacity(0.1), in: .rect(cornerRadius: 8))

                    VStack(alignment: .leading, spacing: 1) {
                        Text(material.name.isEmpty ? "Unnamed" : material.name)
                            .font(.system(size: 13, weight: .semibold))
                        if !material.quantity.isEmpty {
                            Text(material.quantity)
                                .font(.system(size: 11))
                                .foregroundStyle(.secondary)
                        }
                    }

                    Spacer()

                    if let cost = material.cost {
                        Text("$\(cost, specifier: "%.2f")")
                            .font(.system(size: 13, weight: .bold, design: .rounded))
                            .foregroundStyle(DS.Colors.success)
                    }
                }
            }
        }
        .padding(16)
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
        VStack(alignment: .leading, spacing: 0) {
            // Spot header
            HStack(spacing: 10) {
                Image(systemName: JobType.icon(for: spot.jobType))
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 30, height: 30)
                    .background(DS.Colors.primary.gradient, in: .rect(cornerRadius: 8))

                Text(spot.title.isEmpty ? "Unknown Spot" : spot.title)
                    .font(.system(size: 16, weight: .bold))

                Spacer()

                Text(spot.jobType)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(DS.Colors.primary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(DS.Colors.primary.opacity(0.1), in: .capsule)
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)
            .padding(.bottom, 12)

            // Issue photos
            VStack(spacing: 2) {
                ForEach(Array(spot.issuePhotos.enumerated()), id: \.element.id) { index, photo in
                    issuePhotoRow(photo, spotId: spot.id)

                    if index < spot.issuePhotos.count - 1 {
                        Divider().padding(.leading, 16)
                    }
                }
            }
        }
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }

    private func issuePhotoRow(_ photo: IssuePhoto, spotId: UUID) -> some View {
        let isResolved = linkedFixPhoto(for: photo.id) != nil

        return NavigationLink(destination: IssueDetailView(issueId: photo.id, formId: liveForm.id, spotId: spotId, job: job, store: store, configStore: configStore, syncQueue: syncQueue)) {
            HStack(spacing: 12) {
                // Photo thumbnail
                ZStack(alignment: .bottomTrailing) {
                    photoThumbnail(url: photo.photoURL, size: 72)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .strokeBorder(photo.severity.color.opacity(0.4), lineWidth: 2)
                        )

                    // Resolution badge on thumbnail
                    if isResolved {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 16))
                            .foregroundStyle(DS.Colors.success)
                            .background(.white, in: .circle)
                            .offset(x: 4, y: 4)
                    }
                }

                // Info
                VStack(alignment: .leading, spacing: 4) {
                    Text(photo.category)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.primary)
                        .lineLimit(1)

                    // Severity badge
                    HStack(spacing: 4) {
                        Circle()
                            .fill(photo.severity.color)
                            .frame(width: 6, height: 6)
                        Text(photo.severity.rawValue)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(photo.severity.color)
                    }

                    // Status
                    HStack(spacing: 4) {
                        Image(systemName: isResolved ? "checkmark.circle.fill" : "exclamationmark.circle")
                            .font(.system(size: 10))
                        Text(isResolved ? "Resolved" : "Open")
                            .font(.system(size: 11, weight: .medium))
                    }
                    .foregroundStyle(isResolved ? DS.Colors.success : DS.Colors.warning)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.quaternary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
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
        VStack(alignment: .leading, spacing: 0) {
            // Spot header
            HStack(spacing: 10) {
                Image(systemName: JobType.icon(for: spot.jobType))
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 30, height: 30)
                    .background(DS.Colors.success.gradient, in: .rect(cornerRadius: 8))

                Text(spot.title.isEmpty ? "Unknown Spot" : spot.title)
                    .font(.system(size: 16, weight: .bold))

                Spacer()

                Text(spot.jobType)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(DS.Colors.success)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(DS.Colors.success.opacity(0.1), in: .capsule)
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)
            .padding(.bottom, 12)

            // Fix photos
            VStack(spacing: 2) {
                ForEach(Array(spot.fixPhotos.enumerated()), id: \.element.id) { index, photo in
                    fixPhotoRow(photo, spotId: spot.id)

                    if index < spot.fixPhotos.count - 1 {
                        Divider().padding(.leading, 16)
                    }
                }
            }
        }
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }

    private func fixPhotoRow(_ photo: FixPhoto, spotId: UUID) -> some View {
        let linkedIssue = photo.linkedAuditIssueId.flatMap { id in
            store.auditIssuePhotos.first { $0.id == id }
        }

        return NavigationLink(destination: FixDetailView(fixId: photo.id, formId: liveForm.id, spotId: spotId, job: job, store: store)) {
            HStack(spacing: 12) {
                // Before/after thumbnails
                ZStack(alignment: .bottomTrailing) {
                    photoThumbnail(url: photo.photoURL, size: 72)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .strokeBorder(DS.Colors.success.opacity(0.4), lineWidth: 2)
                        )

                    // Mini "before" thumbnail if linked
                    if let issue = linkedIssue, issue.photoURL != nil {
                        photoThumbnail(url: issue.photoURL, size: 28)
                            .overlay(
                                RoundedRectangle(cornerRadius: 6)
                                    .strokeBorder(.white, lineWidth: 2)
                            )
                            .offset(x: 6, y: 6)
                    }
                }

                // Info
                VStack(alignment: .leading, spacing: 4) {
                    if let issue = linkedIssue {
                        HStack(spacing: 4) {
                            Image(systemName: "arrow.uturn.right")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundStyle(DS.Colors.success)
                            Text(issue.category)
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundStyle(.primary)
                                .lineLimit(1)
                        }

                        HStack(spacing: 4) {
                            Circle()
                                .fill(issue.severity.color)
                                .frame(width: 6, height: 6)
                            Text(issue.severity.rawValue)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(issue.severity.color)
                        }
                    } else {
                        Text("Fix photo")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.primary)
                    }

                    if !photo.resolutionNotes.isEmpty {
                        Text(photo.resolutionNotes)
                            .font(.system(size: 11))
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    }
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.quaternary)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Shared Photo Thumbnail

    private func photoThumbnail(url: String?, size: CGFloat) -> some View {
        Group {
            if let urlString = url {
                if urlString.hasPrefix("pending://") {
                    let photoId = String(urlString.dropFirst("pending://".count))
                    ZStack(alignment: .topTrailing) {
                        if let localImage = syncQueue.loadPendingImage(photoId: photoId) {
                            Image(uiImage: localImage)
                                .resizable()
                                .scaledToFill()
                        } else {
                            Color(.systemGray5)
                        }
                        Image(systemName: "arrow.triangle.2.circlepath.icloud.fill")
                            .font(.system(size: 7))
                            .foregroundStyle(.white)
                            .padding(3)
                            .background(.ultraThinMaterial, in: .circle)
                            .padding(3)
                    }
                } else if let imageUrl = URL(string: urlString) {
                    AsyncImage(url: imageUrl) { phase in
                        if let img = phase.image {
                            img.resizable().scaledToFill()
                        } else {
                            Color(.systemGray5)
                        }
                    }
                } else {
                    Color(.systemGray5)
                }
            } else {
                Color(.systemGray5)
                    .overlay(
                        Image(systemName: "camera")
                            .font(.system(size: size * 0.2))
                            .foregroundStyle(.tertiary)
                    )
            }
        }
        .frame(width: size, height: size)
        .clipShape(.rect(cornerRadius: size > 40 ? 12 : 6))
    }

    // MARK: - Helpers

    private var resolvedCount: Int {
        liveForm.issuePhotos.filter { linkedFixPhoto(for: $0.id) != nil }.count
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
                text += "\n  - \(mat.name) (\(mat.type)) — \(mat.quantity)\(costStr)"
            }
        }

        // Group by spot
        if f.formType == .audit {
            for spot in f.spots where !spot.issuePhotos.isEmpty {
                text += "\n\n--- Spot: \(spot.title.isEmpty ? "Unknown" : spot.title) (\(spot.jobType)) ---"
                for photo in spot.issuePhotos {
                    text += "\n  Issue: \(photo.category) (\(photo.severity.rawValue))"
                    if !photo.notes.isEmpty {
                        text += "\n  Notes: \(photo.notes)"
                    }
                }
            }
        } else {
            for spot in f.spots where !spot.fixPhotos.isEmpty {
                text += "\n\n--- Spot: \(spot.title.isEmpty ? "Unknown" : spot.title) (\(spot.jobType)) ---"
                for photo in spot.fixPhotos {
                    if let linkedId = photo.linkedAuditIssueId,
                       let issue = store.auditIssuePhotos.first(where: { $0.id == linkedId }) {
                        text += "\n  Fixes: \(issue.category) (\(issue.severity.rawValue))"
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

// MARK: - Form Hero Stat Block

private struct FormHeroStat: View {
    let value: String
    let label: String
    let icon: String

    var body: some View {
        VStack(spacing: 3) {
            Image(systemName: icon)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(.white.opacity(0.5))
            Text(value)
                .font(.system(size: 17, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
            Text(label)
                .font(.system(size: 9, weight: .semibold))
                .foregroundStyle(.white.opacity(0.45))
                .textCase(.uppercase)
                .tracking(0.3)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(.white.opacity(0.08), in: .rect(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(.white.opacity(0.06), lineWidth: 1)
        )
    }
}
