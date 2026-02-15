import SwiftUI
import PhotosUI

// MARK: - Quick Capture View

struct QuickCaptureView: View {
    var store: JobStore
    var locationManager: LocationManager
    var configStore: ConfigStore
    @AppStorage("inspectorName") private var inspectorName = ""

    // Photo state
    @State private var selectedItem: PhotosPickerItem?
    @State private var selectedPhoto: String?
    @State private var displayImage: UIImage?

    // Tagging state
    @State private var selectedJobId: UUID?
    @State private var captureType: FormType = .audit
    @State private var spotId: UUID?
    @State private var category = "Other"
    @State private var severity: IssueSeverity = .major
    @State private var notes = ""
    @State private var linkedAuditIssueId: UUID?
    @State private var resolutionNotes = ""

    // New spot sheet
    @State private var showNewSpotSheet = false
    @State private var newSpotTitle = ""
    @State private var newSpotJobType = "Insulation"
    @State private var localSpots: [Spot] = []

    // Audit issues for fix linkage
    @State private var auditIssuesBySpot: [UUID: [IssuePhoto]] = [:]

    // Materials (inspection only)
    @State private var materials: [Material] = []

    // Save state
    @State private var isSaving = false
    @State private var showSuccess = false
    @State private var savedType: FormType = .audit
    @State private var savedJobAddress = ""
    @State private var errorMessage: String?
    @State private var showError = false

    private var selectedJob: Job? {
        store.jobs.first { $0.id == selectedJobId }
    }

    private var selectedSpot: Spot? {
        localSpots.first { $0.id == spotId }
    }

    private var spotJobType: String {
        selectedSpot?.jobType ?? "Insulation"
    }

    private var issuesAtSpot: [IssuePhoto] {
        guard let spotId else { return [] }
        return auditIssuesBySpot[spotId] ?? []
    }

    var body: some View {
        NavigationStack {
            ZStack {
                if store.jobs.isEmpty {
                    emptyState
                } else if selectedPhoto == nil {
                    capturePhase
                } else {
                    taggingPhase
                }

                if showSuccess {
                    successOverlay
                        .transition(.scale.combined(with: .opacity))
                }
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Quick Capture")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Image("Logo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 36, height: 36)
                        .clipShape(.rect(cornerRadius: 8))
                }
            }
            .alert("Save Error", isPresented: $showError) {
                Button("OK") { }
            } message: {
                Text(errorMessage ?? "An unknown error occurred.")
            }
            .sheet(isPresented: $showNewSpotSheet) {
                newSpotSheet
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "camera.fill")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text("Create a job first")
                .font(.title3.weight(.semibold))
                .foregroundStyle(.secondary)
            Text("You need at least one job before you can capture photos.")
                .font(.subheadline)
                .foregroundStyle(.tertiary)
                .multilineTextAlignment(.center)
        }
        .padding(40)
    }

    // MARK: - Phase 1: Capture

    private var capturePhase: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "camera.viewfinder")
                .font(.system(size: 64))
                .foregroundStyle(DS.Colors.primary)

            Text("Snap a photo, then tag it")
                .font(.title3.weight(.medium))
                .foregroundStyle(.secondary)

            PhotosPicker(selection: $selectedItem, matching: .images) {
                HStack(spacing: 10) {
                    Image(systemName: "camera.fill")
                        .font(.title2)
                    Text("Take / Choose Photo")
                        .font(.headline)
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 60)
                .background(
                    LinearGradient(
                        colors: [DS.Colors.primary, DS.Colors.primary.opacity(0.85)],
                        startPoint: .leading,
                        endPoint: .trailing
                    ),
                    in: .capsule
                )
                .shadow(color: DS.Colors.primary.opacity(0.3), radius: 12, y: 4)
            }
            .padding(.horizontal, 40)
            .onChange(of: selectedItem) { _, newItem in
                importPhoto(from: newItem)
            }

            Spacer()
            Spacer()
        }
        .padding()
    }

    // MARK: - Phase 2: Tagging

    private var taggingPhase: some View {
        ScrollView {
            VStack(spacing: DS.Spacing.l) {
                photoPreviewCard
                jobPickerCard
                typeToggleCard

                if captureType == .audit {
                    issueDetailsCard
                } else {
                    fixDetailsCard
                    materialsCard
                }

                saveButton
            }
            .padding()
        }
        .scrollDismissesKeyboard(.interactively)
    }

    // MARK: - Photo Preview Card

    private var photoPreviewCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label {
                    Text("Photo")
                        .font(.headline)
                } icon: {
                    Image(systemName: "photo.fill")
                        .foregroundStyle(DS.Colors.primary)
                }
                Spacer()
                Button {
                    resetPhoto()
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.counterclockwise")
                        Text("Retake")
                    }
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(DS.Colors.primary)
                }
            }

            if let displayImage {
                Image(uiImage: displayImage)
                    .resizable()
                    .scaledToFill()
                    .frame(maxWidth: .infinity)
                    .frame(height: 200)
                    .clipped()
                    .clipShape(.rect(cornerRadius: 12))
            }
        }
        .dsCard()
    }

    // MARK: - Job Picker Card

    private var jobPickerCard: some View {
        VStack(alignment: .leading, spacing: DS.Spacing.m) {
            Label {
                Text("Job")
                    .font(.headline)
            } icon: {
                Image(systemName: "list.clipboard.fill")
                    .foregroundStyle(DS.Colors.primary)
            }

            Menu {
                ForEach(locationManager.sortedByDistance(store.jobs)) { job in
                    Button {
                        selectJob(job)
                    } label: {
                        Label(job.address.isEmpty ? "Untitled" : job.address, systemImage: "mappin")
                    }
                }
            } label: {
                HStack {
                    Image(systemName: "mappin")
                        .foregroundStyle(DS.Colors.primary)
                    Text(selectedJob?.address ?? "Select Job")
                        .font(.subheadline.weight(.medium))
                    Spacer()
                    Image(systemName: "chevron.up.chevron.down")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                .foregroundStyle(.primary)
                .padding(12)
                .background(Color(.tertiarySystemFill), in: .rect(cornerRadius: 10))
            }
        }
        .dsCard()
    }

    // MARK: - Type Toggle Card

    private var typeToggleCard: some View {
        VStack(alignment: .leading, spacing: DS.Spacing.m) {
            Label {
                Text("Type")
                    .font(.headline)
            } icon: {
                Image(systemName: captureType == .audit ? "clipboard.fill" : "checkmark.shield.fill")
                    .foregroundStyle(captureType == .audit ? DS.Colors.info : DS.Colors.success)
            }

            Picker("Type", selection: $captureType) {
                Text("Issue (Audit)").tag(FormType.audit)
                Text("Fix (Inspection)").tag(FormType.inspection)
            }
            .pickerStyle(.segmented)
            .onChange(of: captureType) { _, newType in
                if newType == .inspection, let job = selectedJob {
                    Task { await loadAuditIssues(for: job) }
                }
            }
        }
        .dsCard()
    }

    // MARK: - Issue Details Card (Audit)

    private var issueDetailsCard: some View {
        VStack(alignment: .leading, spacing: DS.Spacing.m) {
            Label {
                Text("Issue Details")
                    .font(.headline)
            } icon: {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(DS.Colors.primary)
            }

            // Spot picker
            spotPickerSection

            Divider()

            // Category
            VStack(alignment: .leading, spacing: 8) {
                Text("CATEGORY")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)

                Menu {
                    ForEach(configStore.categories(for: spotJobType), id: \.self) { cat in
                        Button(cat) {
                            category = cat
                        }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Text(category)
                            .font(.subheadline.weight(.medium))
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    .foregroundStyle(.primary)
                    .padding(10)
                    .background(Color(.tertiarySystemFill), in: .rect(cornerRadius: 8))
                }
            }

            // Severity pills
            VStack(alignment: .leading, spacing: 8) {
                Text("SEVERITY")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)

                HStack(spacing: 8) {
                    ForEach(IssueSeverity.allCases) { sev in
                        Button {
                            withAnimation(DS.Animation.defaultSpring) {
                                severity = sev
                            }
                        } label: {
                            Text(sev.rawValue)
                                .font(.caption.weight(.semibold))
                                .frame(height: DS.Components.stagePill)
                                .padding(.horizontal, 14)
                                .foregroundStyle(severityTextColor(sev))
                                .background(
                                    severity == sev
                                        ? AnyShapeStyle(sev.color)
                                        : AnyShapeStyle(sev.color.opacity(0.1)),
                                    in: .capsule
                                )
                                .overlay(
                                    Capsule()
                                        .strokeBorder(
                                            severity == sev ? .clear : sev.color.opacity(0.3),
                                            lineWidth: 1
                                        )
                                )
                        }
                        .sensoryFeedback(.selection, trigger: severity == sev)
                    }
                }
            }

            Divider()

            // Notes
            VStack(alignment: .leading, spacing: 8) {
                Text("NOTES")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)

                TextField("Observations for this issue...", text: $notes, axis: .vertical)
                    .lineLimit(2...5)
                    .font(.subheadline)
                    .padding(10)
                    .background(Color(.tertiarySystemFill), in: .rect(cornerRadius: 8))
            }
        }
        .dsCard()
    }

    // MARK: - Fix Details Card (Inspection)

    private var fixDetailsCard: some View {
        VStack(alignment: .leading, spacing: DS.Spacing.m) {
            Label {
                Text("Fix Details")
                    .font(.headline)
            } icon: {
                Image(systemName: "wrench.and.screwdriver.fill")
                    .foregroundStyle(DS.Colors.success)
            }

            // Spot picker
            spotPickerSection

            Divider()

            // Linked audit issue
            VStack(alignment: .leading, spacing: 8) {
                Text("LINKED AUDIT ISSUE")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)

                if issuesAtSpot.isEmpty {
                    Text("No audit issues at this spot")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color(.tertiarySystemFill), in: .rect(cornerRadius: 8))
                } else {
                    Menu {
                        Button("None") {
                            linkedAuditIssueId = nil
                        }
                        Divider()
                        ForEach(issuesAtSpot) { issue in
                            Button {
                                linkedAuditIssueId = issue.id
                            } label: {
                                Label(
                                    "\(issue.category) (\(issue.severity.rawValue))",
                                    systemImage: issue.severity.icon
                                )
                            }
                        }
                    } label: {
                        HStack {
                            if let linkedId = linkedAuditIssueId,
                               let linked = issuesAtSpot.first(where: { $0.id == linkedId }) {
                                Image(systemName: linked.severity.icon)
                                    .foregroundStyle(linked.severity.color)
                                Text(linked.category)
                                    .font(.subheadline.weight(.medium))
                                Text(linked.severity.rawValue)
                                    .font(.caption2.weight(.medium))
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(linked.severity.color.opacity(0.15), in: .capsule)
                                    .foregroundStyle(linked.severity.color)
                            } else {
                                Text("Select audit issue...")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Image(systemName: "chevron.up.chevron.down")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        .foregroundStyle(.primary)
                        .padding(10)
                        .background(Color(.tertiarySystemFill), in: .rect(cornerRadius: 8))
                    }
                }
            }

            Divider()

            // Resolution notes
            VStack(alignment: .leading, spacing: 8) {
                Text("RESOLUTION NOTES")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)

                TextField("How was this fixed?", text: $resolutionNotes, axis: .vertical)
                    .lineLimit(2...5)
                    .font(.subheadline)
                    .padding(10)
                    .background(Color(.tertiarySystemFill), in: .rect(cornerRadius: 8))
            }
        }
        .dsCard()
    }

    // MARK: - Materials Card (Inspection)

    private var materialsCard: some View {
        VStack(alignment: .leading, spacing: DS.Spacing.m) {
            HStack {
                Label {
                    Text("Materials")
                        .font(.headline)
                } icon: {
                    Image(systemName: "shippingbox.fill")
                        .foregroundStyle(.purple)
                }
                Spacer()
                if !materials.isEmpty {
                    Text("\(materials.count)")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color(.tertiarySystemFill), in: .capsule)
                }
            }

            ForEach(Array(materials.enumerated()), id: \.element.id) { index, _ in
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        TextField("Material name", text: $materials[index].name)
                            .font(.subheadline)

                        Button {
                            withAnimation(DS.Animation.defaultSpring) {
                                _ = materials.remove(at: index)
                            }
                        } label: {
                            Image(systemName: "trash")
                                .font(.caption)
                                .foregroundStyle(DS.Colors.error.opacity(0.7))
                        }
                    }

                    HStack(spacing: 8) {
                        TextField("Quantity", text: $materials[index].quantity)
                            .font(.caption)
                            .padding(8)
                            .background(Color(.tertiarySystemFill), in: .rect(cornerRadius: 6))

                        TextField("Cost ($)", value: $materials[index].cost, format: .number)
                            .font(.caption)
                            .keyboardType(.decimalPad)
                            .padding(8)
                            .frame(width: 100)
                            .background(Color(.tertiarySystemFill), in: .rect(cornerRadius: 6))
                    }

                    // Type chips
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(configStore.materialTypes, id: \.self) { type in
                                Button {
                                    materials[index].type = type
                                } label: {
                                    HStack(spacing: 3) {
                                        Image(systemName: MaterialType.icon(for: type))
                                            .font(.caption2)
                                        Text(type)
                                            .font(.caption.weight(.medium))
                                    }
                                    .padding(.horizontal, 10)
                                    .frame(height: 28)
                                    .foregroundStyle(materials[index].type == type ? .white : .primary)
                                    .background(
                                        materials[index].type == type
                                            ? AnyShapeStyle(MaterialType.color(for: type))
                                            : AnyShapeStyle(.clear),
                                        in: .capsule
                                    )
                                    .overlay(
                                        Capsule()
                                            .strokeBorder(
                                                materials[index].type == type ? .clear : Color(.systemGray3),
                                                lineWidth: 1
                                            )
                                    )
                                }
                            }
                        }
                    }
                }
                .padding(10)
                .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 8))
            }

            Button {
                withAnimation(DS.Animation.defaultSpring) {
                    materials.append(Material())
                }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "plus.circle.fill")
                        .font(.caption)
                    Text("Add Material")
                        .font(.subheadline.weight(.medium))
                }
                .foregroundStyle(.purple)
                .frame(maxWidth: .infinity)
                .frame(height: 40)
                .background(.purple.opacity(0.06), in: .rect(cornerRadius: 8))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .strokeBorder(style: StrokeStyle(lineWidth: 1.5, dash: [6, 4]))
                        .foregroundStyle(.purple.opacity(0.2))
                )
            }
        }
        .dsCard()
    }

    // MARK: - Spot Picker Section

    private var spotPickerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("SPOT")
                .font(.caption.weight(.medium))
                .foregroundStyle(.secondary)

            if localSpots.isEmpty {
                Button {
                    showNewSpotSheet = true
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "plus.circle.fill")
                        Text("Add a Spot")
                            .font(.subheadline.weight(.medium))
                    }
                    .foregroundStyle(DS.Colors.primary)
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.tertiarySystemFill), in: .rect(cornerRadius: 8))
                }
            } else {
                Menu {
                    ForEach(localSpots) { spot in
                        Button {
                            spotId = spot.id
                        } label: {
                            Label(spot.title.isEmpty ? "Untitled" : spot.title, systemImage: JobType.icon(for: spot.jobType))
                        }
                    }

                    Divider()

                    Button {
                        showNewSpotSheet = true
                    } label: {
                        Label("New Spot...", systemImage: "plus.circle")
                    }
                } label: {
                    HStack {
                        Image(systemName: selectedSpot.map { JobType.icon(for: $0.jobType) } ?? "mappin")
                            .foregroundStyle(DS.Colors.primary)
                        Text(selectedSpot?.title ?? "Select Spot")
                            .font(.subheadline.weight(.medium))
                        Spacer()
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    .foregroundStyle(.primary)
                    .padding(10)
                    .background(Color(.tertiarySystemFill), in: .rect(cornerRadius: 8))
                }
            }
        }
    }

    // MARK: - Save Button

    private var saveButton: some View {
        VStack(spacing: 12) {
            Button {
                Task { await save() }
            } label: {
                HStack(spacing: 8) {
                    Spacer()
                    if isSaving {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "square.and.arrow.up.fill")
                        Text("Save")
                    }
                    Spacer()
                }
                .font(.headline)
                .foregroundStyle(.white)
                .frame(height: 54)
                .background(
                    LinearGradient(
                        colors: canSave
                            ? [DS.Colors.primary, DS.Colors.primary.opacity(0.85)]
                            : [.gray, .gray.opacity(0.85)],
                        startPoint: .leading,
                        endPoint: .trailing
                    ),
                    in: .capsule
                )
                .shadow(
                    color: canSave ? DS.Colors.primary.opacity(0.3) : .clear,
                    radius: 12,
                    y: 4
                )
            }
            .disabled(!canSave || isSaving)
            .sensoryFeedback(.impact(weight: .medium), trigger: isSaving)
        }
        .padding(.top, 4)
    }

    // MARK: - Success Overlay

    private var successOverlay: some View {
        let isAudit = savedType == .audit
        let accentColor: Color = isAudit ? DS.Colors.primary : DS.Colors.success
        let icon = isAudit ? "exclamationmark.triangle.fill" : "wrench.and.screwdriver.fill"
        let title = isAudit ? "Issue Added" : "Fix Added"

        return VStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(accentColor.opacity(0.15))
                    .frame(width: 80, height: 80)

                Image(systemName: icon)
                    .font(.system(size: 32))
                    .foregroundStyle(accentColor)
            }

            VStack(spacing: 4) {
                Text(title)
                    .font(.title3.weight(.bold))

                Text(savedJobAddress)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            HStack(spacing: 6) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.caption)
                    .foregroundStyle(DS.Colors.success)
                Text("Saved to \(isAudit ? "Audit" : "Inspection") form")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Color(.tertiarySystemFill), in: .capsule)
        }
        .padding(32)
        .background(.ultraThinMaterial, in: .rect(cornerRadius: 24))
        .shadow(color: .black.opacity(0.12), radius: 24, y: 8)
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
                            ForEach(configStore.jobTypes, id: \.self) { type in
                                Button {
                                    newSpotJobType = type
                                } label: {
                                    HStack(spacing: 4) {
                                        Image(systemName: JobType.icon(for: type))
                                            .font(.caption2)
                                        Text(type)
                                            .font(.caption.weight(.medium))
                                    }
                                    .padding(.horizontal, 12)
                                    .frame(height: 36)
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
                                .sensoryFeedback(.selection, trigger: newSpotJobType == type)
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
                        localSpots.append(spot)
                        spotId = spot.id
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

    private var canSave: Bool {
        selectedPhoto != nil && selectedJobId != nil && spotId != nil
    }

    private func severityTextColor(_ sev: IssueSeverity) -> Color {
        if severity == sev {
            return sev == .minor ? .black : .white
        }
        return sev.color
    }

    private func selectJob(_ job: Job) {
        selectedJobId = job.id
        localSpots = job.spots
        spotId = job.spots.first?.id
        linkedAuditIssueId = nil
        if captureType == .inspection {
            Task { await loadAuditIssues(for: job) }
        }
    }

    private func loadAuditIssues(for job: Job) async {
        let forms = await store.fetchForms(for: job.id)
        var bySpot: [UUID: [IssuePhoto]] = [:]
        for form in forms where form.formType == .audit {
            for spot in form.spots {
                bySpot[spot.id, default: []].append(contentsOf: spot.issuePhotos)
            }
        }
        auditIssuesBySpot = bySpot
    }

    private func importPhoto(from item: PhotosPickerItem?) {
        guard let item else { return }
        Task {
            if let data = try? await item.loadTransferable(type: Data.self) {
                let filename = store.saveTempPhoto(data)
                selectedPhoto = filename
                displayImage = store.loadTempImage(named: filename)
                // Auto-select first job if none selected
                if selectedJobId == nil, let first = locationManager.sortedByDistance(store.jobs).first {
                    selectJob(first)
                }
            }
            selectedItem = nil
        }
    }

    private func resetPhoto() {
        selectedPhoto = nil
        displayImage = nil
        selectedItem = nil
    }

    private func resetAll() {
        resetPhoto()
        captureType = .audit
        spotId = nil
        category = "Other"
        severity = .major
        notes = ""
        linkedAuditIssueId = nil
        resolutionNotes = ""
        auditIssuesBySpot = [:]
        materials = []
    }

    // MARK: - Save

    private func save() async {
        guard let photo = selectedPhoto,
              let job = selectedJob,
              let spotId else { return }

        isSaving = true
        defer { isSaving = false }

        do {
            // Upload photo
            guard let imageData = store.loadTempPhotoData(named: photo) else {
                throw NSError(domain: "QuickCapture", code: 1,
                              userInfo: [NSLocalizedDescriptionKey: "Could not load photo data."])
            }

            // We need a form ID for the upload path — fetch or create inline
            let forms = await store.fetchForms(for: job.id)
            let existingForm: InspectionForm?
            let formId: UUID

            if captureType == .audit {
                existingForm = forms.first { $0.formType == .audit }
            } else {
                existingForm = forms.first { $0.formType == .inspection }
            }
            formId = existingForm?.id ?? UUID()

            let photoId = UUID()
            let downloadURL = try await store.uploadPhoto(
                imageData: imageData,
                jobId: job.id,
                formId: formId,
                photoId: photoId
            )

            // Persist new spots to job if we added any
            var updatedJob = job
            updatedJob.spots = localSpots
            if updatedJob.spots != job.spots {
                store.updateJob(updatedJob)
            }

            if captureType == .audit {
                let issuePhoto = IssuePhoto(
                    id: photoId,
                    photoURL: downloadURL,
                    category: category,
                    severity: severity,
                    notes: notes
                )
                if var form = existingForm {
                    form.appendIssuePhoto(issuePhoto, toSpot: spotId, availableSpots: updatedJob.spots)
                    store.updateForm(form, in: updatedJob)
                } else {
                    var newForm = InspectionForm(id: formId, formType: .audit, inspectorName: inspectorName, date: Date())
                    newForm.appendIssuePhoto(issuePhoto, toSpot: spotId, availableSpots: updatedJob.spots)
                    store.addForm(newForm, to: updatedJob)
                }
            } else {
                let fixPhoto = FixPhoto(
                    id: photoId,
                    linkedAuditIssueId: linkedAuditIssueId,
                    photoURL: downloadURL,
                    resolutionNotes: resolutionNotes
                )
                let validMaterials = materials.filter { !$0.name.trimmingCharacters(in: .whitespaces).isEmpty }
                if var form = existingForm {
                    form.appendFixPhoto(fixPhoto, toSpot: spotId, availableSpots: updatedJob.spots)
                    form.appendMaterials(validMaterials, toSpot: spotId, availableSpots: updatedJob.spots)
                    store.updateForm(form, in: updatedJob)
                } else {
                    var newForm = InspectionForm(id: formId, formType: .inspection, inspectorName: inspectorName, date: Date())
                    newForm.appendFixPhoto(fixPhoto, toSpot: spotId, availableSpots: updatedJob.spots)
                    newForm.appendMaterials(validMaterials, toSpot: spotId, availableSpots: updatedJob.spots)
                    store.addForm(newForm, to: updatedJob)
                }
            }

            store.cleanupTempPhotos()

            // Capture info for overlay before resetting
            savedType = captureType
            savedJobAddress = job.address

            // Show success
            withAnimation(DS.Animation.defaultSpring) {
                showSuccess = true
            }

            DispatchQueue.main.asyncAfter(deadline: .now() + 1.8) {
                withAnimation(DS.Animation.defaultSpring) {
                    showSuccess = false
                }
                resetAll()
            }
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }
}
