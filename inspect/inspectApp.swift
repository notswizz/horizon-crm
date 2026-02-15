import SwiftUI
import FirebaseCore

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        FirebaseApp.configure()
        return true
    }
}

@main
struct inspectApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
    @State private var authManager = AuthManager()
    @State private var store = JobStore()
    @State private var locationManager = LocationManager()
    @State private var configStore = ConfigStore()

    var body: some Scene {
        WindowGroup {
            Group {
                if authManager.isLoading {
                    VStack(spacing: 16) {
                        Image("Logo")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 64, height: 64)
                            .clipShape(.rect(cornerRadius: 14))
                        ProgressView()
                            .tint(DS.Colors.primary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color(.systemGroupedBackground))

                } else if !authManager.isSignedIn {
                    LoginView(authManager: authManager)

                } else if authManager.needsCompanySetup {
                    CompanySetupView(authManager: authManager)

                } else if authManager.needsNameSetup {
                    NameSetupView(authManager: authManager)

                } else {
                    ContentView(store: store, locationManager: locationManager, configStore: configStore, authManager: authManager)
                        .onAppear { startListeningWithCompany() }
                        .onChange(of: authManager.companyId) { _, _ in
                            startListeningWithCompany()
                        }
                }
            }
            .onAppear {
                // Start auth listener AFTER Firebase is configured by AppDelegate
                authManager.start()
            }
        }
    }

    private func startListeningWithCompany() {
        store.companyId = authManager.companyId
        store.startListening()
    }
}
