import SwiftUI
import PhotosUI

// MARK: - Add Issue View (from spot tap)

struct AddIssueView: View {
    let job: Job
    let initialSpot: Spot
    var store: JobStore

    @Environment(\.dismiss) private var dismiss
    @AppStorage("inspectorName") private var inspectorName = ""

    // Photo state
    @State private var selectedItem: PhotosPickerItem?
    @State private var selectedPhoto: String?
    @State private var displayImage: UIImage?

    // Issue state
    @State private var spotId: UUID
    @State private var category: IssueCategory = .other
    @State private var severity: IssueSeverity = .major
    @State private var notes = ""

    // Spot management
    @State private var localSpots: [Spot]
    @State private var showNewSpotSheet = false
    @State private var newSpotTitle = ""
    @State private var newSpotJobType: JobType = .insulation

    // Save state
    @State private var isSaving = false
    @State private var showSuccess = false
    @State private var errorMessage: String?
    @State private var showError = false

    init(job: Job, spot: Spot, store: JobStore) {
        self.job = job
        self.initialSpot = spot
        self.store = store
        self._spotId = State(initialValue: spot.id)
        self._localSpots = State(initialValue: job.spots)
    }

    private var selectedSpot: Spot? {
        localSpots.first { $0.id == spotId }
    }

    private var spotJobType: JobType {
        selectedSpot?.jobType ?? .insulation
    }

    private var canSave: Bool {
        selectedPhoto != nil
    }

    var body: some View {
        ZStack {
            ScrollView {
                VStack(spacing: DS.Spacing.l) {
                    photoCard
                    issueDetailsCard
                    saveButton
                }
                .padding()
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Add Issue")
            .navigationBarTitleDisplayMode(.inline)
            .alert("Save Error", isPresented: $showError) {
                Button("OK") { }
            } message: {
                Text(errorMessage ?? "An unknown error occurred.")
            }
            .sheet(isPresented: $showNewSpotSheet) {
                newSpotSheet
            }

            if showSuccess {
                successOverlay
                    .transition(.scale.combined(with: .opacity))
            }
        }
    }

    // MARK: - Photo Card

    private var photoCard: some View {
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
                if selectedPhoto != nil {
                    Button {
                        selectedPhoto = nil
                        displayImage = nil
                        selectedItem = nil
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "arrow.counterclockwise")
                            Text("Retake")
                        }
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(DS.Colors.primary)
                    }
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
            } else {
                PhotosPicker(selection: $selectedItem, matching: .images) {
                    HStack(spacing: 10) {
                        Image(systemName: "camera.fill")
                            .font(.title2)
                        Text("Take / Choose Photo")
                            .font(.headline)
                    }
                    .foregroundStyle(DS.Colors.primary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 120)
                    .background(DS.Colors.primary.opacity(0.04), in: .rect(cornerRadius: 12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .strokeBorder(
                                style: StrokeStyle(lineWidth: 2, dash: [8, 6])
                            )
                            .foregroundStyle(DS.Colors.primary.opacity(0.25))
                    )
                }
                .onChange(of: selectedItem) { _, newItem in
                    importPhoto(from: newItem)
                }
            }
        }
        .dsCard()
    }

    // MARK: - Issue Details Card

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
                    ForEach(IssueCategory.categories(for: spotJobType)) { cat in
                        Button(cat.rawValue) {
                            category = cat
                        }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Text(category.rawValue)
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
                                .foregroundStyle(severity == sev ? (sev == .minor ? .black : .white) : sev.color)
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

    // MARK: - Spot Picker

    private var spotPickerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("SPOT")
                .font(.caption.weight(.medium))
                .foregroundStyle(.secondary)

            Menu {
                ForEach(localSpots) { spot in
                    Button {
                        spotId = spot.id
                    } label: {
                        Label(spot.title.isEmpty ? "Untitled" : spot.title, systemImage: spot.jobType.icon)
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
                    Image(systemName: selectedSpot?.jobType.icon ?? "mappin")
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

    // MARK: - Save Button

    private var saveButton: some View {
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
                    Text("Save Issue")
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
        .padding(.top, 4)
    }

    // MARK: - Success Overlay

    private var successOverlay: some View {
        VStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(DS.Colors.primary.opacity(0.15))
                    .frame(width: 80, height: 80)
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(DS.Colors.primary)
            }

            VStack(spacing: 4) {
                Text("Issue Added")
                    .font(.title3.weight(.bold))
                Text(job.address)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
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

    private func importPhoto(from item: PhotosPickerItem?) {
        guard let item else { return }
        Task {
            if let data = try? await item.loadTransferable(type: Data.self) {
                let filename = store.saveTempPhoto(data)
                selectedPhoto = filename
                displayImage = store.loadTempImage(named: filename)
            }
            selectedItem = nil
        }
    }

    // MARK: - Save

    private func save() async {
        guard let photo = selectedPhoto else { return }

        isSaving = true
        defer { isSaving = false }

        do {
            guard let imageData = store.loadTempPhotoData(named: photo) else {
                throw NSError(domain: "AddIssue", code: 1,
                              userInfo: [NSLocalizedDescriptionKey: "Could not load photo data."])
            }

            let forms = await store.fetchForms(for: job.id)
            let existingForm = forms.first { $0.formType == .audit }
            let formId = existingForm?.id ?? UUID()

            let photoId = UUID()
            let downloadURL = try await store.uploadPhoto(
                imageData: imageData,
                jobId: job.id,
                formId: formId,
                photoId: photoId
            )

            // Persist new spots to job if needed
            var updatedJob = job
            updatedJob.spots = localSpots
            if updatedJob.spots != job.spots {
                store.updateJob(updatedJob)
            }

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

            store.cleanupTempPhotos()

            withAnimation(DS.Animation.defaultSpring) {
                showSuccess = true
            }

            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                dismiss()
            }
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }
}
