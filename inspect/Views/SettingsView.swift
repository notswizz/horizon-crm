import SwiftUI

struct SettingsView: View {
    var store: JobStore
    var authManager: AuthManager
    @State private var showTutorial = false
    @AppStorage("hasSeenTutorial") private var hasSeenTutorial = false
    @State private var isEditingName = false
    @State private var editedName = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                inspectorCard
                tutorialCard
                signOutCard
            }
            .padding()
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showTutorial) {
            TutorialView()
                .onDisappear { hasSeenTutorial = true }
        }
        .onAppear {
            if !hasSeenTutorial { showTutorial = true }
        }
    }

    // MARK: - Inspector Card

    private var inspectorCard: some View {
        VStack(alignment: .leading, spacing: DS.Spacing.s) {
            HStack(spacing: 12) {
                Image(systemName: "person.fill")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 32, height: 32)
                    .background(DS.Colors.primary.gradient, in: .circle)

                if isEditingName {
                    TextField("Your name", text: $editedName)
                        .font(.system(size: 16, weight: .medium))
                        .textContentType(.name)
                        .submitLabel(.done)
                        .onSubmit { Task { await saveName() } }
                    Button("Save") {
                        Task { await saveName() }
                    }
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(DS.Colors.primary)
                } else {
                    Text(authManager.displayName.isEmpty ? "No name set" : authManager.displayName)
                        .font(.system(size: 16, weight: .semibold))
                    Spacer()
                    Button {
                        editedName = authManager.displayName
                        isEditingName = true
                    } label: {
                        Image(systemName: "pencil")
                            .font(.system(size: 14))
                            .foregroundStyle(.secondary)
                    }
                }
            }

            if let email = authManager.email {
                Text(email)
                    .font(DS.Typography.caption)
                    .foregroundStyle(.secondary)
            }

            if let companyName = authManager.companyName, !companyName.isEmpty {
                HStack(spacing: 6) {
                    Image(systemName: "building.2.fill")
                        .font(.system(size: 11))
                        .foregroundStyle(.tertiary)
                    Text(companyName)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(.secondary)
                }
            }
        }
        .dsCard()
    }

    // MARK: - Tutorial Card

    private var tutorialCard: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label {
                Text("App Tutorial")
                    .font(.headline)
            } icon: {
                Image(systemName: "book.fill")
                    .foregroundStyle(DS.Colors.primary)
            }

            Button {
                showTutorial = true
            } label: {
                HStack(spacing: 8) {
                    Spacer()
                    Image(systemName: "play.fill")
                    Text("Start Tutorial")
                    Spacer()
                }
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(.white)
                .frame(height: 44)
                .background(DS.Colors.primary.gradient, in: .rect(cornerRadius: 10))
            }
        }
        .dsCard()
    }

    // MARK: - Sign Out Card

    private var signOutCard: some View {
        Button {
            authManager.signOut()
        } label: {
            HStack(spacing: 8) {
                Spacer()
                Image(systemName: "rectangle.portrait.and.arrow.right")
                Text("Sign Out")
                Spacer()
            }
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(DS.Colors.error)
            .frame(height: 44)
            .background(DS.Colors.error.opacity(0.1), in: .rect(cornerRadius: 10))
        }
        .dsCard()
    }

    // MARK: - Save Name

    private func saveName() async {
        await authManager.saveDisplayName(editedName)
        isEditingName = false
    }
}
