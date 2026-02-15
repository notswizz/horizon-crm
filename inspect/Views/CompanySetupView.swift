import SwiftUI

struct CompanySetupView: View {
    var authManager: AuthManager

    @State private var joinCode = ""
    @State private var isSaving = false

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            VStack(spacing: DS.Spacing.s) {
                Image("Logo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 64, height: 64)
                    .clipShape(.rect(cornerRadius: 14))
                    .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)

                Text("Join Your Company")
                    .font(DS.Typography.display)

                Text("Enter the code from your company admin\nto get started.")
                    .font(DS.Typography.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.bottom, DS.Spacing.xxl)

            VStack(spacing: DS.Spacing.m) {
                HStack(spacing: DS.Spacing.s) {
                    Image(systemName: "number")
                        .foregroundStyle(DS.Colors.primary)
                        .frame(width: 24)
                    TextField("Company code", text: $joinCode)
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                        .font(.system(size: 20, weight: .bold, design: .monospaced))
                        .multilineTextAlignment(.center)
                        .submitLabel(.done)
                        .onChange(of: joinCode) { _, newValue in
                            joinCode = String(newValue.uppercased().prefix(6))
                        }
                        .onSubmit { Task { await join() } }
                }
                .padding()
                .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.button))
                .overlay(
                    RoundedRectangle(cornerRadius: DS.Radius.button)
                        .strokeBorder(DS.Colors.border, lineWidth: 1)
                )

                if let error = authManager.errorMessage {
                    Text(error)
                        .font(DS.Typography.caption)
                        .foregroundStyle(DS.Colors.error)
                        .multilineTextAlignment(.center)
                }

                Button {
                    Task { await join() }
                } label: {
                    if isSaving {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("Join Company")
                    }
                }
                .buttonStyle(DSPrimaryButtonStyle(enabled: canJoin))
                .disabled(!canJoin || isSaving)
            }
            .padding(.horizontal, DS.Spacing.xl)

            Spacer()
            Spacer()
        }
        .background(Color(.systemGroupedBackground))
    }

    private var canJoin: Bool {
        !joinCode.trimmingCharacters(in: .whitespaces).isEmpty
    }

    private func join() async {
        isSaving = true
        await authManager.joinCompany(code: joinCode)
        isSaving = false
    }
}
