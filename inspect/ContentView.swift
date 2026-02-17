import SwiftUI

struct ContentView: View {
    var store: JobStore
    var locationManager: LocationManager
    var configStore: ConfigStore
    var authManager: AuthManager
    var networkMonitor: NetworkMonitor
    var photoSyncQueue: PhotoSyncQueue

    @State private var showCapture = false
    @State private var showSettings = false

    var body: some View {
        JobsListView(
            store: store,
            locationManager: locationManager,
            configStore: configStore,
            networkMonitor: networkMonitor,
            syncQueue: photoSyncQueue,
            onSettingsTap: { showSettings = true },
            onCameraTap: { showCapture = true }
        )
        .fullScreenCover(isPresented: $showCapture) {
            NavigationStack {
                QuickCaptureView(store: store, locationManager: locationManager, configStore: configStore, networkMonitor: networkMonitor, photoSyncQueue: photoSyncQueue)
                    .navigationTitle("Quick Capture")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .topBarLeading) {
                            Button("Close") { showCapture = false }
                        }
                    }
            }
        }
        .sheet(isPresented: $showSettings) {
            NavigationStack {
                SettingsView(store: store, authManager: authManager)
            }
            .presentationDragIndicator(.visible)
        }
    }
}
