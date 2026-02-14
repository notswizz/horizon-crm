import SwiftUI
import PhotosUI

/// A single-photo picker that shows a thumbnail or an "add" placeholder.
/// During editing, `photoRef` holds a local temp filename.
/// After save, `photoRef` holds a Firebase Storage download URL.
struct SinglePhotoPicker: View {
    let label: String
    @Binding var photoRef: String?
    var store: JobStore
    @State private var selectedItem: PhotosPickerItem?
    @State private var displayImage: UIImage?

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if !label.isEmpty {
                Text(label)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }

            ZStack(alignment: .topTrailing) {
                if let displayImage {
                    Image(uiImage: displayImage)
                        .resizable()
                        .scaledToFill()
                        .frame(maxWidth: .infinity)
                        .frame(height: 120)
                        .clipped()
                        .clipShape(.rect(cornerRadius: 10))
                        .overlay(alignment: .bottomTrailing) {
                            PhotosPicker(selection: $selectedItem, matching: .images) {
                                Image(systemName: "arrow.triangle.2.circlepath.camera.fill")
                                    .font(.caption)
                                    .foregroundStyle(.white)
                                    .padding(6)
                                    .background(.black.opacity(0.5), in: .circle)
                            }
                            .padding(6)
                            .onChange(of: selectedItem) { _, newItem in
                                importPhoto(from: newItem)
                            }
                        }

                    Button {
                        photoRef = nil
                        self.displayImage = nil
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.caption)
                            .foregroundStyle(.white, .black.opacity(0.5))
                            .padding(6)
                    }
                } else {
                    PhotosPicker(selection: $selectedItem, matching: .images) {
                        VStack(spacing: 6) {
                            Image(systemName: "camera.fill")
                                .font(.title3)
                            Text("Add Photo")
                                .font(.caption)
                        }
                        .foregroundStyle(DS.Colors.primary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 120)
                        .background(DS.Colors.primary.opacity(0.08), in: .rect(cornerRadius: 10))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .strokeBorder(style: StrokeStyle(lineWidth: 1.5, dash: [6]))
                                .foregroundStyle(DS.Colors.primary.opacity(0.3))
                        )
                    }
                    .onChange(of: selectedItem) { _, newItem in
                        importPhoto(from: newItem)
                    }
                }
            }
            .frame(height: 120)
        }
        .onAppear { loadDisplayImage() }
        .onChange(of: photoRef) { _, _ in loadDisplayImage() }
    }

    private func loadDisplayImage() {
        guard let ref = photoRef else {
            displayImage = nil
            return
        }

        if ref.hasPrefix("http") {
            // Firebase Storage URL — load async
            Task {
                guard let url = URL(string: ref),
                      let (data, _) = try? await URLSession.shared.data(from: url),
                      let image = UIImage(data: data) else { return }
                displayImage = image
            }
        } else {
            // Local temp filename
            displayImage = store.loadTempImage(named: ref)
        }
    }

    private func importPhoto(from item: PhotosPickerItem?) {
        guard let item else { return }
        Task {
            if let data = try? await item.loadTransferable(type: Data.self) {
                let filename = store.saveTempPhoto(data)
                photoRef = filename
                displayImage = store.loadTempImage(named: filename)
            }
            selectedItem = nil
        }
    }
}
