import SwiftUI
import FirebaseCore
import FirebaseFirestore
import UserNotifications

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        FirebaseApp.configure()

        // Enable offline persistence with 100MB cache
        let settings = Firestore.firestore().settings
        settings.isPersistenceEnabled = true
        settings.cacheSizeBytes = 100 * 1024 * 1024
        Firestore.firestore().settings = settings

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
    @State private var networkMonitor = NetworkMonitor()
    @State private var photoSyncQueue = PhotoSyncQueue()
    @State private var timeTracker = TimeTracker()

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
                    ContentView(
                        store: store,
                        locationManager: locationManager,
                        configStore: configStore,
                        authManager: authManager,
                        networkMonitor: networkMonitor,
                        photoSyncQueue: photoSyncQueue,
                        timeTracker: timeTracker
                    )
                    .onAppear { startListeningWithCompany() }
                    .onChange(of: authManager.companyId) { _, _ in
                        startListeningWithCompany()
                    }
                }
            }
            .onAppear {
                authManager.start()
                timeTracker.restoreActiveSession()
                UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
            }
            .onChange(of: networkMonitor.isConnected) { _, connected in
                if connected {
                    photoSyncQueue.processQueue()
                }
            }
        }
    }

    private func startListeningWithCompany() {
        store.companyId = authManager.companyId
        store.startListening()
        configStore.companyId = authManager.companyId
        configStore.reload()
    }
}
