import Foundation
import Observation
import FirebaseFirestore

/// Reads dropdown configuration from Firestore `config/dropdowns`.
/// Falls back to hardcoded defaults if offline or the document doesn't exist.
@MainActor @Observable
final class ConfigStore {
    var jobTypes: [String] = ConfigStore.defaultJobTypes
    var issueCategories: [CategoryOption] = ConfigStore.defaultIssueCategories
    var materialTypes: [String] = ConfigStore.defaultMaterialTypes
    var isLoaded = false

    private var db: Firestore { Firestore.firestore() }

    struct CategoryOption: Sendable {
        let name: String
        let jobTypes: [String]   // empty = applies to all job types
    }

    init() {
        Task { await fetch() }
    }

    /// Categories relevant for a given job type.
    func categories(for jobType: String) -> [String] {
        issueCategories
            .filter { $0.jobTypes.isEmpty || $0.jobTypes.contains(jobType) }
            .map(\.name)
    }

    // MARK: - Fetch

    private func fetch() async {
        do {
            let snapshot = try await db.document("config/dropdowns").getDocument()
            guard snapshot.exists, let data = snapshot.data() else {
                print("[ConfigStore] Document config/dropdowns does not exist, using defaults")
                isLoaded = true
                return
            }

            print("[ConfigStore] Loaded config/dropdowns: \(data.keys.sorted())")

            if let jt = data["jobTypes"] as? [String], !jt.isEmpty {
                jobTypes = jt
            }

            if let mt = data["materialTypes"] as? [String], !mt.isEmpty {
                materialTypes = mt
            }

            if let cats = data["issueCategories"] as? [[String: Any]] {
                let parsed = cats.compactMap { dict -> CategoryOption? in
                    guard let name = dict["name"] as? String, !name.isEmpty else { return nil }
                    let jt = dict["jobTypes"] as? [String] ?? []
                    return CategoryOption(name: name, jobTypes: jt)
                }
                if !parsed.isEmpty {
                    issueCategories = parsed
                }
            }

            isLoaded = true
        } catch {
            print("[ConfigStore] Error fetching config/dropdowns: \(error.localizedDescription)")
            isLoaded = true
        }
    }

    // MARK: - Defaults (match iOS enums)

    static let defaultJobTypes = [
        "Insulation",
        "Air Sealing",
        "HVAC Installation",
        "Duct Sealing",
        "Weatherization",
        "Attic Insulation",
        "Crawlspace Encapsulation",
    ]

    private static let insulationTypes = ["Insulation", "Attic Insulation", "Crawlspace Encapsulation"]
    private static let airSealTypes = ["Air Sealing", "Weatherization"]

    static let defaultIssueCategories: [CategoryOption] = [
        // Insulation / Attic / Crawlspace
        CategoryOption(name: "Gaps in Insulation", jobTypes: insulationTypes),
        CategoryOption(name: "Insulation Compression", jobTypes: insulationTypes),
        CategoryOption(name: "Insufficient R-Value", jobTypes: insulationTypes),
        CategoryOption(name: "Blocked Vents/Soffits", jobTypes: insulationTypes),
        CategoryOption(name: "Moisture/Contamination", jobTypes: insulationTypes),
        CategoryOption(name: "Vapor Barrier Issue", jobTypes: insulationTypes),
        // Air Sealing / Weatherization
        CategoryOption(name: "Missing Caulk/Sealant", jobTypes: airSealTypes),
        CategoryOption(name: "Gaps at Penetrations", jobTypes: airSealTypes),
        CategoryOption(name: "Incomplete Foam Application", jobTypes: airSealTypes),
        CategoryOption(name: "Over-Application/Mess", jobTypes: airSealTypes),
        CategoryOption(name: "Missing Weatherstripping", jobTypes: airSealTypes),
        // HVAC
        CategoryOption(name: "Unit Not Level", jobTypes: ["HVAC Installation"]),
        CategoryOption(name: "Line Insulation Missing", jobTypes: ["HVAC Installation"]),
        CategoryOption(name: "No Condensate P-Trap", jobTypes: ["HVAC Installation"]),
        CategoryOption(name: "Improper Clearance", jobTypes: ["HVAC Installation"]),
        CategoryOption(name: "Electrical Issue", jobTypes: ["HVAC Installation"]),
        // Duct
        CategoryOption(name: "Tape Instead of Mastic", jobTypes: ["Duct Sealing"]),
        CategoryOption(name: "Unsealed Joints", jobTypes: ["Duct Sealing"]),
        CategoryOption(name: "Disconnected Duct Run", jobTypes: ["Duct Sealing"]),
        CategoryOption(name: "Missing Duct Insulation", jobTypes: ["Duct Sealing"]),
        CategoryOption(name: "Improper Duct Support", jobTypes: ["Duct Sealing"]),
        // General (all types)
        CategoryOption(name: "Code Violation", jobTypes: []),
        CategoryOption(name: "Safety Hazard", jobTypes: []),
        CategoryOption(name: "Incomplete Work", jobTypes: []),
        CategoryOption(name: "Poor Workmanship", jobTypes: []),
        CategoryOption(name: "Other", jobTypes: []),
    ]

    static let defaultMaterialTypes = [
        "Insulation",
        "Sealant",
        "HVAC Unit",
        "Ductwork",
        "Other",
    ]
}
