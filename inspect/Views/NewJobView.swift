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
                VStack(spacing: 14) {
                    propertyPhotoCard
                    jobDetailsCard
                    contactCard
                    notesCard
                    actionButtons
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 20)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Color(.systemGroupedBackground))
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
        VStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(DS.Colors.success.opacity(0.15))
                    .frame(width: 80, height: 80)
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 36))
                    .foregroundStyle(DS.Colors.success)
            }
            Text("Job Created")
                .font(.system(size: 20, weight: .bold))
            Text("Switch to the Jobs tab to view it.")
                .font(.system(size: 14))
                .foregroundStyle(.secondary)
        }
        .padding(32)
        .background(.ultraThinMaterial, in: .rect(cornerRadius: 24))
        .shadow(color: .black.opacity(0.12), radius: 24, y: 8)
    }

    // MARK: - Property Photo Card

    private var propertyPhotoCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 6) {
                Image(systemName: "photo.fill")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 22, height: 22)
                    .background(DS.Colors.primary.gradient, in: .rect(cornerRadius: 6))
                Text("PROPERTY PHOTO")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.secondary)
                    .tracking(0.5)

                Spacer()

                if propertyImage != nil {
                    HStack(spacing: 3) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 10))
                        Text("Added")
                            .font(.system(size: 10, weight: .semibold))
                    }
                    .foregroundStyle(DS.Colors.success)
                }
            }

            if let propertyImage {
                ZStack(alignment: .topTrailing) {
                    Image(uiImage: propertyImage)
                        .resizable()
                        .scaledToFill()
                        .frame(maxWidth: .infinity)
                        .frame(height: 200)
                        .clipped()
                        .clipShape(.rect(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .strokeBorder(.white.opacity(0.2), lineWidth: 1)
                        )

                    Button {
                        withAnimation(DS.Animation.defaultSpring) {
                            self.propertyImage = nil
                        }
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 24))
                            .foregroundStyle(.white, .black.opacity(0.5))
                            .padding(10)
                    }
                }
            } else {
                HStack(spacing: 10) {
                    // Camera button
                    Button {
                        if UIImagePickerController.isSourceTypeAvailable(.camera) {
                            showCamera = true
                        }
                    } label: {
                        VStack(spacing: 8) {
                            ZStack {
                                Circle()
                                    .fill(DS.Colors.primary.opacity(0.1))
                                    .frame(width: 44, height: 44)
                                Image(systemName: "camera.fill")
                                    .font(.system(size: 18))
                                    .foregroundStyle(DS.Colors.primary)
                            }
                            Text("Camera")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 100)
                        .background(DS.Colors.primary.opacity(0.04), in: .rect(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .strokeBorder(style: StrokeStyle(lineWidth: 1.5, dash: [8, 5]))
                                .foregroundStyle(DS.Colors.primary.opacity(0.2))
                        )
                    }

                    // Library button
                    PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                        VStack(spacing: 8) {
                            ZStack {
                                Circle()
                                    .fill(DS.Colors.info.opacity(0.1))
                                    .frame(width: 44, height: 44)
                                Image(systemName: "photo.on.rectangle")
                                    .font(.system(size: 18))
                                    .foregroundStyle(DS.Colors.info)
                            }
                            Text("Library")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 100)
                        .background(DS.Colors.info.opacity(0.04), in: .rect(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .strokeBorder(style: StrokeStyle(lineWidth: 1.5, dash: [8, 5]))
                                .foregroundStyle(DS.Colors.info.opacity(0.2))
                        )
                    }
                }
            }
        }
        .padding(16)
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }

    // MARK: - Job Details Card

    private var jobDetailsCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 6) {
                Image(systemName: "mappin")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 22, height: 22)
                    .background(DS.Colors.error.gradient, in: .rect(cornerRadius: 6))
                Text("ADDRESS")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.secondary)
                    .tracking(0.5)
            }

            // Street address
            VStack(alignment: .leading, spacing: 4) {
                Text("Street Address")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.tertiary)
                TextField("123 Main St", text: $job.streetAddress)
                    .font(.system(size: 15))
                    .textContentType(.streetAddressLine1)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 11)
                    .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 10))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .strokeBorder(
                                focusedField == .streetAddress ? DS.Colors.primary.opacity(0.5) : Color(.systemGray4),
                                lineWidth: 1
                            )
                    )
                    .focused($focusedField, equals: .streetAddress)
                    .onChange(of: job.streetAddress) { _, newValue in
                        guard !suppressCompleter else { return }
                        addressCompleter.searchText = newValue
                    }
            }

            // Address suggestions
            if focusedField == .streetAddress && !addressCompleter.suggestions.isEmpty {
                VStack(spacing: 0) {
                    ForEach(addressCompleter.suggestions, id: \.self) { suggestion in
                        Button {
                            selectSuggestion(suggestion)
                        } label: {
                            HStack(spacing: 10) {
                                Image(systemName: "mappin.circle.fill")
                                    .font(.system(size: 14))
                                    .foregroundStyle(DS.Colors.primary.opacity(0.7))
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(suggestion.title)
                                        .font(.system(size: 13, weight: .medium))
                                        .foregroundStyle(.primary)
                                        .lineLimit(1)
                                    if !suggestion.subtitle.isEmpty {
                                        Text(suggestion.subtitle)
                                            .font(.system(size: 11))
                                            .foregroundStyle(.tertiary)
                                            .lineLimit(1)
                                    }
                                }
                                Spacer()
                                Image(systemName: "arrow.up.left")
                                    .font(.system(size: 10, weight: .semibold))
                                    .foregroundStyle(.quaternary)
                            }
                            .padding(.vertical, 10)
                            .padding(.horizontal, 12)
                            .contentShape(.rect)
                        }
                        if suggestion != addressCompleter.suggestions.last {
                            Divider().padding(.leading, 36)
                        }
                    }
                }
                .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .strokeBorder(DS.Colors.primary.opacity(0.15), lineWidth: 1)
                )
                .transition(.opacity.combined(with: .move(edge: .top)))
            }

            // City
            VStack(alignment: .leading, spacing: 4) {
                Text("City")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.tertiary)
                TextField("City", text: $job.city)
                    .font(.system(size: 15))
                    .textContentType(.addressCity)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 11)
                    .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 10))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .strokeBorder(Color(.systemGray4), lineWidth: 1)
                    )
                    .focused($focusedField, equals: .city)
            }

            // State + Zip
            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("State")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.tertiary)
                    TextField("NC", text: $job.state)
                        .font(.system(size: 15))
                        .textContentType(.addressState)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 11)
                        .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 10))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .strokeBorder(Color(.systemGray4), lineWidth: 1)
                        )
                        .focused($focusedField, equals: .state)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Zip Code")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.tertiary)
                    TextField("28401", text: $job.zipCode)
                        .font(.system(size: 15))
                        .textContentType(.postalCode)
                        .keyboardType(.numberPad)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 11)
                        .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 10))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .strokeBorder(Color(.systemGray4), lineWidth: 1)
                        )
                        .focused($focusedField, equals: .zipCode)
                }
            }
        }
        .padding(16)
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }

    // MARK: - Contact Card

    private var contactCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 6) {
                Image(systemName: "person.fill")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 22, height: 22)
                    .background(DS.Colors.info.gradient, in: .rect(cornerRadius: 6))
                Text("CONTACT INFO")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.secondary)
                    .tracking(0.5)
            }

            // Contact Name
            VStack(alignment: .leading, spacing: 4) {
                Text("Name")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.tertiary)
                HStack(spacing: 10) {
                    Image(systemName: "person.fill")
                        .font(.system(size: 12))
                        .foregroundStyle(.tertiary)
                    TextField("Contact name", text: $job.contactName)
                        .font(.system(size: 15))
                        .textContentType(.name)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 11)
                .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .strokeBorder(Color(.systemGray4), lineWidth: 1)
                )
                .focused($focusedField, equals: .contactName)
            }

            // Phone
            VStack(alignment: .leading, spacing: 4) {
                Text("Phone")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.tertiary)
                HStack(spacing: 10) {
                    Image(systemName: "phone.fill")
                        .font(.system(size: 12))
                        .foregroundStyle(.tertiary)
                    TextField("Phone number", text: $job.contactPhone)
                        .font(.system(size: 15))
                        .textContentType(.telephoneNumber)
                        .keyboardType(.phonePad)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 11)
                .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .strokeBorder(Color(.systemGray4), lineWidth: 1)
                )
                .focused($focusedField, equals: .contactPhone)
            }

            // Email
            VStack(alignment: .leading, spacing: 4) {
                Text("Email")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.tertiary)
                HStack(spacing: 10) {
                    Image(systemName: "envelope.fill")
                        .font(.system(size: 12))
                        .foregroundStyle(.tertiary)
                    TextField("Email address", text: $job.contactEmail)
                        .font(.system(size: 15))
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 11)
                .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .strokeBorder(Color(.systemGray4), lineWidth: 1)
                )
                .focused($focusedField, equals: .contactEmail)
            }
        }
        .padding(16)
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }

    // MARK: - Notes Card

    private var notesCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 6) {
                Image(systemName: "note.text")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 22, height: 22)
                    .background(DS.Colors.warning.gradient, in: .rect(cornerRadius: 6))
                Text("NOTES")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.secondary)
                    .tracking(0.5)
            }

            TextField("Additional notes about this job...", text: $job.notes, axis: .vertical)
                .lineLimit(3...8)
                .font(.system(size: 15))
                .padding(12)
                .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .strokeBorder(Color(.systemGray4), lineWidth: 1)
                )
                .focused($focusedField, equals: .notes)
        }
        .padding(16)
        .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.card))
        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        VStack(spacing: 10) {
            Button {
                saveJob()
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 16, weight: .semibold))
                    Text("Create Job")
                        .font(.system(size: 16, weight: .bold))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 52)
                .background(
                    canSave
                        ? AnyShapeStyle(DS.Colors.primary.gradient)
                        : AnyShapeStyle(Color(.systemGray3).gradient),
                    in: .rect(cornerRadius: 14)
                )
                .shadow(
                    color: canSave ? DS.Colors.primary.opacity(0.3) : .clear,
                    radius: 10,
                    y: 4
                )
            }
            .disabled(!canSave || showSuccess)
            .sensoryFeedback(.impact(weight: .medium), trigger: showSuccess)

            if job.streetAddress.isEmpty {
                Text("Enter a street address to create the job.")
                    .font(.system(size: 12))
                    .foregroundStyle(.tertiary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(.top, 4)
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
