import SwiftUI

struct LoginView: View {
    var authManager: AuthManager

    @State private var isSignUp = false
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // Logo + Title
            VStack(spacing: DS.Spacing.s) {
                Image("Logo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 72, height: 72)
                    .clipShape(.rect(cornerRadius: 16))
                    .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)

                Text("RetrofitIQ")
                    .font(DS.Typography.display)

                Text(isSignUp ? "Create an account" : "Sign in to continue")
                    .font(DS.Typography.subheadline)
                    .foregroundStyle(.secondary)
            }
            .padding(.bottom, DS.Spacing.xxl)

            // Form
            VStack(spacing: DS.Spacing.m) {
                VStack(spacing: DS.Spacing.s) {
                    HStack(spacing: DS.Spacing.s) {
                        Image(systemName: "envelope.fill")
                            .foregroundStyle(DS.Colors.primary)
                            .frame(width: 24)
                        TextField("Email", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                    }
                    .padding()
                    .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.button))
                    .overlay(
                        RoundedRectangle(cornerRadius: DS.Radius.button)
                            .strokeBorder(DS.Colors.border, lineWidth: 1)
                    )

                    HStack(spacing: DS.Spacing.s) {
                        Image(systemName: "lock.fill")
                            .foregroundStyle(DS.Colors.primary)
                            .frame(width: 24)
                        SecureField("Password", text: $password)
                            .textContentType(isSignUp ? .newPassword : .password)
                    }
                    .padding()
                    .background(DS.Colors.surface, in: .rect(cornerRadius: DS.Radius.button))
                    .overlay(
                        RoundedRectangle(cornerRadius: DS.Radius.button)
                            .strokeBorder(DS.Colors.border, lineWidth: 1)
                    )
                }

                if let error = authManager.errorMessage {
                    Text(error)
                        .font(DS.Typography.caption)
                        .foregroundStyle(DS.Colors.error)
                        .multilineTextAlignment(.center)
                }

                Button {
                    Task { await submit() }
                } label: {
                    if isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text(isSignUp ? "Sign Up" : "Sign In")
                    }
                }
                .buttonStyle(DSPrimaryButtonStyle(enabled: canSubmit))
                .disabled(!canSubmit || isLoading)

                // Toggle sign in / sign up
                HStack(spacing: 4) {
                    Text(isSignUp ? "Already have an account?" : "Don't have an account?")
                        .font(DS.Typography.caption)
                        .foregroundStyle(.secondary)
                    Button(isSignUp ? "Sign In" : "Sign Up") {
                        isSignUp.toggle()
                        authManager.errorMessage = nil
                    }
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(DS.Colors.primary)
                }
            }
            .padding(.horizontal, DS.Spacing.xl)

            Spacer()
            Spacer()
        }
        .background(Color(.systemGroupedBackground))
    }

    private var canSubmit: Bool {
        !email.trimmingCharacters(in: .whitespaces).isEmpty &&
        !password.isEmpty
    }

    private func submit() async {
        isLoading = true
        if isSignUp {
            await authManager.signUpUser(email: email, password: password)
        } else {
            await authManager.signIn(email: email, password: password)
        }
        isLoading = false
    }
}
