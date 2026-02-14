import SwiftUI

struct ContentView: View {
    var store: JobStore

    var body: some View {
        TabView {
            Tab("Jobs", systemImage: "list.clipboard") {
                JobsListView(store: store)
            }

            Tab("Capture", systemImage: "camera.fill") {
                QuickCaptureView(store: store)
            }

            Tab("Settings", systemImage: "gearshape.fill") {
                SettingsView(store: store)
            }
        }
        .tint(DS.Colors.primary)
    }
}
