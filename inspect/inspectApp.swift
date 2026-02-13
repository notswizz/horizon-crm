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
    @State private var store = JobStore()

    var body: some Scene {
        WindowGroup {
            ContentView(store: store)
                .onAppear { store.startListening() }
        }
    }
}
