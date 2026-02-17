import SwiftUI

struct ContentView: View {
    var store: JobStore
    var locationManager: LocationManager
    var configStore: ConfigStore
    var authManager: AuthManager
    var networkMonitor: NetworkMonitor
    var photoSyncQueue: PhotoSyncQueue
    var timeTracker: TimeTracker

    @State private var showCapture = false
    @State private var showSettings = false
    @State private var navigateToActiveJob = false

    var body: some View {
        ZStack(alignment: .top) {
            JobsListView(
                store: store,
                locationManager: locationManager,
                configStore: configStore,
                networkMonitor: networkMonitor,
                syncQueue: photoSyncQueue,
                authManager: authManager,
                timeTracker: timeTracker,
                onSettingsTap: { showSettings = true },
                onCameraTap: { showCapture = true }
            )

            // Floating timer pill when clocked in
            if timeTracker.isTracking, let jobId = timeTracker.activeJobId {
                let jobAddress = store.jobs.first(where: { $0.id == jobId })?.streetAddress ?? "Job"
                FloatingTimerPill(
                    address: jobAddress,
                    elapsed: timeTracker.elapsedSeconds
                )
                .padding(.top, 4)
                .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(.easeInOut(duration: 0.3), value: timeTracker.isTracking)
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

// MARK: - Floating Timer Pill

private struct FloatingTimerPill: View {
    let address: String
    let elapsed: Int

    @State private var pulsing = false

    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(.green)
                .frame(width: 8, height: 8)
                .scaleEffect(pulsing ? 1.3 : 1.0)
                .opacity(pulsing ? 0.6 : 1.0)
                .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: pulsing)

            Text(address)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.primary)
                .lineLimit(1)

            Text(TimeTracker.formatDuration(elapsed))
                .font(.system(size: 13, weight: .bold, design: .monospaced))
                .foregroundStyle(DS.Colors.success)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(.ultraThinMaterial, in: .capsule)
        .shadow(color: .black.opacity(0.1), radius: 8, y: 2)
        .onAppear { pulsing = true }
    }
}
