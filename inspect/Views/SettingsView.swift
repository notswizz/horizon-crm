import SwiftUI

struct SettingsView: View {
    var store: JobStore
    @AppStorage("inspectorName") private var inspectorName = ""
    @State private var showTutorial = false
    @AppStorage("hasSeenTutorial") private var hasSeenTutorial = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    inspectorCard
                    tutorialCard
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Image("Logo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 36, height: 36)
                        .clipShape(.rect(cornerRadius: 8))
                }
            }
            .sheet(isPresented: $showTutorial) {
                TutorialView()
                    .onDisappear { hasSeenTutorial = true }
            }
            .onAppear {
                if !hasSeenTutorial { showTutorial = true }
            }
        }
    }

    // MARK: - Inspector Card

    private var inspectorCard: some View {
        HStack(spacing: 12) {
            Image(systemName: "person.fill")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 32, height: 32)
                .background(DS.Colors.primary.gradient, in: .circle)

            if inspectorName.trimmingCharacters(in: .whitespaces).isEmpty {
                TextField("Your name", text: $inspectorName)
                    .font(.system(size: 16, weight: .medium))
                    .textContentType(.name)
                    .submitLabel(.done)
            } else {
                Text(inspectorName)
                    .font(.system(size: 16, weight: .semibold))
                Spacer()
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
}
