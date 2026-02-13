import SwiftUI

// MARK: - Design Tokens (local)

private enum FormDesign {
    static let cardRadius: CGFloat = 16
    static let cardPadding: CGFloat = 20
    static let shadowColor = Color.black.opacity(0.06)
    static let shadowRadius: CGFloat = 12
    static let shadowY: CGFloat = 4
    static let sectionSpacing: CGFloat = 20
    static let innerSpacing: CGFloat = 16
    static let spring = Animation.spring(response: 0.35, dampingFraction: 0.8)
    static let chipHeight: CGFloat = 36
    static let severityPillHeight: CGFloat = 32
}

// MARK: - Focus Fields

private enum FormField: Hashable {
    case inspector
    case notes
    case issueNotes(UUID)
    case resolutionNotes(UUID)
    case materialName(UUID)
    case materialQuantity(UUID)
    case newSpotTitle
}

// MARK: - Card Transition

private extension AnyTransition {
    static var cardTransition: AnyTransition {
        .asymmetric(
            insertion: .scale(scale: 0.9).combined(with: .opacity),
            removal: .scale(scale: 0.95).combined(with: .opacity)
        )
    }
}

// MARK: - New Form View

struct NewFormView: View {
    let job: Job
    let formType: FormType
    var store: JobStore

    @Environment(\.dismiss) private var dismiss
    @AppStorage("inspectorName") private var savedInspectorName = ""
    @State private var form: InspectionForm
    @State private var isSaving = false
    @State private var saveProgress = ""
    @State private var errorMessage: String?
    @State private var showError = false
    @State private var showNewSpotSheet = false
    @State private var newSpotTitle = ""
    @State private var newSpotJobType: JobType = .insulation
    @State private var pendingSpotCallback: ((Spot) -> Void)?
    @State private var localSpots: [Spot]
    @FocusState private var focusedField: FormField?

    init(job: Job, formType: FormType, store: JobStore) {
        self.job = job
        self.formType = formType
        self.store = store
        self._form = State(initialValue: InspectionForm(formType: formType))
        self._localSpots = State(initialValue: job.spots)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: FormDesign.sectionSpacing) {
                formDetailsCard

                if formType == .audit {
                    issuePhotosSection
                    addIssuePhotoButton
                } else {
                    fixPhotosSection
                    addFixPhotoButton
                }

                materialsSection
                addMaterialButton
                actionButtons
            }
            .padding()
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Color(.systemGroupedBackground))
        .navigationTitle("New \(formType.rawValue)")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Save Error", isPresented: $showError) {
            Button("OK") { }
        } message: {
            Text(errorMessage ?? "An unknown error occurred.")
        }
        .sheet(isPresented: $showNewSpotSheet) {
            newSpotSheet
        }
        .onAppear {
            if form.inspectorName.isEmpty && !savedInspectorName.isEmpty {
                form.inspectorName = savedInspectorName
            }
        }
    }

    // MARK: - Form Details Card

    private var formDetailsCard: some View {
        VStack(alignment: .leading, spacing: FormDesign.innerSpacing) {
            Label {
                Text("\(formType.rawValue) Details")
                    .font(.headline)
            } icon: {
                Image(systemName: formType == .audit ? "clipboard.fill" : "checkmark.shield.fill")
                    .foregroundStyle(formType == .audit ? .blue : .orange)
            }

            // Job address (read-only context)
            HStack(spacing: 12) {
                Image(systemName: "mappin")
                    .font(.body)
                    .foregroundStyle(.orange)
                    .frame(width: 24, alignment: .center)
                VStack(alignment: .leading, spacing: 2) {
                    Text("JOB ADDRESS")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)
                    Text(job.address)
                        .font(.subheadline)
                        .foregroundStyle(.primary)
                }
            }

            Divider().padding(.leading, 36)

            StyledTextField(
                icon: "person.fill",
                label: "INSPECTOR",
                placeholder: "Inspector name",
                text: $form.inspectorName,
                contentType: .name
            )
            .focused($focusedField, equals: .inspector)

            Divider().padding(.leading, 36)

            StyledTextField(
                icon: "note.text",
                label: "NOTES",
                placeholder: "Additional notes",
                text: $form.notes,
                axis: .vertical,
                lineLimit: 2...5
            )
            .focused($focusedField, equals: .notes)
        }
        .cardStyle()
    }

    // MARK: - Issue Photos Section (Audit)

    private var issuePhotosSection: some View {
        ForEach(Array(form.issuePhotos.enumerated()), id: \.element.id) { index, _ in
            IssuePhotoCard(
                issuePhoto: $form.issuePhotos[index],
                spots: localSpots,
                number: index + 1,
                store: store,
                focusedField: $focusedField,
                onRequestNewSpot: { callback in
                    pendingSpotCallback = callback
                    showNewSpotSheet = true
                },
                onDelete: {
                    withAnimation(FormDesign.spring) {
                        _ = form.issuePhotos.remove(at: index)
                    }
                }
            )
            .transition(.cardTransition)
        }
    }

    // MARK: - Add Issue Photo Button

    private var addIssuePhotoButton: some View {
        Button {
            withAnimation(FormDesign.spring) {
                let spotId = localSpots.first?.id ?? UUID()
                form.issuePhotos.append(IssuePhoto(spotId: spotId))
            }
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "plus.circle.fill")
                    .font(.title3)
                Text("Add Issue Photo")
                    .font(.headline)
            }
            .foregroundStyle(.orange)
            .frame(maxWidth: .infinity)
            .frame(height: 80)
            .background(.orange.opacity(0.04), in: .rect(cornerRadius: FormDesign.cardRadius))
            .overlay(
                RoundedRectangle(cornerRadius: FormDesign.cardRadius)
                    .strokeBorder(
                        style: StrokeStyle(lineWidth: 2, dash: [8, 6])
                    )
                    .foregroundStyle(.orange.opacity(0.25))
            )
        }
    }

    // MARK: - Fix Photos Section (Inspection)

    private var fixPhotosSection: some View {
        ForEach(Array(form.fixPhotos.enumerated()), id: \.element.id) { index, _ in
            FixPhotoCard(
                fixPhoto: $form.fixPhotos[index],
                spots: localSpots,
                auditIssuePhotos: store.auditIssuePhotos,
                allSpots: localSpots,
                number: index + 1,
                store: store,
                focusedField: $focusedField,
                onRequestNewSpot: { callback in
                    pendingSpotCallback = callback
                    showNewSpotSheet = true
                },
                onDelete: {
                    withAnimation(FormDesign.spring) {
                        _ = form.fixPhotos.remove(at: index)
                    }
                }
            )
            .transition(.cardTransition)
        }
    }

    // MARK: - Add Fix Photo Button

    private var addFixPhotoButton: some View {
        Button {
            withAnimation(FormDesign.spring) {
                let spotId = localSpots.first?.id ?? UUID()
                form.fixPhotos.append(FixPhoto(spotId: spotId))
            }
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "plus.circle.fill")
                    .font(.title3)
                Text("Add Fix Photo")
                    .font(.headline)
            }
            .foregroundStyle(.green)
            .frame(maxWidth: .infinity)
            .frame(height: 80)
            .background(.green.opacity(0.04), in: .rect(cornerRadius: FormDesign.cardRadius))
            .overlay(
                RoundedRectangle(cornerRadius: FormDesign.cardRadius)
                    .strokeBorder(
                        style: StrokeStyle(lineWidth: 2, dash: [8, 6])
                    )
                    .foregroundStyle(.green.opacity(0.25))
            )
        }
    }

    // MARK: - New Spot Sheet

    private var newSpotSheet: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 20) {
                TextField("Spot title (e.g. Kitchen Window)", text: $newSpotTitle)
                    .font(.headline)
                    .focused($focusedField, equals: .newSpotTitle)

                VStack(alignment: .leading, spacing: 8) {
                    Text("JOB TYPE")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(JobType.allCases) { type in
                                JobTypeChip(
                                    type: type,
                                    isSelected: newSpotJobType == type
                                ) {
                                    newSpotJobType = type
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
                        pendingSpotCallback = nil
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") {
                        let spot = Spot(title: newSpotTitle, jobType: newSpotJobType)
                        localSpots.append(spot)
                        pendingSpotCallback?(spot)
                        pendingSpotCallback = nil
                        showNewSpotSheet = false
                        newSpotTitle = ""
                    }
                    .disabled(newSpotTitle.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
        .presentationDetents([.height(280)])
    }

    // MARK: - Materials Section

    private var materialsSection: some View {
        VStack(alignment: .leading, spacing: FormDesign.innerSpacing) {
            HStack {
                Label {
                    Text("Materials")
                        .font(.headline)
                } icon: {
                    Image(systemName: "shippingbox.fill")
                        .foregroundStyle(.orange)
                }
                Spacer()
                if !form.materials.isEmpty {
                    Text("\(form.materials.count)")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color(.tertiarySystemFill), in: .capsule)
                }
            }

            ForEach(Array(form.materials.enumerated()), id: \.element.id) { index, _ in
                MaterialEntryCard(
                    material: $form.materials[index],
                    focusedField: $focusedField,
                    onDelete: {
                        withAnimation(FormDesign.spring) {
                            _ = form.materials.remove(at: index)
                        }
                    }
                )
                .transition(.cardTransition)
            }
        }
        .cardStyle()
    }

    // MARK: - Add Material Button

    private var addMaterialButton: some View {
        Button {
            withAnimation(FormDesign.spring) {
                form.materials.append(Material())
            }
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "plus.circle.fill")
                    .font(.title3)
                Text("Add Material")
                    .font(.headline)
            }
            .foregroundStyle(.purple)
            .frame(maxWidth: .infinity)
            .frame(height: 60)
            .background(.purple.opacity(0.04), in: .rect(cornerRadius: FormDesign.cardRadius))
            .overlay(
                RoundedRectangle(cornerRadius: FormDesign.cardRadius)
                    .strokeBorder(
                        style: StrokeStyle(lineWidth: 2, dash: [8, 6])
                    )
                    .foregroundStyle(.purple.opacity(0.25))
            )
        }
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        VStack(spacing: 12) {
            Button {
                Task { await saveForm() }
            } label: {
                HStack(spacing: 8) {
                    Spacer()
                    if isSaving {
                        VStack(spacing: 4) {
                            ProgressView()
                                .tint(.white)
                            if !saveProgress.isEmpty {
                                Text(saveProgress)
                                    .font(.caption)
                            }
                        }
                    } else {
                        Image(systemName: "square.and.arrow.up.fill")
                        Text("Save \(formType.rawValue)")
                    }
                    Spacer()
                }
                .font(.headline)
                .foregroundStyle(.white)
                .frame(height: 54)
                .background(
                    LinearGradient(
                        colors: [.orange, .orange.opacity(0.85)],
                        startPoint: .leading,
                        endPoint: .trailing
                    ),
                    in: .capsule
                )
                .shadow(color: .orange.opacity(0.3), radius: 12, y: 4)
            }
            .disabled(isSaving)
            .sensoryFeedback(.impact(weight: .medium), trigger: isSaving)
        }
        .padding(.top, 4)
    }

    // MARK: - Save Action

    private func saveForm() async {
        isSaving = true
        defer { isSaving = false; saveProgress = "" }

        do {
            var updatedForm = form

            // Validate and filter materials
            updatedForm.materials = updatedForm.materials.filter { !$0.name.trimmingCharacters(in: .whitespaces).isEmpty }

            // Persist new spots to job
            var updatedJob = job
            updatedJob.spots = localSpots

            // Upload issue photos
            let issuePhotosToUpload = updatedForm.issuePhotos.filter { $0.photoURL != nil }
            let fixPhotosToUpload = updatedForm.fixPhotos.filter { $0.photoURL != nil }
            let totalUploads = issuePhotosToUpload.count + fixPhotosToUpload.count
            if totalUploads > 0 {
                saveProgress = "Uploading photos..."
            }

            for i in updatedForm.issuePhotos.indices {
                let photo = updatedForm.issuePhotos[i]
                if let ref = photo.photoURL, !ref.hasPrefix("http") {
                    if let data = store.loadTempPhotoData(named: ref) {
                        let url = try await store.uploadPhoto(
                            imageData: data,
                            jobId: job.id,
                            formId: updatedForm.id,
                            photoId: photo.id
                        )
                        updatedForm.issuePhotos[i].photoURL = url
                    }
                }
            }

            for i in updatedForm.fixPhotos.indices {
                let photo = updatedForm.fixPhotos[i]
                if let ref = photo.photoURL, !ref.hasPrefix("http") {
                    if let data = store.loadTempPhotoData(named: ref) {
                        let url = try await store.uploadPhoto(
                            imageData: data,
                            jobId: job.id,
                            formId: updatedForm.id,
                            photoId: photo.id
                        )
                        updatedForm.fixPhotos[i].photoURL = url
                    }
                }
            }

            saveProgress = "Saving..."

            // Save spots to job, then save form
            store.updateJob(updatedJob)
            store.addForm(updatedForm, to: updatedJob)
            store.cleanupTempPhotos()

            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }
}

// MARK: - Spot Picker Menu

private struct SpotPicker: View {
    let spots: [Spot]
    @Binding var selectedSpotId: UUID
    var onRequestNewSpot: (@escaping (Spot) -> Void) -> Void

    private var selectedSpot: Spot? {
        spots.first { $0.id == selectedSpotId }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("SPOT")
                .font(.caption.weight(.medium))
                .foregroundStyle(.secondary)

            Menu {
                ForEach(spots) { spot in
                    Button {
                        selectedSpotId = spot.id
                    } label: {
                        Label(spot.title.isEmpty ? "Untitled" : spot.title, systemImage: spot.jobType.icon)
                    }
                }

                Divider()

                Button {
                    onRequestNewSpot { newSpot in
                        selectedSpotId = newSpot.id
                    }
                } label: {
                    Label("New Spot...", systemImage: "plus.circle")
                }
            } label: {
                HStack {
                    Image(systemName: selectedSpot?.jobType.icon ?? "mappin")
                        .foregroundStyle(.orange)
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

// MARK: - Issue Photo Card (Audit)

private struct IssuePhotoCard: View {
    @Binding var issuePhoto: IssuePhoto
    let spots: [Spot]
    let number: Int
    var store: JobStore
    var focusedField: FocusState<FormField?>.Binding
    var onRequestNewSpot: (@escaping (Spot) -> Void) -> Void
    var onDelete: () -> Void

    private var spotJobType: JobType {
        spots.first { $0.id == issuePhoto.spotId }?.jobType ?? .insulation
    }

    var body: some View {
        VStack(spacing: 0) {
            header
            cardBody
        }
        .clipShape(.rect(cornerRadius: FormDesign.cardRadius))
        .shadow(color: FormDesign.shadowColor, radius: FormDesign.shadowRadius, y: FormDesign.shadowY)
    }

    private var header: some View {
        HStack {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.body.weight(.semibold))
            Text("Issue \(number)")
                .font(.headline)
            Spacer()
            Button(action: onDelete) {
                Image(systemName: "xmark")
                    .font(.caption.weight(.bold))
                    .padding(6)
                    .background(.white.opacity(0.2), in: .circle)
            }
        }
        .foregroundStyle(.white)
        .padding(.horizontal, FormDesign.cardPadding)
        .padding(.vertical, 14)
        .background(
            LinearGradient(
                colors: [.orange, .orange.opacity(0.85)],
                startPoint: .leading,
                endPoint: .trailing
            )
        )
    }

    private var cardBody: some View {
        VStack(alignment: .leading, spacing: FormDesign.innerSpacing) {
            // Spot picker
            SpotPicker(
                spots: spots,
                selectedSpotId: $issuePhoto.spotId,
                onRequestNewSpot: onRequestNewSpot
            )

            Divider()

            // Photo
            VStack(alignment: .leading, spacing: 4) {
                Text("PHOTO")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(.orange)
                    .tracking(0.5)

                SinglePhotoPicker(
                    label: "",
                    photoRef: $issuePhoto.photoURL,
                    store: store
                )
            }

            Divider()

            // Category picker (filtered by spot's jobType)
            VStack(alignment: .leading, spacing: 8) {
                Text("CATEGORY")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)

                Menu {
                    ForEach(IssueCategory.categories(for: spotJobType)) { cat in
                        Button(cat.rawValue) {
                            issuePhoto.category = cat
                        }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Text(issuePhoto.category.rawValue)
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
            HStack(spacing: 8) {
                ForEach(IssueSeverity.allCases) { severity in
                    SeverityPill(
                        severity: severity,
                        isSelected: issuePhoto.severity == severity
                    ) {
                        withAnimation(FormDesign.spring) {
                            issuePhoto.severity = severity
                        }
                    }
                }
            }

            Divider()

            // Notes
            VStack(alignment: .leading, spacing: 8) {
                Text("Notes")
                    .font(.subheadline.weight(.semibold))

                TextField("Observations for this issue...", text: $issuePhoto.notes, axis: .vertical)
                    .lineLimit(2...5)
                    .font(.subheadline)
                    .padding(10)
                    .background(Color(.tertiarySystemFill), in: .rect(cornerRadius: 8))
                    .focused(focusedField, equals: .issueNotes(issuePhoto.id))
            }
        }
        .padding(FormDesign.cardPadding)
        .background(.background)
    }
}

// MARK: - Fix Photo Card (Inspection)

private struct FixPhotoCard: View {
    @Binding var fixPhoto: FixPhoto
    let spots: [Spot]
    let auditIssuePhotos: [IssuePhoto]
    let allSpots: [Spot]
    let number: Int
    var store: JobStore
    var focusedField: FocusState<FormField?>.Binding
    var onRequestNewSpot: (@escaping (Spot) -> Void) -> Void
    var onDelete: () -> Void

    /// Audit issues filtered to the selected spot
    private var issuesAtSpot: [IssuePhoto] {
        auditIssuePhotos.filter { $0.spotId == fixPhoto.spotId }
    }

    private var linkedIssue: IssuePhoto? {
        guard let linkedId = fixPhoto.linkedAuditIssueId else { return nil }
        return auditIssuePhotos.first { $0.id == linkedId }
    }

    var body: some View {
        VStack(spacing: 0) {
            header
            cardBody
        }
        .clipShape(.rect(cornerRadius: FormDesign.cardRadius))
        .shadow(color: FormDesign.shadowColor, radius: FormDesign.shadowRadius, y: FormDesign.shadowY)
    }

    private var header: some View {
        HStack {
            Image(systemName: "wrench.and.screwdriver.fill")
                .font(.body.weight(.semibold))
            Text("Fix \(number)")
                .font(.headline)
            Spacer()
            Button(action: onDelete) {
                Image(systemName: "xmark")
                    .font(.caption.weight(.bold))
                    .padding(6)
                    .background(.white.opacity(0.2), in: .circle)
            }
        }
        .foregroundStyle(.white)
        .padding(.horizontal, FormDesign.cardPadding)
        .padding(.vertical, 14)
        .background(
            LinearGradient(
                colors: [.green, .green.opacity(0.85)],
                startPoint: .leading,
                endPoint: .trailing
            )
        )
    }

    private var cardBody: some View {
        VStack(alignment: .leading, spacing: FormDesign.innerSpacing) {
            // Spot picker
            SpotPicker(
                spots: spots,
                selectedSpotId: $fixPhoto.spotId,
                onRequestNewSpot: onRequestNewSpot
            )

            Divider()

            // Linked audit issue picker
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
                            fixPhoto.linkedAuditIssueId = nil
                        }
                        Divider()
                        ForEach(issuesAtSpot) { issue in
                            Button {
                                fixPhoto.linkedAuditIssueId = issue.id
                            } label: {
                                Label(
                                    "\(issue.category.rawValue) (\(issue.severity.rawValue))",
                                    systemImage: issue.severity.icon
                                )
                            }
                        }
                    } label: {
                        HStack {
                            if let linked = linkedIssue {
                                Image(systemName: linked.severity.icon)
                                    .foregroundStyle(linked.severity.color)
                                Text(linked.category.rawValue)
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

            // Photo
            VStack(alignment: .leading, spacing: 4) {
                Text("PHOTO")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(.green)
                    .tracking(0.5)

                SinglePhotoPicker(
                    label: "",
                    photoRef: $fixPhoto.photoURL,
                    store: store
                )
            }

            Divider()

            // Resolution notes
            VStack(alignment: .leading, spacing: 8) {
                Text("Resolution Notes")
                    .font(.subheadline.weight(.semibold))

                TextField("How was this fixed?", text: $fixPhoto.resolutionNotes, axis: .vertical)
                    .lineLimit(2...5)
                    .font(.subheadline)
                    .padding(10)
                    .background(Color(.tertiarySystemFill), in: .rect(cornerRadius: 8))
                    .focused(focusedField, equals: .resolutionNotes(fixPhoto.id))
            }
        }
        .padding(FormDesign.cardPadding)
        .background(.background)
    }
}

// MARK: - Material Entry Card

private struct MaterialEntryCard: View {
    @Binding var material: Material
    var focusedField: FocusState<FormField?>.Binding
    var onDelete: () -> Void

    private var nameIsEmpty: Bool {
        material.name.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                TextField("Material name (required)", text: $material.name)
                    .font(.subheadline)
                    .focused(focusedField, equals: .materialName(material.id))

                Button(action: onDelete) {
                    Image(systemName: "trash")
                        .font(.caption)
                        .foregroundStyle(.red.opacity(0.7))
                }
            }

            if nameIsEmpty && !material.quantity.isEmpty {
                Text("Name is required — this material will be removed on save")
                    .font(.caption2)
                    .foregroundStyle(.red)
            }

            // Type chips
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(MaterialType.allCases) { type in
                        Button {
                            material.type = type
                        } label: {
                            HStack(spacing: 3) {
                                Image(systemName: type.icon)
                                    .font(.caption2)
                                Text(type.rawValue)
                                    .font(.caption.weight(.medium))
                            }
                            .padding(.horizontal, 10)
                            .frame(height: 30)
                            .foregroundStyle(material.type == type ? .white : .primary)
                            .background(
                                material.type == type
                                    ? AnyShapeStyle(type.color)
                                    : AnyShapeStyle(.clear),
                                in: .capsule
                            )
                            .overlay(
                                Capsule()
                                    .strokeBorder(
                                        material.type == type ? .clear : Color(.systemGray3),
                                        lineWidth: 1
                                    )
                            )
                        }
                    }
                }
            }

            TextField("Quantity (e.g. 200 sq ft)", text: $material.quantity)
                .font(.caption)
                .padding(8)
                .background(Color(.tertiarySystemFill), in: .rect(cornerRadius: 6))
                .focused(focusedField, equals: .materialQuantity(material.id))
        }
        .padding(12)
        .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 10))
    }
}

// MARK: - Job Type Chip

private struct JobTypeChip: View {
    let type: JobType
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Image(systemName: type.icon)
                    .font(.caption2)
                Text(type.rawValue)
                    .font(.caption.weight(.medium))
            }
            .padding(.horizontal, 12)
            .frame(height: FormDesign.chipHeight)
            .foregroundStyle(isSelected ? .white : .primary)
            .background(
                isSelected
                    ? AnyShapeStyle(.orange)
                    : AnyShapeStyle(.clear),
                in: .capsule
            )
            .overlay(
                Capsule()
                    .strokeBorder(
                        isSelected ? .clear : Color(.systemGray3),
                        lineWidth: 1
                    )
            )
        }
        .sensoryFeedback(.selection, trigger: isSelected)
    }
}

// MARK: - Severity Pill

private struct SeverityPill: View {
    let severity: IssueSeverity
    let isSelected: Bool
    let action: () -> Void

    private var textColor: Color {
        if isSelected {
            return severity == .minor ? .black : .white
        }
        return severity.color
    }

    var body: some View {
        Button(action: action) {
            Text(severity.rawValue)
                .font(.caption.weight(.semibold))
                .frame(height: FormDesign.severityPillHeight)
                .padding(.horizontal, 14)
                .foregroundStyle(textColor)
                .background(
                    isSelected
                        ? AnyShapeStyle(severity.color)
                        : AnyShapeStyle(severity.color.opacity(0.1)),
                    in: .capsule
                )
                .overlay(
                    Capsule()
                        .strokeBorder(
                            isSelected ? .clear : severity.color.opacity(0.3),
                            lineWidth: 1
                        )
                )
        }
        .sensoryFeedback(.selection, trigger: isSelected)
    }
}
