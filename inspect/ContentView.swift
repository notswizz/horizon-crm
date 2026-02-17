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
        ZStack(alignment: .bottomTrailing) {
            JobsListView(
                store: store,
                locationManager: locationManager,
                configStore: configStore,
                networkMonitor: networkMonitor,
                syncQueue: photoSyncQueue,
                onSettingsTap: { showSettings = true }
            )

            // Floating camera button
            Button {
                showCapture = true
            } label: {
                Image(systemName: "camera.fill")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 60, height: 60)
                    .background(
                        DS.Gradients.primaryButton,
                        in: .circle
                    )
                    .shadow(color: DS.Colors.primary.opacity(0.35), radius: 8, y: 4)
            }
            .padding(.trailing, 20)
            .padding(.bottom, 24)
            .sensoryFeedback(.impact(weight: .medium), trigger: showCapture)
        }
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
