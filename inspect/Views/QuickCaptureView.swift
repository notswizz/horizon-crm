import SwiftUI
import UIKit
import PhotosUI

// MARK: - Camera Picker (UIImagePickerController wrapper)

struct CameraPickerView: UIViewControllerRepresentable {
    var onCapture: (UIImage) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraPickerView
        init(_ parent: CameraPickerView) { self.parent = parent }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage {
                parent.onCapture(image)
            }
            parent.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}

// MARK: - Quick Capture View

struct QuickCaptureView: View {
    var store: JobStore
    var locationManager: LocationManager
    var configStore: ConfigStore
    var networkMonitor: NetworkMonitor
    var photoSyncQueue: PhotoSyncQueue
    @AppStorage("inspectorName") private var inspectorName = ""

    // Photo state
    @State private var selectedItem: PhotosPickerItem?
    @State private var selectedPhoto: String?
    @State private var displayImage: UIImage?
    @State private var showCamera = false

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

    // Step state (0 = job+type, 1 = spot+details, 2 = materials+save)
    @State private var taggingStep = 0

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
        VStack(spacing: 0) {
            SyncBanner(networkMonitor: networkMonitor, syncQueue: photoSyncQueue, jobStore: store)

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
            .frame(maxHeight: .infinity)
        }
        .background(Color(.systemGroupedBackground))
        .alert("Save Error", isPresented: $showError) {
            Button("OK") { }
        } message: {
            Text(errorMessage ?? "An unknown error occurred.")
        }
        .sheet(isPresented: $showNewSpotSheet) {
            newSpotSheet
        }
        .fullScreenCover(isPresented: $showCamera) {
            CameraPickerView { image in
                importCameraImage(image)
            }
            .ignoresSafeArea()
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
        VStack(spacing: 0) {
            Spacer()

            // Hero illustration
            ZStack {
                Circle()
                    .fill(DS.Colors.primary.opacity(0.08))
                    .frame(width: 160, height: 160)

                Circle()
                    .fill(DS.Colors.primary.opacity(0.12))
                    .frame(width: 110, height: 110)

                Image(systemName: "camera.fill")
                    .font(.system(size: 44, weight: .medium))
                    .foregroundStyle(DS.Colors.primary)
            }
            .padding(.bottom, 24)

            Text("Capture & Tag")
                .font(.title2.weight(.bold))
                .padding(.bottom, 36)

            // Two action buttons
            VStack(spacing: 12) {
                // Camera button
                Button {
                    if UIImagePickerController.isSourceTypeAvailable(.camera) {
                        showCamera = true
                    }
                } label: {
                    HStack(spacing: 12) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 10)
                                .fill(.white.opacity(0.2))
                                .frame(width: 40, height: 40)
                            Image(systemName: "camera.fill")
                                .font(.title3)
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Take Photo")
                                .font(.headline)
                            Text("Open camera")
                                .font(.caption)
                                .opacity(0.8)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.subheadline.weight(.semibold))
                            .opacity(0.6)
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .frame(height: 68)
                    .background(
                        LinearGradient(
                            colors: [DS.Colors.primary, DS.Colors.primaryDark],
                            startPoint: .leading,
                            endPoint: .trailing
                        ),
                        in: .rect(cornerRadius: 16)
                    )
                    .shadow(color: DS.Colors.primary.opacity(0.35), radius: 12, y: 6)
                }

                // Library button
                PhotosPicker(selection: $selectedItem, matching: .images) {
                    HStack(spacing: 12) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 10)
                                .fill(DS.Colors.primary.opacity(0.1))
                                .frame(width: 40, height: 40)
                            Image(systemName: "photo.on.rectangle")
                                .font(.title3)
                                .foregroundStyle(DS.Colors.primary)
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Choose from Library")
                                .font(.headline)
                            Text("Pick an existing photo")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.tertiary)
                    }
                    .foregroundStyle(.primary)
                    .padding(.horizontal, 16)
                    .frame(height: 68)
                    .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 16))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .strokeBorder(Color(.separator).opacity(0.3), lineWidth: 1)
                    )
                }
                .onChange(of: selectedItem) { _, newItem in
                    importPhoto(from: newItem)
                }
            }
            .padding(.horizontal, 24)

            Spacer()
            Spacer()

            // Job count hint
            HStack(spacing: 6) {
                Image(systemName: "briefcase.fill")
                    .font(.caption2)
                    .foregroundStyle(DS.Colors.primary)
                Text("\(store.jobs.count) jobs available")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(Color(.tertiarySystemFill), in: .capsule)
            .padding(.bottom, 8)
        }
        .padding()
    }

    // MARK: - Phase 2: Tagging (multi-step)

    private var totalSteps: Int {
        captureType == .inspection ? 3 : 2
    }

    private var taggingPhase: some View {
        VStack(spacing: 0) {
            compactPhotoPreview
            stepIndicator

            // Step content
            Group {
                switch taggingStep {
                case 0: step0JobAndType
                case 1: step1SpotAndDetails
                default: step2MaterialsAndSave
                }
            }
            .transition(.asymmetric(
                insertion: .move(edge: .trailing).combined(with: .opacity),
                removal: .move(edge: .leading).combined(with: .opacity)
            ))

            Spacer(minLength: 0)

            // Navigation bar
            stepNavigation
        }
    }

    // MARK: - Compact Photo Preview (sticky)

    private var compactPhotoPreview: some View {
        HStack(spacing: 12) {
            if let displayImage {
                Image(uiImage: displayImage)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 80, height: 80)
                    .clipShape(.rect(cornerRadius: 10))
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Photo captured")
                    .font(.subheadline.weight(.semibold))
                Text(stepSubtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Button {
                taggingStep = 0
                resetPhoto()
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "arrow.counterclockwise")
                    Text("Retake")
                }
                .font(.caption.weight(.semibold))
                .foregroundStyle(DS.Colors.primary)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(DS.Colors.primary.opacity(0.1), in: .capsule)
            }
        }
        .padding(DS.Spacing.m)
        .frame(height: 120)
        .background(DS.Colors.surface)
        .overlay(alignment: .bottom) {
            Divider()
        }
    }

    private var stepSubtitle: String {
        switch taggingStep {
        case 0: return "Step 1: Select job & type"
        case 1: return "Step 2: Spot & details"
        default: return "Step 3: Materials & save"
        }
    }

    // MARK: - Step Indicator

    private var stepIndicator: some View {
        HStack(spacing: 0) {
            stepDot(index: 0, label: "Job")
            stepLine(filled: taggingStep >= 1)
            stepDot(index: 1, label: "Details")
            if captureType == .inspection {
                stepLine(filled: taggingStep >= 2)
                stepDot(index: 2, label: "Materials")
            }
        }
        .padding(.horizontal, DS.Spacing.xl)
        .padding(.vertical, DS.Spacing.s)
        .background(DS.Colors.surface)
        .overlay(alignment: .bottom) {
            Divider()
        }
        .animation(DS.Animation.defaultSpring, value: captureType)
    }

    private func stepDot(index: Int, label: String) -> some View {
        let isCurrent = taggingStep == index
        let isDone = taggingStep > index

        return VStack(spacing: 4) {
            ZStack {
                Circle()
                    .fill(isCurrent ? DS.Colors.primary : isDone ? DS.Colors.primary : Color(.systemGray4))
                    .frame(width: isCurrent ? 10 : 8, height: isCurrent ? 10 : 8)

                if isDone {
                    Image(systemName: "checkmark")
                        .font(.system(size: 5, weight: .bold))
                        .foregroundStyle(.white)
                }
            }
            Text(label)
                .font(.system(size: 9, weight: isCurrent ? .bold : .medium))
                .foregroundStyle(isCurrent || isDone ? DS.Colors.primary : .secondary)
        }
    }

    private func stepLine(filled: Bool) -> some View {
        Rectangle()
            .fill(filled ? DS.Colors.primary : Color(.systemGray4))
            .frame(height: 2)
            .padding(.bottom, 14)
    }

    // MARK: - Step 0: Job + Type

    private var step0JobAndType: some View {
        ScrollView {
            VStack(spacing: DS.Spacing.l) {
                jobPickerCard
                typeToggleCard
            }
            .padding()
        }
        .scrollDismissesKeyboard(.interactively)
    }

    // MARK: - Step 1: Spot + Details

    private var step1SpotAndDetails: some View {
        ScrollView {
            VStack(spacing: DS.Spacing.l) {
                if captureType == .audit {
                    issueDetailsCard
                } else {
                    fixDetailsCard
                }
            }
            .padding()
        }
        .scrollDismissesKeyboard(.interactively)
    }

    // MARK: - Step 2: Materials + Save (inspection only)

    private var step2MaterialsAndSave: some View {
        ScrollView {
            VStack(spacing: DS.Spacing.l) {
                materialsCard
            }
            .padding()
        }
        .scrollDismissesKeyboard(.interactively)
    }

    // MARK: - Step Navigation

    private var canAdvanceStep0: Bool {
        selectedJobId != nil
    }

    private var canAdvanceStep1: Bool {
        spotId != nil
    }

    private var stepNavigation: some View {
        HStack(spacing: 12) {
            // Back button
            if taggingStep > 0 {
                Button {
                    withAnimation(DS.Animation.defaultSpring) {
                        taggingStep -= 1
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "chevron.left")
                            .font(.caption.weight(.semibold))
                        Text("Back")
                    }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.primary)
                    .frame(height: 50)
                    .frame(maxWidth: .infinity)
                    .background(Color(.tertiarySystemFill), in: .rect(cornerRadius: 14))
                }
            }

            // Next / Save button
            let isLastStep = taggingStep == totalSteps - 1
            let canAdvance: Bool = {
                switch taggingStep {
                case 0: return canAdvanceStep0
                case 1: return canAdvanceStep1
                default: return canSave
                }
            }()

            Button {
                if isLastStep {
                    Task { await save() }
                } else {
                    withAnimation(DS.Animation.defaultSpring) {
                        taggingStep += 1
                    }
                }
            } label: {
                HStack(spacing: 6) {
                    if isSaving {
                        ProgressView()
                            .tint(.white)
                    } else if isLastStep {
                        Image(systemName: "square.and.arrow.up.fill")
                            .font(.caption)
                        Text("Save")
                    } else {
                        Text("Next")
                        Image(systemName: "chevron.right")
                            .font(.caption.weight(.semibold))
                    }
                }
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white)
                .frame(height: 50)
                .frame(maxWidth: .infinity)
                .background(
                    canAdvance
                        ? DS.Colors.primary
                        : Color(.systemGray3),
                    in: .rect(cornerRadius: 14)
                )
            }
            .disabled(!canAdvance || isSaving)
            .sensoryFeedback(.impact(weight: .medium), trigger: isSaving)
        }
        .padding(.horizontal, DS.Spacing.m)
        .padding(.vertical, DS.Spacing.s)
        .background(DS.Colors.surface)
        .overlay(alignment: .top) {
            Divider()
        }
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

    private func importCameraImage(_ image: UIImage) {
        guard let data = image.jpegData(compressionQuality: 0.85) else { return }
        let filename = store.saveTempPhoto(data)
        selectedPhoto = filename
        displayImage = store.loadTempImage(named: filename)
        if selectedJobId == nil, let first = locationManager.sortedByDistance(store.jobs).first {
            selectJob(first)
        }
    }

    private func resetPhoto() {
        selectedPhoto = nil
        displayImage = nil
        selectedItem = nil
    }

    private func resetAll() {
        resetPhoto()
        taggingStep = 0
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
            guard let imageData = store.loadTempPhotoData(named: photo) else {
                throw NSError(domain: "QuickCapture", code: 1,
                              userInfo: [NSLocalizedDescriptionKey: "Could not load photo data."])
            }

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
            let storagePath = "jobs/\(job.id.uuidString)/\(formId.uuidString)/\(photoId.uuidString)/photo.jpg"
            let downloadURL: String

            if networkMonitor.isConnected {
                // Online: upload directly
                downloadURL = try await store.uploadPhoto(
                    imageData: imageData,
                    jobId: job.id,
                    formId: formId,
                    photoId: photoId
                )
            } else {
                // Offline: enqueue for later upload, use pending placeholder
                let photoType: PendingUpload.PhotoType = captureType == .audit ? .issue : .fix
                _ = photoSyncQueue.enqueue(
                    imageData: imageData,
                    jobId: job.id,
                    formId: formId,
                    photoId: photoId,
                    storagePath: storagePath,
                    photoType: photoType,
                    spotId: spotId
                )
                downloadURL = "pending://\(photoId.uuidString)"
            }

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

            savedType = captureType
            savedJobAddress = job.address

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
