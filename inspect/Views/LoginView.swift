import SwiftUI

struct LoginView: View {
    var authManager: AuthManager

    @State private var isSignUp = false
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var appeared = false

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // Logo + Title + Tagline
            VStack(spacing: 4) {
                ZStack {
                    Circle()
                        .fill(DS.Colors.primary.opacity(0.12))
                        .frame(width: 160, height: 160)
                        .blur(radius: 40)

                    Image("Logo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 96, height: 96)
                        .clipShape(.rect(cornerRadius: 22))
                        .shadow(color: DS.Shadow.color, radius: DS.Shadow.radius, y: DS.Shadow.y)
                }

                Text("RetrofitIQ")
                    .font(.system(size: 34, weight: .bold, design: .rounded))
                    .padding(.top, DS.Spacing.s)

                Text("Smart tools for energy contractors")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(.secondary)
            }
            .opacity(appeared ? 1 : 0)
            .offset(y: appeared ? 0 : 10)
            .animation(.spring(response: 0.6, dampingFraction: 0.8), value: appeared)
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
        .background(
            LinearGradient(
                colors: [Color(.systemBackground), DS.Colors.primary.opacity(0.04)],
                startPoint: .top,
                endPoint: .bottom
            )
        )
        .onAppear { appeared = true }
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
