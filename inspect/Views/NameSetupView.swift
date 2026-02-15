import SwiftUI

struct NameSetupView: View {
    var authManager: AuthManager

    @State private var name = ""
    @State private var isSaving = false

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: DS.Spacing.s) {
                Image(systemName: "person.crop.circle.badge.plus")
                    .font(.system(size: 48))
                    .foregroundStyle(DS.Colors.primary)

                Text("What's your name?")
                    .font(DS.Typography.display)

                Text("This will appear on inspection forms\nand be visible to your team.")
                    .font(DS.Typography.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.bottom, DS.Spacing.xxl)

            VStack(spacing: DS.Spacing.m) {
                HStack(spacing: DS.Spacing.s) {
                    Image(systemName: "person.fill")
                        .foregroundStyle(DS.Colors.primary)
                        .frame(width: 24)
                    TextField("Your full name", text: $name)
                        .textContentType(.name)
                        .submitLabel(.done)
                        .onSubmit { Task { await save() } }
                }
                .padding()
                .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.button))
                .overlay(
                    RoundedRectangle(cornerRadius: DS.Radius.button)
                        .strokeBorder(DS.Colors.border, lineWidth: 1)
                )

                Button {
                    Task { await save() }
                } label: {
                    if isSaving {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("Continue")
                    }
                }
                .buttonStyle(DSPrimaryButtonStyle(enabled: canSave))
                .disabled(!canSave || isSaving)
            }
            .padding(.horizontal, DS.Spacing.xl)

            Spacer()
            Spacer()
        }
        .background(Color(.systemGroupedBackground))
    }

    private var canSave: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty
    }

    private func save() async {
        isSaving = true
        await authManager.saveDisplayName(name)
        isSaving = false
    }
}
