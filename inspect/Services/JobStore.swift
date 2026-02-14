import Foundation
import Observation
import UIKit
import FirebaseFirestore
import FirebaseStorage

@Observable
final class JobStore {
    var jobs: [Job] = []
    var forms: [InspectionForm] = []
    var isLoading = false
    var errorMessage: String?

    private var db: Firestore { Firestore.firestore() }
    private var storage: Storage { Storage.storage() }
    private var jobsListener: ListenerRegistration?
    private var formsListener: ListenerRegistration?

    private let collectionName = "jobs"
    private let formsSubcollection = "forms"

    private var tempDirectoryURL: URL {
        FileManager.default.temporaryDirectory.appendingPathComponent("inspectPhotos", isDirectory: true)
    }

    /// The job ID currently being listened to for forms
    private var listeningJobId: UUID?

    init() {
        ensureTempDirectory()
    }

    deinit {
        jobsListener?.remove()
        formsListener?.remove()
    }

    // MARK: - Aggregated Materials (computed from loaded forms)

    var allMaterials: [Material] {
        forms.flatMap { $0.materials }
    }

    // MARK: - Audit Issue Photos (for inspection linkage UI)

    var auditIssuePhotos: [IssuePhoto] {
        forms.filter { $0.formType == .audit }.flatMap { $0.issuePhotos }
    }

    // MARK: - Jobs Listener

    func startListening() {
        isLoading = true
        jobsListener = db.collection(collectionName)
            .order(by: "createdAt", descending: true)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self else { return }
                self.isLoading = false
                if let error {
                    self.errorMessage = error.localizedDescription
                    return
                }
                guard let documents = snapshot?.documents else { return }
                self.jobs = documents.compactMap { doc in
                    try? doc.data(as: Job.self)
                }
            }
    }

    // MARK: - Forms Subcollection Listener

    func startListeningToForms(for jobId: UUID) {
        stopListeningToForms()
        listeningJobId = jobId
        formsListener = db.collection(collectionName)
            .document(jobId.uuidString)
            .collection(formsSubcollection)
            .order(by: "date", descending: true)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self else { return }
                if let error {
                    self.errorMessage = error.localizedDescription
                    return
                }
                guard let documents = snapshot?.documents else { return }
                self.forms = documents.compactMap { doc in
                    try? doc.data(as: InspectionForm.self)
                }
            }
    }

    func stopListeningToForms() {
        formsListener?.remove()
        formsListener = nil
        forms = []
        listeningJobId = nil
    }

    // MARK: - Refresh Forms (pull-to-refresh)

    func refreshForms(for jobId: UUID) async {
        let fetched = await fetchForms(for: jobId)
        forms = fetched
    }

    // MARK: - Job CRUD

    func addJob(_ job: Job) {
        do {
            var newJob = job
            newJob.updatedAt = Date()
            try db.collection(collectionName)
                .document(newJob.id.uuidString)
                .setData(from: newJob)
        } catch {
            errorMessage = "Failed to save: \(error.localizedDescription)"
        }
    }

    func updateJob(_ job: Job) {
        do {
            var updated = job
            updated.updatedAt = Date()
            try db.collection(collectionName)
                .document(updated.id.uuidString)
                .setData(from: updated, merge: true)
        } catch {
            errorMessage = "Failed to update: \(error.localizedDescription)"
        }
    }

    func deleteJob(_ job: Job) {
        let jobId = job.id.uuidString

        // First delete all forms in the subcollection
        db.collection(collectionName)
            .document(jobId)
            .collection(formsSubcollection)
            .getDocuments { [weak self] snapshot, _ in
                guard let self else { return }
                if let docs = snapshot?.documents {
                    for doc in docs {
                        doc.reference.delete()
                    }
                }

                // Delete all photos from Storage
                let storageRef = self.storage.reference().child("jobs/\(jobId)")
                storageRef.listAll { result, _ in
                    if let items = result?.items {
                        for item in items { item.delete { _ in } }
                    }
                    if let prefixes = result?.prefixes {
                        for prefix in prefixes {
                            prefix.listAll { subResult, _ in
                                if let subItems = subResult?.items {
                                    for item in subItems { item.delete { _ in } }
                                }
                            }
                        }
                    }
                }

                // Delete the job document
                self.db.collection(self.collectionName).document(jobId).delete()
            }
    }

    func deleteAllJobs() {
        let jobsCopy = jobs
        for job in jobsCopy {
            deleteJob(job)
        }
    }

    // MARK: - Spot CRUD

    func addSpot(_ spot: Spot, to job: Job) {
        var updated = job
        updated.spots.append(spot)
        updateJob(updated)
    }

    func removeSpot(_ spot: Spot, from job: Job) {
        var updated = job
        updated.spots.removeAll { $0.id == spot.id }
        updateJob(updated)
    }

    // MARK: - Form CRUD

    func addForm(_ form: InspectionForm, to job: Job) {
        do {
            try db.collection(collectionName)
                .document(job.id.uuidString)
                .collection(formsSubcollection)
                .document(form.id.uuidString)
                .setData(from: form)

            // Auto-advance stage + update denormalized fields
            var updated = job
            updated.updatedAt = Date()
            advanceStage(for: &updated, afterAdding: form)
            updateDenormalizedFields(for: &updated, adding: form)

            try db.collection(collectionName)
                .document(updated.id.uuidString)
                .setData(from: updated, merge: true)
        } catch {
            errorMessage = "Failed to save form: \(error.localizedDescription)"
        }
    }

    func updateForm(_ form: InspectionForm, in job: Job) {
        do {
            try db.collection(collectionName)
                .document(job.id.uuidString)
                .collection(formsSubcollection)
                .document(form.id.uuidString)
                .setData(from: form, merge: true)

            // Recalculate denormalized fields from current forms
            var updated = job
            updated.updatedAt = Date()
            recalculateDenormalizedFields(for: &updated)

            try db.collection(collectionName)
                .document(updated.id.uuidString)
                .setData(from: updated, merge: true)
        } catch {
            errorMessage = "Failed to update form: \(error.localizedDescription)"
        }
    }

    func deleteForm(_ form: InspectionForm, from job: Job) {
        let jobId = job.id.uuidString
        let formId = form.id.uuidString

        // Delete the form document
        db.collection(collectionName)
            .document(jobId)
            .collection(formsSubcollection)
            .document(formId)
            .delete()

        // Delete photos from Storage
        let formRef = storage.reference().child("jobs/\(jobId)/\(formId)")
        formRef.listAll { result, _ in
            if let items = result?.items {
                for item in items { item.delete { _ in } }
            }
            if let prefixes = result?.prefixes {
                for prefix in prefixes {
                    prefix.listAll { subResult, _ in
                        if let subItems = subResult?.items {
                            for item in subItems { item.delete { _ in } }
                        }
                    }
                }
            }
        }

        // Recalculate denormalized fields
        var updated = job
        updated.updatedAt = Date()
        recalculateDenormalizedFields(for: &updated, excluding: form.id)
        updateJob(updated)
    }

    // MARK: - Stage Auto-Transitions

    private func advanceStage(for job: inout Job, afterAdding form: InspectionForm) {
        guard job.currentStage != .cancelled else { return }

        switch form.formType {
        case .audit:
            // Audit submitted -> move to work in progress
            if job.currentStage == .auditPending {
                job.currentStage = .workInProgress
            }
        case .inspection:
            // Inspection submitted -> check if all audit issues have linked fixes
            let allAuditIssueIds = Set(
                forms.filter { $0.formType == .audit }.flatMap { $0.issuePhotos }.map { $0.id }
            )
            let existingFixLinkedIds = Set(
                forms.filter { $0.formType == .inspection }.flatMap { $0.fixPhotos }.compactMap { $0.linkedAuditIssueId }
            )
            let newFixLinkedIds = Set(form.fixPhotos.compactMap { $0.linkedAuditIssueId })
            let allLinkedIds = existingFixLinkedIds.union(newFixLinkedIds)

            let allIssuesFixed = !allAuditIssueIds.isEmpty && allAuditIssueIds.isSubset(of: allLinkedIds)

            if job.currentStage == .workInProgress || job.currentStage == .inspectionPending {
                if allIssuesFixed {
                    job.currentStage = .completed
                } else {
                    job.currentStage = .inspectionPending
                }
            }
        }
    }

    // MARK: - Denormalized Field Updates

    /// Incrementally update counts when adding a new form
    private func updateDenormalizedFields(for job: inout Job, adding form: InspectionForm) {
        job.formCount += 1
        job.photoCount += form.photoCount
        job.issueCount = (forms + [form])
            .filter { $0.formType == .audit }
            .reduce(0) { $0 + $1.issuePhotos.count }
    }

    /// Recalculate all denormalized fields from the current in-memory forms
    private func recalculateDenormalizedFields(for job: inout Job, excluding excludedId: UUID? = nil) {
        let activeForms = forms.filter { $0.id != excludedId }
        job.formCount = activeForms.count
        job.photoCount = activeForms.reduce(0) { $0 + $1.photoCount }
        job.issueCount = activeForms
            .filter { $0.formType == .audit }
            .reduce(0) { $0 + $1.issuePhotos.count }
    }

    // MARK: - One-Shot Form Fetch (for Quick Capture)

    func fetchForms(for jobId: UUID) async -> [InspectionForm] {
        do {
            let snapshot = try await db.collection(collectionName)
                .document(jobId.uuidString)
                .collection(formsSubcollection)
                .order(by: "date", descending: true)
                .getDocuments()
            return snapshot.documents.compactMap { try? $0.data(as: InspectionForm.self) }
        } catch {
            errorMessage = "Failed to fetch forms: \(error.localizedDescription)"
            return []
        }
    }

    // MARK: - Quick Capture Append

    func appendIssuePhoto(_ photo: IssuePhoto, toSpot spotId: UUID, toJob job: Job) async throws {
        let forms = await fetchForms(for: job.id)
        var targetForm = forms.first { $0.formType == .audit }

        if targetForm != nil {
            targetForm!.appendIssuePhoto(photo, toSpot: spotId, availableSpots: job.spots)
            updateForm(targetForm!, in: job)
        } else {
            var newForm = InspectionForm(formType: .audit, date: Date())
            newForm.appendIssuePhoto(photo, toSpot: spotId, availableSpots: job.spots)
            addForm(newForm, to: job)
        }
    }

    func appendFixPhoto(_ photo: FixPhoto, toSpot spotId: UUID, toJob job: Job) async throws {
        let forms = await fetchForms(for: job.id)
        var targetForm = forms.first { $0.formType == .inspection }

        if targetForm != nil {
            targetForm!.appendFixPhoto(photo, toSpot: spotId, availableSpots: job.spots)
            updateForm(targetForm!, in: job)
        } else {
            var newForm = InspectionForm(formType: .inspection, date: Date())
            newForm.appendFixPhoto(photo, toSpot: spotId, availableSpots: job.spots)
            addForm(newForm, to: job)
        }
    }

    // MARK: - Photo Upload

    func uploadPhoto(imageData: Data, jobId: UUID, formId: UUID, photoId: UUID) async throws -> String {
        let path = "jobs/\(jobId.uuidString)/\(formId.uuidString)/\(photoId.uuidString)/photo.jpg"
        let ref = storage.reference().child(path)

        let compressed: Data
        if let image = UIImage(data: imageData),
           let jpeg = image.jpegData(compressionQuality: 0.7) {
            compressed = jpeg
        } else {
            compressed = imageData
        }

        let metadata = StorageMetadata()
        metadata.contentType = "image/jpeg"

        _ = try await ref.putDataAsync(compressed, metadata: metadata)
        let downloadURL = try await ref.downloadURL()
        return downloadURL.absoluteString
    }

    // MARK: - Temp Photo Management

    func saveTempPhoto(_ imageData: Data) -> String {
        let filename = UUID().uuidString + ".jpg"
        let url = tempDirectoryURL.appendingPathComponent(filename)

        if let image = UIImage(data: imageData),
           let jpeg = image.jpegData(compressionQuality: 0.7) {
            try? jpeg.write(to: url)
        } else {
            try? imageData.write(to: url)
        }
        return filename
    }

    func loadTempImage(named filename: String) -> UIImage? {
        let url = tempDirectoryURL.appendingPathComponent(filename)
        guard let data = try? Data(contentsOf: url) else { return nil }
        return UIImage(data: data)
    }

    func loadTempPhotoData(named filename: String) -> Data? {
        let url = tempDirectoryURL.appendingPathComponent(filename)
        return try? Data(contentsOf: url)
    }

    func cleanupTempPhotos() {
        try? FileManager.default.removeItem(at: tempDirectoryURL)
        ensureTempDirectory()
    }

    private func ensureTempDirectory() {
        if !FileManager.default.fileExists(atPath: tempDirectoryURL.path) {
            try? FileManager.default.createDirectory(at: tempDirectoryURL, withIntermediateDirectories: true)
        }
    }

    // MARK: - Export Training Data

    func exportAllAsJSONL() async -> String {
        let iso = ISO8601DateFormatter()
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]

        var lines: [String] = []

        for job in jobs {
            let jobForms = await fetchForms(for: job.id)

            // Collect all audit issues keyed by spotId for linking
            var issuesBySpot: [UUID: [IssuePhoto]] = [:]
            var allFixesByLinkedId: [UUID: FixPhoto] = [:]
            // Collect materials keyed by the spot they belong to (via form → spot association)
            var materialsBySpot: [UUID: [Material]] = [:]

            for form in jobForms where form.formType == .audit {
                for spot in form.spots {
                    issuesBySpot[spot.id, default: []].append(contentsOf: spot.issuePhotos)
                }
                // Distribute materials to spots by matching material type → spot job type
                for mat in form.materials {
                    for spot in form.spots where materialTypeMatchesJobType(mat.type, spot.jobType) {
                        materialsBySpot[spot.id, default: []].append(mat)
                    }
                }
            }
            for form in jobForms where form.formType == .inspection {
                for spot in form.spots {
                    for fix in spot.fixPhotos {
                        if let linkedId = fix.linkedAuditIssueId {
                            allFixesByLinkedId[linkedId] = fix
                        }
                    }
                }
                for mat in form.materials {
                    for spot in form.spots where materialTypeMatchesJobType(mat.type, spot.jobType) {
                        materialsBySpot[spot.id, default: []].append(mat)
                    }
                }
            }

            // Build combined spots — merge audit + inspection data per spot
            var spotExports: [SpotExport] = []
            let allSpotIds = Set(
                jobForms.flatMap { $0.spots.map { $0.id } } + job.spots.map { $0.id }
            )

            for spotId in allSpotIds {
                let formSpot = jobForms.flatMap { $0.spots }.first { $0.id == spotId }
                let jobSpot = job.spots.first { $0.id == spotId }
                let title = formSpot?.title ?? jobSpot?.title ?? "Unknown"
                let jobType = formSpot?.jobType.rawValue ?? jobSpot?.jobType.rawValue ?? "Unknown"

                // Build findings: each audit issue + its linked fix (if any)
                let issues = issuesBySpot[spotId] ?? []
                var findings: [FindingExport] = issues.map { issue in
                    let fix = allFixesByLinkedId[issue.id]
                    return FindingExport(
                        category: issue.category.rawValue,
                        severity: issue.severity.rawValue,
                        issueNotes: issue.notes,
                        beforePhotoURL: issue.photoURL,
                        issueDate: iso.string(from: issue.dateTaken),
                        resolved: fix != nil,
                        afterPhotoURL: fix?.photoURL,
                        resolutionNotes: fix?.resolutionNotes,
                        fixDate: fix.map { iso.string(from: $0.dateTaken) }
                    )
                }

                // Unlinked fixes (no audit issue) — standalone fix records
                for form in jobForms where form.formType == .inspection {
                    for spot in form.spots where spot.id == spotId {
                        for fix in spot.fixPhotos where fix.linkedAuditIssueId == nil {
                            findings.append(FindingExport(
                                category: nil,
                                severity: nil,
                                issueNotes: nil,
                                beforePhotoURL: nil,
                                issueDate: nil,
                                resolved: true,
                                afterPhotoURL: fix.photoURL,
                                resolutionNotes: fix.resolutionNotes,
                                fixDate: iso.string(from: fix.dateTaken)
                            ))
                        }
                    }
                }

                // Materials for this spot
                let spotMats = (materialsBySpot[spotId] ?? []).map { mat in
                    MaterialExport(name: mat.name, type: mat.type.rawValue, quantity: mat.quantity, cost: mat.cost)
                }

                if !findings.isEmpty || !spotMats.isEmpty {
                    spotExports.append(SpotExport(
                        title: title,
                        jobType: jobType,
                        findings: findings.isEmpty ? nil : findings,
                        materials: spotMats.isEmpty ? nil : spotMats
                    ))
                }
            }

            // Collect unique inspector names
            let inspectors = Array(Set(jobForms.map { $0.inspectorName }.filter { !$0.isEmpty }))

            // Form notes combined
            let formNotes = jobForms.filter { !$0.notes.isEmpty }.map { "\($0.formType.rawValue): \($0.notes)" }

            let export = JobExport(
                address: job.address,
                contactName: job.contactName,
                contactPhone: job.contactPhone,
                contactEmail: job.contactEmail,
                notes: job.notes,
                stage: job.currentStage.rawValue,
                rebateAmount: job.rebateAmount,
                rebateOutcome: job.rebateOutcome.rawValue,
                inspectors: inspectors,
                formNotes: formNotes.isEmpty ? nil : formNotes,
                spots: spotExports,
                createdAt: iso.string(from: job.createdAt)
            )

            if let data = try? encoder.encode(export), let line = String(data: data, encoding: .utf8) {
                lines.append(line)
            }
        }

        return lines.joined(separator: "\n")
    }
}

// MARK: - Export Structs

private struct JobExport: Encodable {
    let address, contactName, contactPhone, contactEmail, notes, stage: String
    let rebateAmount: Double
    let rebateOutcome: String
    let inspectors: [String]
    let formNotes: [String]?
    let spots: [SpotExport]
    let createdAt: String
}

private struct SpotExport: Encodable {
    let title, jobType: String
    let findings: [FindingExport]?
    let materials: [MaterialExport]?
}

/// Maps material type to compatible spot job types
private func materialTypeMatchesJobType(_ materialType: MaterialType, _ jobType: JobType) -> Bool {
    switch materialType {
    case .insulation: return [.insulation, .attic, .crawlspace].contains(jobType)
    case .sealant:    return [.airSealing, .weatherization].contains(jobType)
    case .hvacUnit:   return jobType == .hvac
    case .ductwork:   return jobType == .ductSealing
    case .other:      return true
    }
}

private struct FindingExport: Encodable {
    // Issue (before)
    let category: String?
    let severity: String?
    let issueNotes: String?
    let beforePhotoURL: String?
    let issueDate: String?
    // Resolution (after)
    let resolved: Bool
    let afterPhotoURL: String?
    let resolutionNotes: String?
    let fixDate: String?
}

private struct MaterialExport: Encodable {
    let name, type, quantity: String
    let cost: Double?
}

