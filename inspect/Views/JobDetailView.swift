import SwiftUI

// MARK: - Job Detail View

struct JobDetailView: View {
    let job: Job
    var store: JobStore

    @State private var editedStage: JobStage
    @State private var rebateText: String
    @State private var showRebateAlert = false
    @State private var showNewSpotSheet = false
    @State private var newSpotTitle = ""
    @State private var newSpotJobType: JobType = .insulation

    /// Live version from the store's listener, falls back to the passed-in snapshot
    private var liveJob: Job {
        store.jobs.first { $0.id == job.id } ?? job
    }

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
                    .padding(.bottom, DS.Spacing.m)

                VStack(spacing: DS.Spacing.s) {
                    stagePipeline
                    spotsSection
                    auditSection
                    inspectionsSection
                    if !store.allMaterials.isEmpty { materialsCard }
                }
                .padding(.horizontal)
                .padding(.bottom, DS.Spacing.xl)
            }
        }
        .background(DS.Colors.background)
        .navigationTitle(liveJob.address.isEmpty ? "Job" : liveJob.address)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                ShareLink(item: shareText) {
                    Image(systemName: "square.and.arrow.up")
                }
            }
        }
        .onAppear { store.startListeningToForms(for: liveJob.id) }
        .refreshable { await store.refreshForms(for: liveJob.id) }
        .sheet(isPresented: $showNewSpotSheet) { newSpotSheet }
        .alert("Rebate Amount", isPresented: $showRebateAlert) {
            TextField("Amount", text: $rebateText)
                .keyboardType(.decimalPad)
            Button("Save") {
                var updated = liveJob
                updated.rebateOutcome = .approved
                updated.rebateAmount = Double(rebateText) ?? 0
                store.updateJob(updated)
            }
            Button("Cancel", role: .cancel) { }
        } message: {
            Text("Enter the approved rebate amount.")
        }
    }

    // MARK: - Hero Header

    private var heroHeader: some View {
        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 14) {
                // Address + badge
                HStack(alignment: .top) {
                    Text(liveJob.address.isEmpty ? "Untitled" : liveJob.address)
                        .font(.title3.weight(.bold))
                        .foregroundStyle(.white)
                        .lineLimit(2)

                    Spacer(minLength: DS.Spacing.s)

                    Text(liveJob.currentStage.rawValue)
                        .font(.caption2.weight(.semibold))
                        .padding(.horizontal, DS.Spacing.xs)
                        .padding(.vertical, 3)
                        .background(.white.opacity(0.2), in: .capsule)
                        .foregroundStyle(.white)
                }

                // Contact row
                if !liveJob.contactName.isEmpty || !liveJob.contactPhone.isEmpty || !liveJob.contactEmail.isEmpty {
                    HStack(spacing: 10) {
                        if !liveJob.contactName.isEmpty {
                            Label(liveJob.contactName, systemImage: "person.fill")
                                .font(.subheadline)
                                .foregroundStyle(.white.opacity(0.85))
                        }

                        Spacer()

                        if !liveJob.contactPhone.isEmpty,
                           let url = URL(string: "tel:\(liveJob.contactPhone.filter { $0.isNumber })") {
                            Link(destination: url) {
                                Image(systemName: "phone.fill")
                                    .font(.caption)
                                    .foregroundStyle(.white)
                                    .frame(width: 30, height: 30)
                                    .background(.white.opacity(0.2), in: .circle)
                            }
                        }

                        if !liveJob.contactEmail.isEmpty,
                           let url = URL(string: "mailto:\(liveJob.contactEmail)") {
                            Link(destination: url) {
                                Image(systemName: "envelope.fill")
                                    .font(.caption)
                                    .foregroundStyle(.white)
                                    .frame(width: 30, height: 30)
                                    .background(.white.opacity(0.2), in: .circle)
                            }
                        }
                    }
                }

                if !liveJob.notes.isEmpty {
                    Text(liveJob.notes)
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.8))
                        .lineLimit(3)
                }

                // Bottom bar: stats left, rebate right
                Rectangle()
                    .fill(.white.opacity(0.2))
                    .frame(height: 1)

                HStack(spacing: 0) {
                    // Stats
                    HStack(spacing: DS.Spacing.s) {
                        if liveJob.photoCount > 0 {
                            Label("\(liveJob.photoCount)", systemImage: "photo")
                        }
                        if liveJob.issueCount > 0 {
                            Label("\(liveJob.issueCount)", systemImage: "exclamationmark.triangle.fill")
                        }
                        if liveJob.fixCount > 0 {
                            Label("\(liveJob.fixCount)", systemImage: "wrench.and.screwdriver.fill")
                        }
                    }
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.8))

                    Spacer()

                    // Rebate outcome pill — tappable menu
                    Menu {
                        ForEach(RebateOutcome.allCases) { outcome in
                            Button {
                                if outcome == .approved {
                                    showRebateAlert = true
                                } else {
                                    var updated = liveJob
                                    updated.rebateOutcome = outcome
                                    updated.rebateAmount = 0
                                    rebateText = ""
                                    store.updateJob(updated)
                                }
                            } label: {
                                if outcome == liveJob.rebateOutcome {
                                    Label(outcome.rawValue, systemImage: "checkmark")
                                } else {
                                    Text(outcome.rawValue)
                                }
                            }
                        }
                    } label: {
                        HStack(spacing: 5) {
                            Circle()
                                .fill(.white)
                                .frame(width: 6, height: 6)
                            if liveJob.rebateOutcome == .approved && liveJob.rebateAmount > 0 {
                                Text("$\(liveJob.rebateAmount, specifier: "%.0f")")
                                    .font(.caption.weight(.bold))
                            }
                            Text(liveJob.rebateOutcome.rawValue)
                                .font(.caption.weight(.medium))
                        }
                        .foregroundStyle(.white.opacity(0.9))
                    }
                }

                Text(liveJob.createdAt.formatted(date: .long, time: .omitted))
                    .font(.caption2)
                    .foregroundStyle(.white.opacity(0.6))
            }
            .padding(DS.Components.cardPadding)
        }
        .background(
            LinearGradient(
                colors: [DS.Colors.primary, DS.Colors.primaryDark],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(.rect(cornerRadius: DS.Radius.card))
        .shadow(color: DS.Colors.primary.opacity(0.3), radius: DS.Shadow.radius, y: DS.Shadow.y)
        .padding(.horizontal)
        .padding(.top, DS.Spacing.xs)
    }

    // MARK: - Stage Pipeline

    private var stagePipeline: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                DSSectionHeader(title: "Progress")
                Spacer()
                Menu {
                    ForEach(JobStage.allCases) { stage in
                        Button {
                            editedStage = stage
                            var updated = liveJob
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
                    let isActive = stageIndex(stage) <= stageIndex(liveJob.currentStage)
                    let isCurrent = stage == liveJob.currentStage

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
                        let filled = stageIndex(pipelineStages[index + 1]) <= stageIndex(liveJob.currentStage)
                        Rectangle()
                            .fill(filled ? stage.color.opacity(0.4) : Color(.systemGray5))
                            .frame(height: 2)
                            .padding(.bottom, DS.Spacing.m)
                    }
                }
            }
        }
        .dsCard()
    }

    // MARK: - Spots Section

    private var spotsSection: some View {
        VStack(alignment: .leading, spacing: DS.Spacing.s) {
            HStack {
                Label {
                    DSSectionHeader(title: "Spots")
                } icon: {
                    Image(systemName: "mappin.and.ellipse")
                        .foregroundStyle(DS.Colors.primary)
                        .font(.subheadline)
                }
                Spacer()
                Button {
                    showNewSpotSheet = true
                } label: {
                    HStack(spacing: DS.Spacing.micro) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 14))
                        Text("Add")
                            .font(.caption.weight(.semibold))
                    }
                    .foregroundStyle(DS.Colors.primary)
                }
            }

            if liveJob.spots.isEmpty {
                HStack(spacing: DS.Spacing.xs) {
                    Image(systemName: "mappin.slash")
                        .font(.subheadline)
                        .foregroundStyle(.tertiary)
                    Text("No spots yet — add one to get started")
                        .font(.subheadline)
                        .foregroundStyle(.tertiary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(DS.Spacing.s)
                .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: DS.Radius.inner))
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: DS.Spacing.xs) {
                        ForEach(liveJob.spots) { spot in
                            VStack(spacing: DS.Spacing.xs) {
                                ZStack {
                                    RoundedRectangle(cornerRadius: DS.Spacing.xs)
                                        .fill(DS.Colors.primary.opacity(0.1))
                                        .frame(width: 44, height: 44)
                                    Image(systemName: spot.jobType.icon)
                                        .font(.system(size: 16, weight: .medium))
                                        .foregroundStyle(DS.Colors.primary)
                                }

                                Text(spot.title.isEmpty ? "Untitled" : spot.title)
                                    .font(.caption.weight(.medium))
                                    .lineLimit(1)

                                Text(spot.jobType.rawValue)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)
                            }
                            .frame(width: 100)
                            .padding(.vertical, DS.Spacing.s)
                            .padding(.horizontal, DS.Spacing.xs)
                            .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: DS.Radius.inner))
                        }
                    }
                }
                .padding(.horizontal, -DS.Components.cardPadding)
                .padding(.horizontal, DS.Components.cardPadding)
            }
        }
        .dsCard()
    }

    // MARK: - Audit Section

    private var auditSection: some View {
        VStack(alignment: .leading, spacing: DS.Spacing.s) {
            HStack {
                Label {
                    DSSectionHeader(title: "Audit")
                } icon: {
                    Image(systemName: "clipboard.fill")
                        .foregroundStyle(DS.Colors.info)
                        .font(.subheadline)
                }
                Spacer()
                if let audit, audit.issuePhotos.count > 0 {
                    Text("\(audit.issuePhotos.count) issue\(audit.issuePhotos.count == 1 ? "" : "s")")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(DS.Colors.error)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(DS.Colors.error.opacity(0.1), in: .capsule)
                }
            }

            if let audit {
                NavigationLink(destination: FormDetailView(form: audit, job: liveJob, store: store)) {
                    HStack(spacing: DS.Spacing.s) {
                        ZStack {
                            RoundedRectangle(cornerRadius: DS.Spacing.xs)
                                .fill(DS.Colors.info.opacity(0.1))
                                .frame(width: 36, height: 36)
                            Image(systemName: "person.fill")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(DS.Colors.info)
                        }

                        VStack(alignment: .leading, spacing: 3) {
                            Text(audit.inspectorName.isEmpty ? "Unknown Inspector" : audit.inspectorName)
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(.primary)

                            HStack(spacing: DS.Spacing.xs) {
                                Label(audit.date.formatted(date: .abbreviated, time: .omitted), systemImage: "calendar")
                                if audit.photoCount > 0 {
                                    Label("\(audit.photoCount) photo\(audit.photoCount == 1 ? "" : "s")", systemImage: "photo")
                                }
                            }
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                        }

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.quaternary)
                    }
                    .padding(DS.Spacing.s)
                    .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: DS.Radius.inner))
                }
                .buttonStyle(.plain)
            } else {
                HStack(spacing: DS.Spacing.xs) {
                    Image(systemName: "camera.fill")
                        .font(.subheadline)
                        .foregroundStyle(.tertiary)
                    Text("Use Quick Capture to start an audit")
                        .font(.subheadline)
                        .foregroundStyle(.tertiary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(DS.Spacing.s)
                .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: DS.Radius.inner))
            }
        }
        .dsCard()
    }

    // MARK: - Inspections Section

    private var inspectionsSection: some View {
        VStack(alignment: .leading, spacing: DS.Spacing.s) {
            HStack {
                Label {
                    DSSectionHeader(title: "Inspections")
                } icon: {
                    Image(systemName: "checkmark.shield.fill")
                        .foregroundStyle(DS.Colors.success)
                        .font(.subheadline)
                }
                Spacer()
                if !inspections.isEmpty {
                    Text("\(inspections.count)")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(Color(.tertiarySystemFill), in: .capsule)
                }
            }

            if inspections.isEmpty {
                HStack(spacing: DS.Spacing.xs) {
                    Image(systemName: "camera.fill")
                        .font(.subheadline)
                        .foregroundStyle(.tertiary)
                    Text("Use Quick Capture to add inspections")
                        .font(.subheadline)
                        .foregroundStyle(.tertiary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(DS.Spacing.s)
                .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: DS.Radius.inner))
            } else {
                VStack(spacing: 6) {
                    ForEach(inspections) { inspection in
                        NavigationLink(destination: FormDetailView(form: inspection, job: liveJob, store: store)) {
                            HStack(spacing: DS.Spacing.s) {
                                ZStack {
                                    RoundedRectangle(cornerRadius: DS.Spacing.xs)
                                        .fill(DS.Colors.success.opacity(0.1))
                                        .frame(width: 36, height: 36)
                                    Image(systemName: "person.fill")
                                        .font(.system(size: 13, weight: .medium))
                                        .foregroundStyle(DS.Colors.success)
                                }

                                VStack(alignment: .leading, spacing: 3) {
                                    Text(inspection.inspectorName.isEmpty ? "Unknown Inspector" : inspection.inspectorName)
                                        .font(.subheadline.weight(.medium))
                                        .foregroundStyle(.primary)

                                    HStack(spacing: DS.Spacing.xs) {
                                        Label(inspection.date.formatted(date: .abbreviated, time: .omitted), systemImage: "calendar")
                                        if inspection.fixPhotos.count > 0 {
                                            Label("\(inspection.fixPhotos.count) fix\(inspection.fixPhotos.count == 1 ? "" : "es")", systemImage: "wrench.and.screwdriver")
                                        }
                                    }
                                    .font(.caption)
                                    .foregroundStyle(.tertiary)
                                }

                                Spacer()

                                Image(systemName: "chevron.right")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(.quaternary)
                            }
                            .padding(DS.Spacing.s)
                            .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: DS.Radius.inner))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .dsCard()
    }

    // MARK: - Materials Card

    private var materialsCard: some View {
        VStack(alignment: .leading, spacing: DS.Spacing.xs) {
            HStack {
                DSSectionHeader(title: "Materials")
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
                        HStack(spacing: DS.Spacing.xs) {
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
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(material.type.color.opacity(0.08), in: .capsule)
                        .foregroundStyle(material.type.color)
                }
            }
        }
        .dsCard()
    }

    // MARK: - New Spot Sheet

    private var newSpotSheet: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: DS.Spacing.l) {
                TextField("Spot title (e.g. Kitchen Window)", text: $newSpotTitle)
                    .font(.headline)

                VStack(alignment: .leading, spacing: DS.Spacing.xs) {
                    Text("JOB TYPE")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: DS.Spacing.xs) {
                            ForEach(JobType.allCases) { type in
                                Button {
                                    newSpotJobType = type
                                } label: {
                                    HStack(spacing: DS.Spacing.micro) {
                                        Image(systemName: type.icon)
                                            .font(.caption2)
                                        Text(type.rawValue)
                                            .font(.caption.weight(.medium))
                                    }
                                    .padding(.horizontal, DS.Spacing.s)
                                    .frame(height: 34)
                                    .foregroundStyle(newSpotJobType == type ? .white : .primary)
                                    .background(
                                        newSpotJobType == type
                                            ? AnyShapeStyle(DS.Colors.primary)
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
                        store.addSpot(spot, to: liveJob)
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

    private var rebateOutcomeColor: Color {
        switch liveJob.rebateOutcome {
        case .pending: DS.Colors.primary
        case .approved: DS.Colors.success
        case .declined: DS.Colors.error
        }
    }

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
        Address: \(liveJob.address)
        Contact: \(liveJob.contactName)
        Phone: \(liveJob.contactPhone)
        Email: \(liveJob.contactEmail)
        Stage: \(liveJob.currentStage.rawValue)
        Rebate: $\(String(format: "%.0f", liveJob.rebateAmount)) (\(liveJob.rebateOutcome.rawValue))
        Created: \(liveJob.createdAt.formatted(date: .long, time: .shortened))
        """

        if !liveJob.notes.isEmpty {
            text += "\nNotes: \(liveJob.notes)"
        }

        if !liveJob.spots.isEmpty {
            text += "\n\n--- SPOTS ---"
            for spot in liveJob.spots {
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

        if !form.allMaterials.isEmpty {
            text += "\nMaterials:"
            for mat in form.allMaterials {
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
