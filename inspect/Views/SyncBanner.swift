import SwiftUI

struct SyncBanner: View {
    var networkMonitor: NetworkMonitor
    var syncQueue: PhotoSyncQueue
    var jobStore: JobStore

    @State private var showSynced = false
    @State private var wasOffline = false

    var body: some View {
        Group {
            if !networkMonitor.isConnected {
                banner(
                    icon: "icloud.slash.fill",
                    text: "Offline — changes will sync when connected",
                    color: DS.Colors.warning,
                    spinning: false
                )
            } else if syncQueue.isSyncing {
                banner(
                    icon: "arrow.triangle.2.circlepath.icloud.fill",
                    text: "Syncing \(syncQueue.pendingCount) photo\(syncQueue.pendingCount == 1 ? "" : "s")...",
                    color: DS.Colors.info,
                    spinning: true
                )
            } else if showSynced {
                banner(
                    icon: "checkmark.icloud.fill",
                    text: "All synced",
                    color: DS.Colors.success,
                    spinning: false
                )
            }
        }
        .animation(.easeInOut(duration: 0.3), value: networkMonitor.isConnected)
        .animation(.easeInOut(duration: 0.3), value: syncQueue.isSyncing)
        .animation(.easeInOut(duration: 0.3), value: showSynced)
        .onChange(of: networkMonitor.isConnected) { _, connected in
            if !connected {
                wasOffline = true
                showSynced = false
            }
        }
        .onChange(of: syncQueue.isSyncing) { old, new in
            if old && !new && wasOffline {
                flashSynced()
            }
        }
    }

    private func flashSynced() {
        showSynced = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            showSynced = false
            wasOffline = false
        }
    }

    private func banner(icon: String, text: String, color: Color, spinning: Bool) -> some View {
        HStack(spacing: 8) {
            if spinning {
                ProgressView()
                    .controlSize(.mini)
                    .tint(.white)
            } else {
                Image(systemName: icon)
                    .font(.caption.weight(.semibold))
            }
            Text(text)
                .font(.caption.weight(.semibold))
        }
        .foregroundStyle(.white)
        .frame(maxWidth: .infinity)
        .frame(height: 32)
        .background(color)
        .transition(.move(edge: .top).combined(with: .opacity))
    }
}
