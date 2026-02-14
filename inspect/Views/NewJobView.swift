import SwiftUI

// MARK: - Focus Fields

private enum Field: Hashable {
    case address
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
    @FocusState private var focusedField: Field?

    var body: some View {
        ZStack {
            ScrollView {
                VStack(spacing: DS.Spacing.l) {
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
                label: "ADDRESS",
                placeholder: "Enter address",
                text: $job.address,
                contentType: .fullStreetAddress
            )
            .focused($focusedField, equals: .address)
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

            if job.address.isEmpty {
                Text("Enter an address to create the job.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(.top, DS.Spacing.micro)
    }

    // MARK: - Computed Properties

    private var canSave: Bool {
        !job.address.isEmpty
    }

    // MARK: - Save Action

    private func saveJob() {
        focusedField = nil
        store.addJob(job)

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
