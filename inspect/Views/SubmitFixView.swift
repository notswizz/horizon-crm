import SwiftUI
import PhotosUI

struct SubmitFixView: View {
    let job: Job
    let issue: IssuePhoto
    var store: JobStore

    @Environment(\.dismiss) private var dismiss
    @AppStorage("inspectorName") private var inspectorName = ""

    @State private var selectedItem: PhotosPickerItem?
    @State private var photoRef: String?
    @State private var displayImage: UIImage?
    @State private var resolutionNotes = ""
    @State private var isSaving = false
    @State private var showSuccess = false
    @State private var errorMessage: String?
    @State private var showError = false

    private var spot: Spot? {
        job.spots.first { $0.id == issue.spotId }
    }

    var body: some View {
        ZStack {
            ScrollView {
                VStack(spacing: 16) {
                    issueCard
                    photoSection
                    notesSection
                    saveButton
                }
                .padding()
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Fix Issue")
            .navigationBarTitleDisplayMode(.inline)
            .alert("Save Error", isPresented: $showError) {
                Button("OK") { }
            } message: {
                Text(errorMessage ?? "An unknown error occurred.")
            }

            if showSuccess {
                VStack(spacing: 16) {
                    ZStack {
                        Circle()
                            .fill(.green.opacity(0.15))
                            .frame(width: 80, height: 80)
                        Image(systemName: "wrench.and.screwdriver.fill")
                            .font(.system(size: 32))
                            .foregroundStyle(.green)
                    }
                    Text("Fix Submitted")
                        .font(.title3.weight(.bold))
                    Text(issue.category.rawValue)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(32)
                .background(.ultraThinMaterial, in: .rect(cornerRadius: 24))
                .shadow(color: .black.opacity(0.12), radius: 24, y: 8)
                .transition(.scale.combined(with: .opacity))
            }
        }
    }

    // MARK: - Issue Context Card

    private var issueCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 5) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.caption)
                    .foregroundStyle(.red)
                Text("Fixing Issue")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }

            // Issue summary
            HStack(spacing: 8) {
                Image(systemName: issue.severity.icon)
                    .foregroundStyle(issue.severity.color)
                    .font(.subheadline)

                VStack(alignment: .leading, spacing: 2) {
                    Text(issue.category.rawValue)
                        .font(.subheadline.weight(.semibold))

                    HStack(spacing: 8) {
                        Text(issue.severity.rawValue)
                            .font(.caption2.weight(.medium))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(issue.severity.color.opacity(0.12), in: .capsule)
                            .foregroundStyle(issue.severity.color)

                        if let spot {
                            Text(spot.title)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                Spacer()
            }

            if !issue.notes.isEmpty {
                Text(issue.notes)
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                    .lineLimit(2)
            }

            // Job context
            HStack(spacing: 6) {
                Image(systemName: "mappin")
                    .font(.caption2)
                    .foregroundStyle(.orange)
                Text(job.address)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(14)
        .background(.background, in: .rect(cornerRadius: 14))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 2)
    }

    // MARK: - Photo Section

    private var photoSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 5) {
                Image(systemName: "camera.fill")
                    .font(.caption)
                    .foregroundStyle(.green)
                Text("Fix Photo")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }

            if let displayImage {
                ZStack(alignment: .topTrailing) {
                    Image(uiImage: displayImage)
                        .resizable()
                        .scaledToFill()
                        .frame(maxWidth: .infinity)
                        .frame(height: 200)
                        .clipped()
                        .clipShape(.rect(cornerRadius: 10))

                    Button {
                        photoRef = nil
                        self.displayImage = nil
                        selectedItem = nil
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title3)
                            .foregroundStyle(.white, .black.opacity(0.5))
                            .padding(8)
                    }
                }
            } else {
                PhotosPicker(selection: $selectedItem, matching: .images) {
                    VStack(spacing: 8) {
                        Image(systemName: "camera.fill")
                            .font(.title2)
                        Text("Take / Choose Photo")
                            .font(.subheadline.weight(.medium))
                    }
                    .foregroundStyle(.green)
                    .frame(maxWidth: .infinity)
                    .frame(height: 140)
                    .background(.green.opacity(0.06), in: .rect(cornerRadius: 10))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .strokeBorder(style: StrokeStyle(lineWidth: 1.5, dash: [6, 4]))
                            .foregroundStyle(.green.opacity(0.25))
                    )
                }
                .onChange(of: selectedItem) { _, newItem in
                    importPhoto(from: newItem)
                }
            }
        }
        .padding(14)
        .background(.background, in: .rect(cornerRadius: 14))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 2)
    }

    // MARK: - Notes Section

    private var notesSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 5) {
                Image(systemName: "text.alignleft")
                    .font(.caption)
                    .foregroundStyle(.green)
                Text("Resolution Notes")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }

            TextField("How was this fixed?", text: $resolutionNotes, axis: .vertical)
                .lineLimit(3...6)
                .font(.subheadline)
                .padding(12)
                .background(Color(.tertiarySystemFill), in: .rect(cornerRadius: 8))
        }
        .padding(14)
        .background(.background, in: .rect(cornerRadius: 14))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 2)
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
                    Image(systemName: "checkmark.circle.fill")
                    Text("Submit Fix")
                }
                Spacer()
            }
            .font(.headline)
            .foregroundStyle(.white)
            .frame(height: 50)
            .background(
                LinearGradient(
                    colors: photoRef != nil
                        ? [.green, .green.opacity(0.85)]
                        : [.gray, .gray.opacity(0.85)],
                    startPoint: .leading,
                    endPoint: .trailing
                ),
                in: .capsule
            )
            .shadow(
                color: photoRef != nil ? .green.opacity(0.3) : .clear,
                radius: 12,
                y: 4
            )
        }
        .disabled(photoRef == nil || isSaving)
        .sensoryFeedback(.impact(weight: .medium), trigger: isSaving)
        .padding(.top, 4)
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
                spotId: issue.spotId,
                linkedAuditIssueId: issue.id,
                photoURL: downloadURL,
                resolutionNotes: resolutionNotes
            )

            if var form = existingForm {
                form.fixPhotos.append(fixPhoto)
                store.updateForm(form, in: job)
            } else {
                var newForm = InspectionForm(id: formId, formType: .inspection, inspectorName: inspectorName, date: Date())
                newForm.fixPhotos.append(fixPhoto)
                store.addForm(newForm, to: job)
            }

            store.cleanupTempPhotos()

            withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
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
