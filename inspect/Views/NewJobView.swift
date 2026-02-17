import SwiftUI
import CoreLocation
import MapKit
import PhotosUI

// MARK: - Focus Fields

private enum Field: Hashable {
    case streetAddress
    case city
    case state
    case zipCode
    case contactName
    case contactPhone
    case contactEmail
    case notes
}

// MARK: - New Job View

struct NewJobView: View {
    var store: JobStore
    @Environment(\.dismiss) private var dismiss
    @State private var job = Job()
    @State private var showSuccess = false
    @State private var showError = false
    @State private var addressCompleter = AddressCompleter()
    @State private var suppressCompleter = false
    @FocusState private var focusedField: Field?

    // Property photo
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var propertyImage: UIImage?
    @State private var showCamera = false

    var body: some View {
        ZStack {
            ScrollView {
                VStack(spacing: DS.Spacing.l) {
                    propertyPhotoCard
                    jobDetailsCard
                    contactCard
                    notesCard
                    actionButtons
                }
                .padding()
            }
            .scrollDismissesKeyboard(.interactively)
            .background(DS.Colors.background)
            .navigationTitle("New Job")
            .navigationBarTitleDisplayMode(.inline)
            .alert("Error", isPresented: $showError) {
                Button("OK") { }
            } message: {
                Text(store.errorMessage ?? "An unknown error occurred.")
            }
            .fullScreenCover(isPresented: $showCamera) {
                CameraPickerView { image in
                    propertyImage = image
                }
                .ignoresSafeArea()
            }
            .onChange(of: selectedPhotoItem) { _, newItem in
                guard let newItem else { return }
                Task {
                    if let data = try? await newItem.loadTransferable(type: Data.self),
                       let image = UIImage(data: data) {
                        propertyImage = image
                    }
                    selectedPhotoItem = nil
                }
            }

            // Success overlay
            if showSuccess {
                successOverlay
                    .transition(.scale.combined(with: .opacity))
            }
        }
    }

    // MARK: - Success Overlay

    private var successOverlay: some View {
        VStack(spacing: DS.Spacing.s) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 56))
                .foregroundStyle(DS.Colors.success)
            Text("Job Created")
                .font(.title3.weight(.semibold))
            Text("Switch to the Jobs tab to view it.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(DS.Spacing.xxl)
        .background(.ultraThinMaterial, in: .rect(cornerRadius: DS.Spacing.l))
        .shadow(color: .black.opacity(0.1), radius: DS.Spacing.l, y: DS.Spacing.xs)
    }

    // MARK: - Property Photo Card

    private var propertyPhotoCard: some View {
        VStack(alignment: .leading, spacing: DS.Spacing.m) {
            Label {
                Text("Property Photo")
                    .font(.headline)
            } icon: {
                Image(systemName: "photo.fill")
                    .foregroundStyle(DS.Colors.primary)
            }

            if let propertyImage {
                ZStack(alignment: .topTrailing) {
                    Image(uiImage: propertyImage)
                        .resizable()
                        .scaledToFill()
                        .frame(maxWidth: .infinity)
                        .frame(height: 180)
                        .clipped()
                        .clipShape(.rect(cornerRadius: 12))

                    Button {
                        self.propertyImage = nil
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title3)
                            .foregroundStyle(.white)
                            .shadow(radius: 2)
                    }
                    .padding(8)
                }
            } else {
                HStack(spacing: 12) {
                    // Camera
                    Button {
                        if UIImagePickerController.isSourceTypeAvailable(.camera) {
                            showCamera = true
                        }
                    } label: {
                        VStack(spacing: 6) {
                            Image(systemName: "camera.fill")
                                .font(.title3)
                            Text("Camera")
                                .font(.caption.weight(.medium))
                        }
                        .foregroundStyle(DS.Colors.primary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 80)
                        .background(DS.Colors.primary.opacity(0.08), in: .rect(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .strokeBorder(DS.Colors.primary.opacity(0.2), lineWidth: 1)
                        )
                    }

                    // Library
                    PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                        VStack(spacing: 6) {
                            Image(systemName: "photo.on.rectangle")
                                .font(.title3)
                            Text("Library")
                                .font(.caption.weight(.medium))
                        }
                        .foregroundStyle(DS.Colors.primary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 80)
                        .background(DS.Colors.primary.opacity(0.08), in: .rect(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .strokeBorder(DS.Colors.primary.opacity(0.2), lineWidth: 1)
                        )
                    }
                }
            }
        }
        .dsCard()
    }

    // MARK: - Job Details Card

    private var jobDetailsCard: some View {
        VStack(alignment: .leading, spacing: DS.Spacing.m) {
            Label {
                Text("Address")
                    .font(.headline)
            } icon: {
                Image(systemName: "mappin.circle.fill")
                    .foregroundStyle(DS.Colors.primary)
            }

            StyledTextField(
                icon: "mappin",
                label: "STREET ADDRESS",
                placeholder: "123 Main St",
                text: $job.streetAddress,
                contentType: .streetAddressLine1
            )
            .focused($focusedField, equals: .streetAddress)
            .onChange(of: job.streetAddress) { _, newValue in
                guard !suppressCompleter else { return }
                addressCompleter.searchText = newValue
            }

            // Address suggestions
            if focusedField == .streetAddress && !addressCompleter.suggestions.isEmpty {
                VStack(spacing: 0) {
                    ForEach(addressCompleter.suggestions, id: \.self) { suggestion in
                        Button {
                            selectSuggestion(suggestion)
                        } label: {
                            HStack(spacing: DS.Spacing.s) {
                                Image(systemName: "mappin.circle.fill")
                                    .font(.subheadline)
                                    .foregroundStyle(DS.Colors.primary.opacity(0.7))
                                    .frame(width: 24)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(suggestion.title)
                                        .font(.subheadline.weight(.medium))
                                        .foregroundStyle(.primary)
                                        .lineLimit(1)
                                    if !suggestion.subtitle.isEmpty {
                                        Text(suggestion.subtitle)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                            .lineLimit(1)
                                    }
                                }
                                Spacer()
                            }
                            .padding(.vertical, DS.Spacing.xs)
                            .padding(.horizontal, DS.Spacing.s)
                            .contentShape(.rect)
                        }
                        if suggestion != addressCompleter.suggestions.last {
                            Divider().padding(.leading, 36)
                        }
                    }
                }
                .background(Color(.tertiarySystemFill), in: .rect(cornerRadius: 10))
                .transition(.opacity.combined(with: .move(edge: .top)))
            }

            Divider().padding(.leading, 36)

            StyledTextField(
                icon: "building.2",
                label: "CITY",
                placeholder: "City",
                text: $job.city,
                contentType: .addressCity
            )
            .focused($focusedField, equals: .city)

            Divider().padding(.leading, 36)

            HStack(spacing: DS.Spacing.s) {
                StyledTextField(
                    icon: "map",
                    label: "STATE",
                    placeholder: "NC",
                    text: $job.state,
                    contentType: .addressState
                )
                .focused($focusedField, equals: .state)

                StyledTextField(
                    icon: "number",
                    label: "ZIP CODE",
                    placeholder: "28401",
                    text: $job.zipCode,
                    contentType: .postalCode,
                    keyboardType: .numberPad
                )
                .focused($focusedField, equals: .zipCode)
            }
        }
        .dsCard()
    }

    // MARK: - Contact Card

    private var contactCard: some View {
        VStack(alignment: .leading, spacing: DS.Spacing.m) {
            Label {
                Text("Contact Info")
                    .font(.headline)
            } icon: {
                Image(systemName: "person.crop.circle.fill")
                    .foregroundStyle(DS.Colors.primary)
            }

            StyledTextField(
                icon: "person.fill",
                label: "CONTACT NAME",
                placeholder: "Contact name",
                text: $job.contactName,
                contentType: .name
            )
            .focused($focusedField, equals: .contactName)

            Divider().padding(.leading, 36)

            StyledTextField(
                icon: "phone.fill",
                label: "PHONE",
                placeholder: "Phone number",
                text: $job.contactPhone,
                contentType: .telephoneNumber,
                keyboardType: .phonePad
            )
            .focused($focusedField, equals: .contactPhone)

            Divider().padding(.leading, 36)

            StyledTextField(
                icon: "envelope.fill",
                label: "EMAIL",
                placeholder: "Email address",
                text: $job.contactEmail,
                contentType: .emailAddress,
                keyboardType: .emailAddress
            )
            .focused($focusedField, equals: .contactEmail)
        }
        .dsCard()
    }

    // MARK: - Notes Card

    private var notesCard: some View {
        VStack(alignment: .leading, spacing: DS.Spacing.m) {
            Label {
                Text("Notes")
                    .font(.headline)
            } icon: {
                Image(systemName: "note.text")
                    .foregroundStyle(DS.Colors.primary)
            }

            StyledTextField(
                icon: "note.text",
                label: "NOTES",
                placeholder: "Additional notes about this job",
                text: $job.notes,
                axis: .vertical,
                lineLimit: 2...5
            )
            .focused($focusedField, equals: .notes)
        }
        .dsCard()
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        VStack(spacing: DS.Spacing.s) {
            Button {
                saveJob()
            } label: {
                HStack(spacing: DS.Spacing.xs) {
                    Spacer()
                    Image(systemName: "plus.circle.fill")
                    Text("Create Job")
                    Spacer()
                }
                .font(.headline)
                .foregroundStyle(.white)
                .frame(height: 54)
                .background(
                    canSave
                        ? DS.Gradients.primaryButton
                        : LinearGradient(colors: [.gray, .gray.opacity(0.85)], startPoint: .leading, endPoint: .trailing),
                    in: .capsule
                )
                .shadow(
                    color: canSave ? DS.Colors.primary.opacity(0.3) : .clear,
                    radius: DS.Shadow.radius,
                    y: DS.Shadow.y
                )
            }
            .disabled(!canSave || showSuccess)
            .sensoryFeedback(.impact(weight: .medium), trigger: showSuccess)

            if job.streetAddress.isEmpty {
                Text("Enter a street address to create the job.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(.top, DS.Spacing.micro)
    }

    // MARK: - Computed Properties

    private var canSave: Bool {
        !job.streetAddress.isEmpty
    }

    // MARK: - Address Selection

    private func selectSuggestion(_ suggestion: MKLocalSearchCompletion) {
        suppressCompleter = true
        addressCompleter.clear()
        focusedField = nil

        Task {
            guard let mapItem = await addressCompleter.resolve(suggestion) else {
                suppressCompleter = false
                return
            }
            let placemark = mapItem.placemark
            job.streetAddress = [placemark.subThoroughfare, placemark.thoroughfare]
                .compactMap { $0 }
                .joined(separator: " ")
            job.city = placemark.locality ?? ""
            job.state = placemark.administrativeArea ?? ""
            job.zipCode = placemark.postalCode ?? ""
            if let location = placemark.location {
                job.latitude = location.coordinate.latitude
                job.longitude = location.coordinate.longitude
            }
            suppressCompleter = false
        }
    }

    // MARK: - Save Action

    private func saveJob() {
        focusedField = nil
        addressCompleter.clear()

        // If coords already set (from autocomplete), save directly
        if job.latitude != nil {
            commitJob()
            return
        }

        // Otherwise geocode the manually-typed address
        let addressString = job.address
        guard !addressString.isEmpty else {
            commitJob()
            return
        }

        CLGeocoder().geocodeAddressString(addressString) { placemarks, _ in
            if let location = placemarks?.first?.location {
                job.latitude = location.coordinate.latitude
                job.longitude = location.coordinate.longitude
            }
            commitJob()
        }
    }

    private func commitJob() {
        let jobId = job.id

        // Upload property photo in background if present
        if let image = propertyImage,
           let data = image.jpegData(compressionQuality: 0.85) {
            Task {
                if let url = try? await store.uploadHouseImage(imageData: data, jobId: jobId) {
                    job.houseImageURL = url
                }
                store.addJob(job)
            }
        } else {
            store.addJob(job)
        }

        finishSave()
    }

    private func finishSave() {
        // Check if store caught an encoding error
        if let error = store.errorMessage {
            showError = true
            _ = error
            return
        }

        // Show success overlay then pop back
        withAnimation(DS.Animation.defaultSpring) {
            showSuccess = true
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
            dismiss()
        }
    }
}
