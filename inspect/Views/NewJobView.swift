import SwiftUI

// MARK: - Design Tokens

private enum Design {
    static let cardRadius: CGFloat = 16
    static let cardPadding: CGFloat = 20
    static let shadowColor = Color.black.opacity(0.06)
    static let shadowRadius: CGFloat = 12
    static let shadowY: CGFloat = 4
    static let sectionSpacing: CGFloat = 20
    static let innerSpacing: CGFloat = 16
    static let spring = Animation.spring(response: 0.35, dampingFraction: 0.8)
}

// MARK: - Card Style Modifier

private struct CardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(Design.cardPadding)
            .background(.background, in: .rect(cornerRadius: Design.cardRadius))
            .shadow(color: Design.shadowColor, radius: Design.shadowRadius, y: Design.shadowY)
    }
}

extension View {
    func cardStyle() -> some View {
        modifier(CardStyle())
    }
}

// MARK: - Styled Text Field

struct StyledTextField: View {
    let icon: String
    let label: String
    let placeholder: String
    @Binding var text: String
    var axis: Axis = .horizontal
    var lineLimit: ClosedRange<Int>?
    var contentType: UITextContentType?
    var keyboardType: UIKeyboardType = .default

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(.orange)
                .frame(width: 24, alignment: .center)
                .padding(.top, 8)

            VStack(alignment: .leading, spacing: 4) {
                Text(label)
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)

                if axis == .vertical, let lineLimit {
                    TextField(placeholder, text: $text, axis: .vertical)
                        .lineLimit(lineLimit)
                        .textContentType(contentType)
                        .keyboardType(keyboardType)
                } else {
                    TextField(placeholder, text: $text)
                        .textContentType(contentType)
                        .keyboardType(keyboardType)
                }
            }
        }
    }
}

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
                VStack(spacing: Design.sectionSpacing) {
                    jobDetailsCard
                    contactCard
                    notesCard
                    actionButtons
                }
                .padding()
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

            // Success overlay
            if showSuccess {
                successOverlay
                    .transition(.scale.combined(with: .opacity))
            }
        }
    }

    // MARK: - Success Overlay

    private var successOverlay: some View {
        VStack(spacing: 12) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 56))
                .foregroundStyle(.green)
            Text("Job Created")
                .font(.title3.weight(.semibold))
            Text("Switch to the Jobs tab to view it.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(32)
        .background(.ultraThinMaterial, in: .rect(cornerRadius: 20))
        .shadow(color: .black.opacity(0.1), radius: 20, y: 8)
    }

    // MARK: - Job Details Card

    private var jobDetailsCard: some View {
        VStack(alignment: .leading, spacing: Design.innerSpacing) {
            Label {
                Text("Address")
                    .font(.headline)
            } icon: {
                Image(systemName: "mappin.circle.fill")
                    .foregroundStyle(.orange)
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
        .cardStyle()
    }

    // MARK: - Contact Card

    private var contactCard: some View {
        VStack(alignment: .leading, spacing: Design.innerSpacing) {
            Label {
                Text("Contact Info")
                    .font(.headline)
            } icon: {
                Image(systemName: "person.crop.circle.fill")
                    .foregroundStyle(.orange)
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
        .cardStyle()
    }

    // MARK: - Notes Card

    private var notesCard: some View {
        VStack(alignment: .leading, spacing: Design.innerSpacing) {
            Label {
                Text("Notes")
                    .font(.headline)
            } icon: {
                Image(systemName: "note.text")
                    .foregroundStyle(.orange)
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
        .cardStyle()
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        VStack(spacing: 12) {
            Button {
                saveJob()
            } label: {
                HStack(spacing: 8) {
                    Spacer()
                    Image(systemName: "plus.circle.fill")
                    Text("Create Job")
                    Spacer()
                }
                .font(.headline)
                .foregroundStyle(.white)
                .frame(height: 54)
                .background(
                    LinearGradient(
                        colors: canSave
                            ? [.orange, .orange.opacity(0.85)]
                            : [.gray, .gray.opacity(0.85)],
                        startPoint: .leading,
                        endPoint: .trailing
                    ),
                    in: .capsule
                )
                .shadow(
                    color: canSave ? .orange.opacity(0.3) : .clear,
                    radius: 12,
                    y: 4
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
        .padding(.top, 4)
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
        withAnimation(Design.spring) {
            showSuccess = true
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
            dismiss()
        }
    }
}
