import SwiftUI

struct ContentView: View {
    var store: JobStore
    var locationManager: LocationManager
    var configStore: ConfigStore
    var authManager: AuthManager

    var body: some View {
        TabView {
            Tab("Jobs", systemImage: "list.clipboard") {
                JobsListView(store: store, locationManager: locationManager, configStore: configStore)
            }

            Tab("Capture", systemImage: "camera.fill") {
                QuickCaptureView(store: store, locationManager: locationManager, configStore: configStore)
            }

            Tab("Settings", systemImage: "gearshape.fill") {
                SettingsView(store: store, authManager: authManager)
            }
        }
        .tint(DS.Colors.primary)
    }
}
