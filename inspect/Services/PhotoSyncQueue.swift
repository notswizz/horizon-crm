import Foundation
import Observation
import UIKit
import FirebaseStorage
import FirebaseFirestore

// MARK: - Pending Upload Entry

struct PendingUpload: Codable, Identifiable, Equatable {
    let id: UUID
    let jobId: String
    let formId: String
    let photoId: String
    let localFilename: String
    let storagePath: String
    /// Firestore field path to update with the download URL once uploaded.
    /// e.g. for an issue photo we patch the form doc.
    let firestoreJobId: String
    let firestoreFormId: String
    let photoType: PhotoType
    let spotId: String
    let createdAt: Date
    var retryCount: Int = 0

    enum PhotoType: String, Codable {
        case issue, fix, house
    }
}

// MARK: - Photo Sync Queue

@Observable
final class PhotoSyncQueue: @unchecked Sendable {
    var pendingCount: Int = 0
    var isSyncing: Bool = false

    private var manifest: [PendingUpload] = []
    private let maxConcurrent = 3
    private var activeUploads = 0
    private let maxRetries = 5
    private var processing = false

    private var storage: Storage { Storage.storage() }
    private var db: Firestore { Firestore.firestore() }

    private var pendingDirectory: URL {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        return docs.appendingPathComponent("pending-uploads", isDirectory: true)
    }

    private var manifestURL: URL {
        pendingDirectory.appendingPathComponent("pending-uploads.json")
    }

    init() {
        ensureDirectory()
        loadManifest()
    }

    // MARK: - Public API

    /// Save photo data locally and add to upload queue. Returns the local filename.
    func enqueue(imageData: Data, jobId: UUID, formId: UUID, photoId: UUID, storagePath: String, photoType: PendingUpload.PhotoType, spotId: UUID) -> String {
        let filename = "\(photoId.uuidString).jpg"
        let fileURL = pendingDirectory.appendingPathComponent(filename)

        // Compress before saving
        let compressed: Data
        if let image = UIImage(data: imageData), let jpeg = image.jpegData(compressionQuality: 0.7) {
            compressed = jpeg
        } else {
            compressed = imageData
        }
        try? compressed.write(to: fileURL)

        let entry = PendingUpload(
            id: UUID(),
            jobId: jobId.uuidString,
            formId: formId.uuidString,
            photoId: photoId.uuidString,
            localFilename: filename,
            storagePath: storagePath,
            firestoreJobId: jobId.uuidString,
            firestoreFormId: formId.uuidString,
            photoType: photoType,
            spotId: spotId.uuidString,
            createdAt: Date()
        )

        manifest.append(entry)
        pendingCount = manifest.count
        saveManifest()

        return filename
    }

    /// Load a pending photo from the local directory.
    func loadPendingImage(photoId: String) -> UIImage? {
        let filename = "\(photoId).jpg"
        let fileURL = pendingDirectory.appendingPathComponent(filename)
        guard let data = try? Data(contentsOf: fileURL) else { return nil }
        return UIImage(data: data)
    }

    /// Check if a photoId has a pending upload.
    func isPending(photoId: String) -> Bool {
        manifest.contains { $0.photoId == photoId }
    }

    /// Process the upload queue. Called when network becomes available.
    func processQueue() {
        guard !processing, !manifest.isEmpty else { return }
        processing = true
        Task { @MainActor in
            isSyncing = true
        }
        uploadNext()
    }

    // MARK: - Upload Processing

    private func uploadNext() {
        guard activeUploads < maxConcurrent else { return }

        // Find next item that isn't being retried too many times
        guard let entry = manifest.first(where: { $0.retryCount < maxRetries }) else {
            Task { @MainActor in
                self.processing = false
                self.isSyncing = false
            }
            return
        }

        activeUploads += 1

        Task {
            do {
                let downloadURL = try await uploadToStorage(entry: entry)
                try await updateFirestore(entry: entry, downloadURL: downloadURL)
                removeLocalFile(entry: entry)

                await MainActor.run {
                    self.manifest.removeAll { $0.id == entry.id }
                    self.pendingCount = self.manifest.count
                    self.saveManifest()
                    self.activeUploads -= 1
                }

                // Continue processing
                uploadNext()

                // Check if done
                if manifest.isEmpty {
                    await MainActor.run {
                        self.processing = false
                        self.isSyncing = false
                    }
                }
            } catch {
                print("[PhotoSyncQueue] Upload failed for \(entry.photoId): \(error.localizedDescription)")
                await MainActor.run {
                    if let idx = self.manifest.firstIndex(where: { $0.id == entry.id }) {
                        self.manifest[idx].retryCount += 1
                    }
                    self.saveManifest()
                    self.activeUploads -= 1
                }
                // Try next item
                uploadNext()
            }
        }
    }

    private func uploadToStorage(entry: PendingUpload) async throws -> String {
        let fileURL = pendingDirectory.appendingPathComponent(entry.localFilename)
        guard let data = try? Data(contentsOf: fileURL) else {
            throw NSError(domain: "PhotoSyncQueue", code: 1,
                          userInfo: [NSLocalizedDescriptionKey: "Local file not found: \(entry.localFilename)"])
        }

        let ref = storage.reference().child(entry.storagePath)
        let metadata = StorageMetadata()
        metadata.contentType = "image/jpeg"

        _ = try await ref.putDataAsync(data, metadata: metadata)
        let url = try await ref.downloadURL()
        return url.absoluteString
    }

    private func updateFirestore(entry: PendingUpload, downloadURL: String) async throws {
        if entry.photoType == .house {
            // House image: update job doc directly
            try await db.collection("jobs")
                .document(entry.firestoreJobId)
                .updateData(["houseImageURL": downloadURL, "updatedAt": FieldValue.serverTimestamp()])
            return
        }

        // Issue/Fix photo: read the form doc, find the photo, replace pending:// URL
        let formRef = db.collection("jobs")
            .document(entry.firestoreJobId)
            .collection("forms")
            .document(entry.firestoreFormId)

        let doc = try await formRef.getDocument()
        guard var data = doc.data() else { return }

        // Walk through spots array and replace the pending URL
        if var spots = data["spots"] as? [[String: Any]] {
            for i in spots.indices {
                if entry.photoType == .issue {
                    if var photos = spots[i]["issuePhotos"] as? [[String: Any]] {
                        for j in photos.indices {
                            if let url = photos[j]["photoURL"] as? String, url.contains(entry.photoId) {
                                photos[j]["photoURL"] = downloadURL
                            }
                        }
                        spots[i]["issuePhotos"] = photos
                    }
                } else if entry.photoType == .fix {
                    if var photos = spots[i]["fixPhotos"] as? [[String: Any]] {
                        for j in photos.indices {
                            if let url = photos[j]["photoURL"] as? String, url.contains(entry.photoId) {
                                photos[j]["photoURL"] = downloadURL
                            }
                        }
                        spots[i]["fixPhotos"] = photos
                    }
                }
            }
            data["spots"] = spots
        }

        try await formRef.setData(data, merge: true)
    }

    // MARK: - File Management

    private func removeLocalFile(entry: PendingUpload) {
        let fileURL = pendingDirectory.appendingPathComponent(entry.localFilename)
        try? FileManager.default.removeItem(at: fileURL)
    }

    private func ensureDirectory() {
        if !FileManager.default.fileExists(atPath: pendingDirectory.path) {
            try? FileManager.default.createDirectory(at: pendingDirectory, withIntermediateDirectories: true)
        }
    }

    private func loadManifest() {
        guard let data = try? Data(contentsOf: manifestURL),
              let entries = try? JSONDecoder().decode([PendingUpload].self, from: data) else {
            manifest = []
            pendingCount = 0
            return
        }
        manifest = entries
        pendingCount = entries.count
    }

    private func saveManifest() {
        guard let data = try? JSONEncoder().encode(manifest) else { return }
        try? data.write(to: manifestURL)
    }
}
