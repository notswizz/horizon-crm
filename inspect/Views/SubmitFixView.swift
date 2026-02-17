import SwiftUI
import PhotosUI

struct SubmitFixView: View {
    let job: Job
    let issue: IssuePhoto
    let spotId: UUID
    var store: JobStore
    var configStore: ConfigStore

    @Environment(\.dismiss) private var dismiss
    @AppStorage("inspectorName") private var inspectorName = ""

    @State private var selectedItem: PhotosPickerItem?
    @State private var photoRef: String?
    @State private var displayImage: UIImage?
    @State private var resolutionNotes = ""
    @State private var materials: [Material] = []
    @State private var isSaving = false
    @State private var showSuccess = false
    @State private var errorMessage: String?
    @State private var showError = false

    private var spot: Spot? {
        job.spots.first { $0.id == spotId }
    }

    var body: some View {
        ZStack {
            ScrollView {
                VStack(spacing: 0) {
                    // Hero issue context
                    issueHero

                    // Form content
                    VStack(spacing: 14) {
                        photoSection
                        notesSection
                        materialsSection
                        saveButton
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 16)
                    .padding(.bottom, 32)
                }
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Fix Issue")
            .navigationBarTitleDisplayMode(.inline)
            .ignoresSafeArea(.container, edges: .top)
            .alert("Save Error", isPresented: $showError) {
                Button("OK") { }
            } message: {
                Text(errorMessage ?? "An unknown error occurred.")
            }

            if showSuccess {
                successOverlay
            }
        }
    }

    // MARK: - Issue Hero

    private var issueHero: some View {
        ZStack(alignment: .bottom) {
            // Issue photo or gradient background
            Color.clear
                .frame(height: 260)
                .overlay {
                    Group {
                        if let urlString = issue.photoURL, let url = URL(string: urlString) {
                            AsyncImage(url: url) { phase in
                                if let img = phase.image {
                                    img.resizable().scaledToFill()
                                } else if phase.error != nil {
                                    heroPlaceholder
                                } else {
                                    ZStack {
                                        Color(.systemGray5)
                                        ProgressView()
                                    }
                                }
                            }
                        } else {
                            heroPlaceholder
                        }
                    }
                }
                .clipped()

            // Gradient scrim
            LinearGradient(
                stops: [
                    .init(color: .clear, location: 0.2),
                    .init(color: .black.opacity(0.7), location: 1.0),
                ],
                startPoint: .top,
                endPoint: .bottom
            )

            // Bottom overlay info
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 8) {
                    // Severity badge
                    HStack(spacing: 5) {
                        Image(systemName: issue.severity.icon)
                            .font(.system(size: 10, weight: .bold))
                        Text(issue.severity.rawValue)
                            .font(.system(size: 11, weight: .bold))
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(issue.severity.color.opacity(0.5), in: .capsule)
                    .overlay(Capsule().strokeBorder(issue.severity.color.opacity(0.6), lineWidth: 1))

                    // Category
                    Text(issue.category)
                        .font(.system(size: 22, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .shadow(color: .black.opacity(0.3), radius: 4, y: 2)

                    // Address
                    HStack(spacing: 5) {
                        Image(systemName: "mappin")
                            .font(.system(size: 9, weight: .semibold))
                        Text(job.address)
                            .font(.system(size: 11, weight: .medium))
                    }
                    .foregroundStyle(.white.opacity(0.8))
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

    private var heroPlaceholder: some View {
        ZStack {
            LinearGradient(
                colors: [issue.severity.color.opacity(0.3), issue.severity.color.opacity(0.1)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            VStack(spacing: 6) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.system(size: 36, weight: .light))
                    .foregroundStyle(issue.severity.color.opacity(0.4))
                Text("Issue Photo")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.tertiary)
            }
        }
    }

    // MARK: - Photo Section

    private var photoSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                Image(systemName: "camera.fill")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(DS.Colors.success)
                Text("FIX PHOTO")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.secondary)
                    .tracking(0.5)

                Spacer()

                if displayImage != nil {
                    HStack(spacing: 3) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 10))
                        Text("Captured")
                            .font(.system(size: 10, weight: .semibold))
                    }
                    .foregroundStyle(DS.Colors.success)
                }
            }

            if let displayImage {
                ZStack(alignment: .topTrailing) {
                    Image(uiImage: displayImage)
                        .resizable()
                        .scaledToFill()
                        .frame(maxWidth: .infinity)
                        .frame(height: 220)
                        .clipped()
                        .clipShape(.rect(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .strokeBorder(DS.Colors.success.opacity(0.3), lineWidth: 2)
                        )

                    Button {
                        withAnimation(DS.Animation.defaultSpring) {
                            photoRef = nil
                            self.displayImage = nil
                            selectedItem = nil
                        }
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 24))
                            .foregroundStyle(.white, .black.opacity(0.5))
                            .padding(10)
                    }
                }
            } else {
                PhotosPicker(selection: $selectedItem, matching: .images) {
                    VStack(spacing: 10) {
                        ZStack {
                            Circle()
                                .fill(DS.Colors.success.opacity(0.1))
                                .frame(width: 52, height: 52)
                            Image(systemName: "camera.fill")
                                .font(.system(size: 22))
                                .foregroundStyle(DS.Colors.success)
                        }
                        Text("Take / Choose Photo")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(DS.Colors.success)
                        Text("Required to submit fix")
                            .font(.system(size: 11))
                            .foregroundStyle(.tertiary)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 160)
                    .background(DS.Colors.success.opacity(0.04), in: .rect(cornerRadius: 12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .strokeBorder(style: StrokeStyle(lineWidth: 1.5, dash: [8, 5]))
                            .foregroundStyle(DS.Colors.success.opacity(0.25))
                    )
                }
                .onChange(of: selectedItem) { _, newItem in
                    importPhoto(from: newItem)
                }
            }
        }
        .padding(16)
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }

    // MARK: - Notes Section

    private var notesSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                Image(systemName: "text.alignleft")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(DS.Colors.info)
                Text("RESOLUTION NOTES")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.secondary)
                    .tracking(0.5)
            }

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

    // MARK: - Materials Section

    private var materialsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "shippingbox.fill")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 22, height: 22)
                    .background(.purple.gradient, in: .rect(cornerRadius: 6))
                Text("MATERIALS USED")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.secondary)
                    .tracking(0.5)

                Spacer()

                if !materials.isEmpty {
                    Text("\(materials.count) item\(materials.count == 1 ? "" : "s")")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(.purple)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(.purple.opacity(0.1), in: .capsule)
                }
            }

            ForEach(Array(materials.enumerated()), id: \.element.id) { index, _ in
                materialRow(index: index)
            }

            Button {
                withAnimation(DS.Animation.defaultSpring) {
                    materials.append(Material())
                }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 14))
                    Text("Add Material")
                        .font(.system(size: 14, weight: .semibold))
                }
                .foregroundStyle(.purple)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(.purple.opacity(0.04), in: .rect(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .strokeBorder(style: StrokeStyle(lineWidth: 1.5, dash: [8, 5]))
                        .foregroundStyle(.purple.opacity(0.18))
                )
            }
        }
        .padding(16)
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }

    private func materialRow(index: Int) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            // Header: number + delete
            HStack {
                HStack(spacing: 6) {
                    Text("\(index + 1)")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 18, height: 18)
                        .background(.purple.gradient, in: .circle)
                    Text("Material")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Button {
                    withAnimation(DS.Animation.defaultSpring) {
                        _ = materials.remove(at: index)
                    }
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(.secondary)
                        .frame(width: 24, height: 24)
                        .background(Color(.tertiarySystemFill), in: .circle)
                }
            }

            // Name field
            TextField("Material name", text: $materials[index].name)
                .font(.system(size: 15))
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .strokeBorder(Color(.systemGray4), lineWidth: 1)
                )

            // Quantity + cost side by side
            HStack(spacing: 8) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Quantity")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(.tertiary)
                    TextField("0", text: $materials[index].quantity)
                        .font(.system(size: 14))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 9)
                        .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 8))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .strokeBorder(Color(.systemGray4), lineWidth: 1)
                        )
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Unit Cost")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(.tertiary)
                    HStack(spacing: 4) {
                        Text("$")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(.tertiary)
                        TextField("0.00", value: $materials[index].cost, format: .number)
                            .font(.system(size: 14))
                            .keyboardType(.decimalPad)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 9)
                    .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 8))
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .strokeBorder(Color(.systemGray4), lineWidth: 1)
                    )
                }
            }

            // Type chips
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(configStore.materialTypes, id: \.self) { type in
                        Button {
                            materials[index].type = type
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: MaterialType.icon(for: type))
                                    .font(.system(size: 9))
                                Text(type)
                                    .font(.system(size: 11, weight: .semibold))
                            }
                            .padding(.horizontal, 12)
                            .frame(height: 30)
                            .foregroundStyle(materials[index].type == type ? .white : .primary)
                            .background(
                                materials[index].type == type
                                    ? AnyShapeStyle(MaterialType.color(for: type).gradient)
                                    : AnyShapeStyle(Color(.tertiarySystemFill)),
                                in: .capsule
                            )
                        }
                    }
                }
            }
        }
        .padding(14)
        .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .strokeBorder(.purple.opacity(0.08), lineWidth: 1)
        )
    }

    // MARK: - Save Button

    private var saveButton: some View {
        Button {
            Task { await save() }
        } label: {
            HStack(spacing: 8) {
                if isSaving {
                    ProgressView()
                        .tint(.white)
                } else {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 16, weight: .semibold))
                    Text("Submit Fix")
                        .font(.system(size: 16, weight: .bold))
                }
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(
                LinearGradient(
                    colors: photoRef != nil
                        ? [DS.Colors.success, DS.Colors.success.opacity(0.85)]
                        : [Color(.systemGray3), Color(.systemGray3).opacity(0.85)],
                    startPoint: .leading,
                    endPoint: .trailing
                ),
                in: .rect(cornerRadius: 14)
            )
            .shadow(
                color: photoRef != nil ? DS.Colors.success.opacity(0.3) : .clear,
                radius: 10,
                y: 4
            )
        }
        .disabled(photoRef == nil || isSaving)
        .sensoryFeedback(.impact(weight: .medium), trigger: isSaving)
        .padding(.top, 4)
    }

    // MARK: - Success Overlay

    private var successOverlay: some View {
        VStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(DS.Colors.success.opacity(0.15))
                    .frame(width: 80, height: 80)
                Image(systemName: "wrench.and.screwdriver.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(DS.Colors.success)
            }
            Text("Fix Submitted")
                .font(.system(size: 20, weight: .bold))
            Text(issue.category)
                .font(.system(size: 14))
                .foregroundStyle(.secondary)
        }
        .padding(32)
        .background(.ultraThinMaterial, in: .rect(cornerRadius: 24))
        .shadow(color: .black.opacity(0.12), radius: 24, y: 8)
        .transition(.scale.combined(with: .opacity))
    }

    // MARK: - Photo Import

    private func importPhoto(from item: PhotosPickerItem?) {
        guard let item else { return }
        Task {
            if let data = try? await item.loadTransferable(type: Data.self) {
                let filename = store.saveTempPhoto(data)
                photoRef = filename
                displayImage = store.loadTempImage(named: filename)
            }
            selectedItem = nil
        }
    }

    // MARK: - Save

    private func save() async {
        guard let photoFile = photoRef else { return }

        isSaving = true
        defer { isSaving = false }

        do {
            guard let imageData = store.loadTempPhotoData(named: photoFile) else {
                throw NSError(domain: "SubmitFix", code: 1,
                              userInfo: [NSLocalizedDescriptionKey: "Could not load photo data."])
            }

            // Find or create inspection form
            let forms = await store.fetchForms(for: job.id)
            let existingForm = forms.first { $0.formType == .inspection }
            let formId = existingForm?.id ?? UUID()

            let photoId = UUID()
            let downloadURL = try await store.uploadPhoto(
                imageData: imageData,
                jobId: job.id,
                formId: formId,
                photoId: photoId
            )

            let fixPhoto = FixPhoto(
                id: photoId,
                linkedAuditIssueId: issue.id,
                photoURL: downloadURL,
                resolutionNotes: resolutionNotes
            )

            let validMaterials = materials.filter { !$0.name.trimmingCharacters(in: .whitespaces).isEmpty }

            if var form = existingForm {
                form.appendFixPhoto(fixPhoto, toSpot: spotId, availableSpots: job.spots)
                form.appendMaterials(validMaterials, toSpot: spotId, availableSpots: job.spots)
                store.updateForm(form, in: job)
            } else {
                var newForm = InspectionForm(id: formId, formType: .inspection, inspectorName: inspectorName, date: Date())
                newForm.appendFixPhoto(fixPhoto, toSpot: spotId, availableSpots: job.spots)
                newForm.appendMaterials(validMaterials, toSpot: spotId, availableSpots: job.spots)
                store.addForm(newForm, to: job)
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
