import SwiftUI

// MARK: - Design Tokens

private enum DetailDesign {
    static let cardRadius: CGFloat = 14
    static let innerRadius: CGFloat = 10
    static let cardPadding: CGFloat = 16
    static let sectionSpacing: CGFloat = 12
    static let shadowColor = Color.black.opacity(0.04)
    static let shadowRadius: CGFloat = 6
    static let shadowY: CGFloat = 2
}

// MARK: - Job Detail View

struct JobDetailView: View {
    let job: Job
    var store: JobStore

    @State private var editedStage: JobStage
    @State private var rebateText: String
    @State private var showNewSpotSheet = false
    @State private var newSpotTitle = ""
    @State private var newSpotJobType: JobType = .insulation

    init(job: Job, store: JobStore) {
        self.job = job
        self.store = store
        self._editedStage = State(initialValue: job.currentStage)
        self._rebateText = State(initialValue: job.rebateAmount > 0 ? String(format: "%.0f", job.rebateAmount) : "")
    }

    private var audit: InspectionForm? {
        store.forms.first { $0.formType == .audit }
    }

    private var inspections: [InspectionForm] {
        store.forms.filter { $0.formType == .inspection }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                heroHeader
                    .padding(.bottom, 16)

                VStack(spacing: DetailDesign.sectionSpacing) {
                    stagePipeline
                    spotsSection
                    auditSection
                    inspectionsSection
                    if !store.allMaterials.isEmpty { materialsCard }
                }
                .padding(.horizontal)
                .padding(.bottom, 24)
            }
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle(job.address.isEmpty ? "Job" : job.address)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                ShareLink(item: shareText) {
                    Image(systemName: "square.and.arrow.up")
                }
            }
        }
        .onAppear { store.startListeningToForms(for: job.id) }
        .refreshable { await store.refreshForms(for: job.id) }
        .sheet(isPresented: $showNewSpotSheet) { newSpotSheet }
    }

    // MARK: - Hero Header

    private var heroHeader: some View {
        VStack(spacing: 0) {
            // Stage color strip
            Rectangle()
                .fill(
                    LinearGradient(
                        colors: [job.currentStage.color, job.currentStage.color.opacity(0.6)],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .frame(height: 3)

            VStack(alignment: .leading, spacing: 10) {
                // Address + badge
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(job.address.isEmpty ? "Untitled" : job.address)
                            .font(.title3.weight(.bold))
                            .lineLimit(2)

                        Text(job.createdAt.formatted(date: .long, time: .omitted))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer(minLength: 12)

                    StageBadge(stage: job.currentStage)
                        .padding(.top, 2)
                }

                // Contact row — name + tappable icons
                if !job.contactName.isEmpty || !job.contactPhone.isEmpty || !job.contactEmail.isEmpty {
                    HStack(spacing: 8) {
                        if !job.contactName.isEmpty {
                            Text(job.contactName)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()

                        if !job.contactPhone.isEmpty,
                           let url = URL(string: "tel:\(job.contactPhone.filter { $0.isNumber })") {
                            Link(destination: url) {
                                Image(systemName: "phone.fill")
                                    .font(.caption)
                                    .foregroundStyle(.blue)
                                    .frame(width: 28, height: 28)
                                    .background(.blue.opacity(0.1), in: .circle)
                            }
                        }

                        if !job.contactEmail.isEmpty,
                           let url = URL(string: "mailto:\(job.contactEmail)") {
                            Link(destination: url) {
                                Image(systemName: "envelope.fill")
                                    .font(.caption)
                                    .foregroundStyle(.blue)
                                    .frame(width: 28, height: 28)
                                    .background(.blue.opacity(0.1), in: .circle)
                            }
                        }
                    }
                }

                if !job.notes.isEmpty {
                    Text(job.notes)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(3)
                }

                // Inline stats row — subtle
                HStack(spacing: 14) {
                    if job.photoCount > 0 {
                        Label("\(job.photoCount) photo\(job.photoCount == 1 ? "" : "s")", systemImage: "photo")
                    }
                    if job.issueCount > 0 {
                        Label("\(job.issueCount) issue\(job.issueCount == 1 ? "" : "s")", systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(.red)
                    }
                    if job.rebateAmount > 0 {
                        Label("$\(job.rebateAmount, specifier: "%.0f")", systemImage: "dollarsign.circle.fill")
                            .foregroundStyle(.green)
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            .padding(DetailDesign.cardPadding)
        }
        .background(.background)
        .clipShape(.rect(cornerRadius: DetailDesign.cardRadius))
        .shadow(color: DetailDesign.shadowColor, radius: DetailDesign.shadowRadius, y: DetailDesign.shadowY)
        .padding(.horizontal)
        .padding(.top, 8)
    }

    // MARK: - Stage Pipeline

    private var stagePipeline: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Progress")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                Spacer()
                Menu {
                    ForEach(JobStage.allCases) { stage in
                        Button {
                            editedStage = stage
                            var updated = job
                            updated.currentStage = stage
                            store.updateJob(updated)
                        } label: {
                            Label(stage.rawValue, systemImage: stage.icon)
                        }
                    }
                } label: {
                    HStack(spacing: 3) {
                        Text("Override")
                            .font(.caption2)
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.system(size: 8))
                    }
                    .foregroundStyle(.tertiary)
                }
            }

            // Pipeline dots
            HStack(spacing: 0) {
                ForEach(Array(pipelineStages.enumerated()), id: \.element.id) { index, stage in
                    let isActive = stageIndex(stage) <= stageIndex(job.currentStage)
                    let isCurrent = stage == job.currentStage

                    VStack(spacing: 5) {
                        ZStack {
                            Circle()
                                .fill(isActive ? stage.color : Color(.systemGray5))
                                .frame(width: isCurrent ? 26 : 20, height: isCurrent ? 26 : 20)
                            Image(systemName: stage.icon)
                                .font(.system(size: isCurrent ? 11 : 9, weight: .bold))
                                .foregroundStyle(isActive ? .white : Color(.systemGray3))
                        }

                        Text(shortStageName(stage))
                            .font(.system(size: 9, weight: isCurrent ? .bold : .medium))
                            .foregroundStyle(isActive ? .primary : .tertiary)
                            .lineLimit(1)
                    }
                    .frame(maxWidth: .infinity)

                    if index < pipelineStages.count - 1 {
                        let filled = stageIndex(pipelineStages[index + 1]) <= stageIndex(job.currentStage)
                        Rectangle()
                            .fill(filled ? stage.color.opacity(0.4) : Color(.systemGray5))
                            .frame(height: 2)
                            .padding(.bottom, 16)
                    }
                }
            }
        }
        .padding(DetailDesign.cardPadding)
        .background(.background, in: .rect(cornerRadius: DetailDesign.cardRadius))
        .shadow(color: DetailDesign.shadowColor, radius: DetailDesign.shadowRadius, y: DetailDesign.shadowY)
    }

    // MARK: - Spots Section (always shown, with add button)

    private var spotsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Spots")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                Spacer()
                Button {
                    showNewSpotSheet = true
                } label: {
                    HStack(spacing: 3) {
                        Image(systemName: "plus")
                            .font(.system(size: 10, weight: .bold))
                        Text("Add")
                            .font(.caption.weight(.semibold))
                    }
                    .foregroundStyle(.orange)
                }
            }

            if job.spots.isEmpty {
                HStack(spacing: 6) {
                    Image(systemName: "mappin.slash")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                    Text("No spots yet — add one to get started")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
                .padding(.vertical, 8)
            } else {
                ForEach(job.spots) { spot in
                    HStack(spacing: 10) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 6)
                                .fill(.orange.opacity(0.1))
                                .frame(width: 28, height: 28)
                            Image(systemName: spot.jobType.icon)
                                .font(.system(size: 11))
                                .foregroundStyle(.orange)
                        }

                        Text(spot.title.isEmpty ? "Untitled" : spot.title)
                            .font(.subheadline.weight(.medium))

                        Spacer()

                        Text(spot.jobType.rawValue)
                            .font(.caption2.weight(.medium))
                            .padding(.horizontal, 7)
                            .padding(.vertical, 3)
                            .background(.orange.opacity(0.08), in: .capsule)
                            .foregroundStyle(.orange)
                    }
                }
            }
        }
        .padding(DetailDesign.cardPadding)
        .background(.background, in: .rect(cornerRadius: DetailDesign.cardRadius))
        .shadow(color: DetailDesign.shadowColor, radius: DetailDesign.shadowRadius, y: DetailDesign.shadowY)
    }

    // MARK: - Audit Section (single, editable)

    private var auditSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 5) {
                Image(systemName: "clipboard.fill")
                    .font(.caption)
                    .foregroundStyle(.blue)
                Text("Audit")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }

            if let audit {
                NavigationLink(destination: FormDetailView(form: audit, job: job, store: store)) {
                    HStack {
                        VStack(alignment: .leading, spacing: 3) {
                            HStack(spacing: 6) {
                                Text(audit.inspectorName.isEmpty ? "Unknown Inspector" : audit.inspectorName)
                                    .font(.subheadline.weight(.medium))
                                    .foregroundStyle(.primary)

                                if audit.issuePhotos.count > 0 {
                                    Text("\(audit.issuePhotos.count) issue\(audit.issuePhotos.count == 1 ? "" : "s")")
                                        .font(.caption2.weight(.medium))
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(.red.opacity(0.1), in: .capsule)
                                        .foregroundStyle(.red)
                                }
                            }

                            HStack(spacing: 10) {
                                Text(audit.date.formatted(date: .abbreviated, time: .omitted))
                                    .font(.caption)
                                    .foregroundStyle(.tertiary)
                                if audit.photoCount > 0 {
                                    Label("\(audit.photoCount)", systemImage: "photo")
                                        .font(.caption)
                                        .foregroundStyle(.tertiary)
                                }
                            }
                        }

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(.tertiary)
                    }
                    .padding(12)
                    .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: DetailDesign.innerRadius))
                }
                .buttonStyle(.plain)
            } else {
                HStack(spacing: 6) {
                    Image(systemName: "camera.fill")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                    Text("Use Quick Capture to start an audit")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
                .padding(.vertical, 8)
            }
        }
        .padding(DetailDesign.cardPadding)
        .background(.background, in: .rect(cornerRadius: DetailDesign.cardRadius))
        .shadow(color: DetailDesign.shadowColor, radius: DetailDesign.shadowRadius, y: DetailDesign.shadowY)
    }

    // MARK: - Inspections Section

    private var inspectionsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 5) {
                Image(systemName: "checkmark.shield.fill")
                    .font(.caption)
                    .foregroundStyle(.orange)
                Text("Inspections")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                Spacer()
                if !inspections.isEmpty {
                    Text("\(inspections.count)")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 1)
                        .background(Color(.tertiarySystemFill), in: .capsule)
                }
            }

            ForEach(inspections) { inspection in
                NavigationLink(destination: FormDetailView(form: inspection, job: job, store: store)) {
                    HStack {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(inspection.inspectorName.isEmpty ? "Unknown Inspector" : inspection.inspectorName)
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(.primary)

                            HStack(spacing: 10) {
                                Text(inspection.date.formatted(date: .abbreviated, time: .omitted))
                                    .font(.caption)
                                    .foregroundStyle(.tertiary)
                                if inspection.fixPhotos.count > 0 {
                                    Label("\(inspection.fixPhotos.count) fix\(inspection.fixPhotos.count == 1 ? "" : "es")", systemImage: "wrench.and.screwdriver")
                                        .font(.caption)
                                        .foregroundStyle(.tertiary)
                                }
                            }
                        }

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(.tertiary)
                    }
                    .padding(12)
                    .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: DetailDesign.innerRadius))
                }
                .buttonStyle(.plain)
            }

            if inspections.isEmpty {
                HStack(spacing: 6) {
                    Image(systemName: "camera.fill")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                    Text("Use Quick Capture to add inspections")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
                .padding(.vertical, 8)
            }
        }
        .padding(DetailDesign.cardPadding)
        .background(.background, in: .rect(cornerRadius: DetailDesign.cardRadius))
        .shadow(color: DetailDesign.shadowColor, radius: DetailDesign.shadowRadius, y: DetailDesign.shadowY)
    }

    // MARK: - Materials Card

    private var materialsCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Materials")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
                Spacer()
                Text("\(store.allMaterials.count)")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 1)
                    .background(Color(.tertiarySystemFill), in: .capsule)
            }

            ForEach(store.allMaterials) { material in
                HStack(spacing: 10) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 6)
                            .fill(material.type.color.opacity(0.1))
                            .frame(width: 28, height: 28)
                        Image(systemName: material.type.icon)
                            .font(.system(size: 11))
                            .foregroundStyle(material.type.color)
                    }

                    VStack(alignment: .leading, spacing: 1) {
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
                                    .foregroundStyle(.green)
                            }
                        }
                    }

                    Spacer()

                    Text(material.type.rawValue)
                        .font(.caption2.weight(.medium))
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(material.type.color.opacity(0.08), in: .capsule)
                        .foregroundStyle(material.type.color)
                }
            }
        }
        .padding(DetailDesign.cardPadding)
        .background(.background, in: .rect(cornerRadius: DetailDesign.cardRadius))
        .shadow(color: DetailDesign.shadowColor, radius: DetailDesign.shadowRadius, y: DetailDesign.shadowY)
    }

    // MARK: - New Spot Sheet

    private var newSpotSheet: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 20) {
                TextField("Spot title (e.g. Kitchen Window)", text: $newSpotTitle)
                    .font(.headline)

                VStack(alignment: .leading, spacing: 8) {
                    Text("JOB TYPE")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(JobType.allCases) { type in
                                Button {
                                    newSpotJobType = type
                                } label: {
                                    HStack(spacing: 4) {
                                        Image(systemName: type.icon)
                                            .font(.caption2)
                                        Text(type.rawValue)
                                            .font(.caption.weight(.medium))
                                    }
                                    .padding(.horizontal, 12)
                                    .frame(height: 34)
                                    .foregroundStyle(newSpotJobType == type ? .white : .primary)
                                    .background(
                                        newSpotJobType == type
                                            ? AnyShapeStyle(.orange)
                                            : AnyShapeStyle(.clear),
                                        in: .capsule
                                    )
                                    .overlay(
                                        Capsule()
                                            .strokeBorder(
                                                newSpotJobType == type ? .clear : Color(.systemGray3),
                                                lineWidth: 1
                                            )
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer()
            }
            .padding()
            .navigationTitle("New Spot")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        showNewSpotSheet = false
                        newSpotTitle = ""
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let spot = Spot(title: newSpotTitle, jobType: newSpotJobType)
                        store.addSpot(spot, to: job)
                        showNewSpotSheet = false
                        newSpotTitle = ""
                    }
                    .disabled(newSpotTitle.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
        .presentationDetents([.height(280)])
    }

    // MARK: - Helpers

    private var pipelineStages: [JobStage] {
        [.auditPending, .workInProgress, .inspectionPending, .completed]
    }

    private func stageIndex(_ stage: JobStage) -> Int {
        switch stage {
        case .auditPending: 0
        case .workInProgress: 1
        case .inspectionPending: 2
        case .completed: 3
        case .cancelled: -1
        }
    }

    private func shortStageName(_ stage: JobStage) -> String {
        switch stage {
        case .auditPending: "Audit"
        case .workInProgress: "Work"
        case .inspectionPending: "Inspect"
        case .completed: "Done"
        case .cancelled: "Cancel"
        }
    }

    // MARK: - Share

    private var shareText: String {
        var text = """
        Job Report
        ========================
        Address: \(job.address)
        Contact: \(job.contactName)
        Phone: \(job.contactPhone)
        Email: \(job.contactEmail)
        Stage: \(job.currentStage.rawValue)
        Rebate: $\(String(format: "%.0f", job.rebateAmount))
        Created: \(job.createdAt.formatted(date: .long, time: .shortened))
        """

        if !job.notes.isEmpty {
            text += "\nNotes: \(job.notes)"
        }

        if !job.spots.isEmpty {
            text += "\n\n--- SPOTS ---"
            for spot in job.spots {
                text += "\n  - \(spot.title) (\(spot.jobType.rawValue))"
            }
        }

        if !store.allMaterials.isEmpty {
            text += "\n\n--- ALL MATERIALS ---"
            for mat in store.allMaterials {
                let costStr = mat.cost.map { " — $\(String(format: "%.2f", $0))" } ?? ""
                text += "\n  - \(mat.name) (\(mat.type.rawValue)) — \(mat.quantity)\(costStr)"
            }
        }

        if let audit {
            text += "\n\n--- AUDIT ---"
            text += formShareText(audit)
        }

        for (i, inspection) in inspections.enumerated() {
            text += "\n\n--- INSPECTION \(i + 1) ---"
            text += formShareText(inspection)
        }

        return text
    }

    private func formShareText(_ form: InspectionForm) -> String {
        var text = "\nInspector: \(form.inspectorName)"
        text += "\nDate: \(form.date.formatted(date: .long, time: .shortened))"

        if !form.notes.isEmpty {
            text += "\nNotes: \(form.notes)"
        }

        if !form.materials.isEmpty {
            text += "\nMaterials:"
            for mat in form.materials {
                let costStr = mat.cost.map { " — $\(String(format: "%.2f", $0))" } ?? ""
                text += "\n  - \(mat.name) (\(mat.type.rawValue)) — \(mat.quantity)\(costStr)"
            }
        }

        if form.formType == .audit {
            for spot in form.spots where !spot.issuePhotos.isEmpty {
                text += "\n\n  Spot: \(spot.title.isEmpty ? "Unknown" : spot.title) (\(spot.jobType.rawValue))"
                for photo in spot.issuePhotos {
                    text += "\n    Issue: \(photo.category.rawValue) (\(photo.severity.rawValue))"
                    if !photo.notes.isEmpty {
                        text += "\n    Notes: \(photo.notes)"
                    }
                }
            }
        } else {
            for spot in form.spots where !spot.fixPhotos.isEmpty {
                text += "\n\n  Spot: \(spot.title.isEmpty ? "Unknown" : spot.title) (\(spot.jobType.rawValue))"
                for photo in spot.fixPhotos {
                    if let linkedId = photo.linkedAuditIssueId,
                       let issue = store.auditIssuePhotos.first(where: { $0.id == linkedId }) {
                        text += "\n    Fixes: \(issue.category.rawValue) (\(issue.severity.rawValue))"
                    }
                    if !photo.resolutionNotes.isEmpty {
                        text += "\n    Resolution: \(photo.resolutionNotes)"
                    }
                }
            }
        }

        return text
    }
}

// MARK: - Form Type Badge

struct FormTypeBadge: View {
    let formType: FormType

    private var color: Color {
        formType == .audit ? .blue : .orange
    }

    private var icon: String {
        formType == .audit ? "clipboard.fill" : "checkmark.shield.fill"
    }

    var body: some View {
        Label(formType.rawValue, systemImage: icon)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color.opacity(0.15), in: .capsule)
            .foregroundStyle(color)
    }
}
