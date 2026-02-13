import Foundation
import SwiftUI

// MARK: - Form Type

enum FormType: String, Codable, CaseIterable, Identifiable, Sendable {
    case audit = "Audit"
    case inspection = "Inspection"

    var id: String { rawValue }
}

// MARK: - Job Type

enum JobType: String, CaseIterable, Codable, Identifiable, Sendable {
    case insulation = "Insulation"
    case airSealing = "Air Sealing"
    case hvac = "HVAC Installation"
    case ductSealing = "Duct Sealing"
    case weatherization = "Weatherization"
    case attic = "Attic Insulation"
    case crawlspace = "Crawlspace Encapsulation"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .insulation: "house.fill"
        case .airSealing: "wind"
        case .hvac: "fan.fill"
        case .ductSealing: "wrench.and.screwdriver.fill"
        case .weatherization: "cloud.sun.fill"
        case .attic: "triangle.fill"
        case .crawlspace: "rectangle.bottomhalf.filled"
        }
    }
}

// MARK: - Issue Category

enum IssueCategory: String, CaseIterable, Codable, Identifiable, Sendable {
    // Insulation / Attic / Crawlspace
    case gaps = "Gaps in Insulation"
    case compression = "Insulation Compression"
    case insufficientRValue = "Insufficient R-Value"
    case blockedVents = "Blocked Vents/Soffits"
    case moisture = "Moisture/Contamination"
    case vaporBarrier = "Vapor Barrier Issue"

    // Air Sealing / Weatherization
    case missingSealant = "Missing Caulk/Sealant"
    case gapsAtPenetrations = "Gaps at Penetrations"
    case incompleteFoam = "Incomplete Foam Application"
    case overApplication = "Over-Application/Mess"
    case missingWeatherstrip = "Missing Weatherstripping"

    // HVAC
    case unitNotLevel = "Unit Not Level"
    case lineInsulationMissing = "Line Insulation Missing"
    case noPTrap = "No Condensate P-Trap"
    case improperClearance = "Improper Clearance"
    case electricalIssue = "Electrical Issue"

    // Duct
    case tapeNotMastic = "Tape Instead of Mastic"
    case unsealedJoints = "Unsealed Joints"
    case disconnectedRun = "Disconnected Duct Run"
    case missingDuctInsulation = "Missing Duct Insulation"
    case improperSupport = "Improper Duct Support"

    // General (all types)
    case codeViolation = "Code Violation"
    case safetyHazard = "Safety Hazard"
    case incompleteWork = "Incomplete Work"
    case poorWorkmanship = "Poor Workmanship"
    case other = "Other"

    var id: String { rawValue }

    static func categories(for jobType: JobType) -> [IssueCategory] {
        let general: [IssueCategory] = [
            .codeViolation, .safetyHazard, .incompleteWork, .poorWorkmanship, .other
        ]
        let specific: [IssueCategory]
        switch jobType {
        case .insulation, .attic, .crawlspace:
            specific = [.gaps, .compression, .insufficientRValue, .blockedVents,
                        .moisture, .vaporBarrier]
        case .airSealing, .weatherization:
            specific = [.missingSealant, .gapsAtPenetrations, .incompleteFoam,
                        .overApplication, .missingWeatherstrip]
        case .hvac:
            specific = [.unitNotLevel, .lineInsulationMissing, .noPTrap,
                        .improperClearance, .electricalIssue]
        case .ductSealing:
            specific = [.tapeNotMastic, .unsealedJoints, .disconnectedRun,
                        .missingDuctInsulation, .improperSupport]
        }
        return specific + general
    }
}

// MARK: - Issue Severity

enum IssueSeverity: String, CaseIterable, Codable, Identifiable, Sendable {
    case critical = "Critical"
    case major = "Major"
    case minor = "Minor"

    var id: String { rawValue }

    var color: Color {
        switch self {
        case .critical: .red
        case .major: .orange
        case .minor: .yellow
        }
    }

    var icon: String {
        switch self {
        case .critical: "exclamationmark.octagon.fill"
        case .major: "exclamationmark.triangle.fill"
        case .minor: "info.circle.fill"
        }
    }
}

// MARK: - Spot

struct Spot: Identifiable, Codable, Equatable, Sendable {
    let id: UUID
    var title: String
    var jobType: JobType

    init(
        id: UUID = UUID(),
        title: String = "",
        jobType: JobType = .insulation
    ) {
        self.id = id
        self.title = title
        self.jobType = jobType
    }
}

// MARK: - Issue Photo (audit forms — one photo = one issue)

struct IssuePhoto: Identifiable, Codable, Equatable, Sendable {
    let id: UUID
    var spotId: UUID
    var photoURL: String?
    var category: IssueCategory
    var severity: IssueSeverity
    var notes: String
    var dateTaken: Date

    init(
        id: UUID = UUID(),
        spotId: UUID = UUID(),
        photoURL: String? = nil,
        category: IssueCategory = .other,
        severity: IssueSeverity = .major,
        notes: String = "",
        dateTaken: Date = Date()
    ) {
        self.id = id
        self.spotId = spotId
        self.photoURL = photoURL
        self.category = category
        self.severity = severity
        self.notes = notes
        self.dateTaken = dateTaken
    }
}

// MARK: - Fix Photo (inspection forms — documents a fix)

struct FixPhoto: Identifiable, Codable, Equatable, Sendable {
    let id: UUID
    var spotId: UUID
    var linkedAuditIssueId: UUID?
    var photoURL: String?
    var resolutionNotes: String
    var dateTaken: Date

    init(
        id: UUID = UUID(),
        spotId: UUID = UUID(),
        linkedAuditIssueId: UUID? = nil,
        photoURL: String? = nil,
        resolutionNotes: String = "",
        dateTaken: Date = Date()
    ) {
        self.id = id
        self.spotId = spotId
        self.linkedAuditIssueId = linkedAuditIssueId
        self.photoURL = photoURL
        self.resolutionNotes = resolutionNotes
        self.dateTaken = dateTaken
    }
}

// MARK: - Material Type

enum MaterialType: String, Codable, CaseIterable, Identifiable, Sendable {
    case insulation = "Insulation"
    case sealant = "Sealant"
    case hvacUnit = "HVAC Unit"
    case ductwork = "Ductwork"
    case other = "Other"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .insulation: "house.fill"
        case .sealant: "drop.fill"
        case .hvacUnit: "fan.fill"
        case .ductwork: "wrench.and.screwdriver.fill"
        case .other: "shippingbox.fill"
        }
    }

    var color: Color {
        switch self {
        case .insulation: .pink
        case .sealant: .blue
        case .hvacUnit: .green
        case .ductwork: .purple
        case .other: .gray
        }
    }
}

// MARK: - Material

struct Material: Identifiable, Codable, Equatable, Sendable {
    let id: UUID
    var name: String
    var type: MaterialType
    var quantity: String

    init(
        id: UUID = UUID(),
        name: String = "",
        type: MaterialType = .insulation,
        quantity: String = ""
    ) {
        self.id = id
        self.name = name
        self.type = type
        self.quantity = quantity
    }
}

// MARK: - Job Stage

enum JobStage: String, Codable, CaseIterable, Identifiable, Sendable {
    case auditPending = "Audit Pending"
    case workInProgress = "Work In Progress"
    case inspectionPending = "Inspection Pending"
    case completed = "Completed"
    case cancelled = "Cancelled"

    var id: String { rawValue }

    var color: Color {
        switch self {
        case .auditPending: .blue
        case .workInProgress: .orange
        case .inspectionPending: .purple
        case .completed: .green
        case .cancelled: .gray
        }
    }

    var icon: String {
        switch self {
        case .auditPending: "clipboard"
        case .workInProgress: "hammer.fill"
        case .inspectionPending: "checkmark.shield"
        case .completed: "checkmark.circle.fill"
        case .cancelled: "xmark.circle.fill"
        }
    }
}

// MARK: - Inspection Form

struct InspectionForm: Identifiable, Codable, Equatable, Sendable {
    let id: UUID
    var formType: FormType
    var inspectorName: String
    var date: Date
    var notes: String
    var issuePhotos: [IssuePhoto]
    var fixPhotos: [FixPhoto]
    var materials: [Material]

    var photoCount: Int { issuePhotos.count + fixPhotos.count }

    init(
        id: UUID = UUID(),
        formType: FormType = .inspection,
        inspectorName: String = "",
        date: Date = Date(),
        notes: String = "",
        issuePhotos: [IssuePhoto] = [],
        fixPhotos: [FixPhoto] = [],
        materials: [Material] = []
    ) {
        self.id = id
        self.formType = formType
        self.inspectorName = inspectorName
        self.date = date
        self.notes = notes
        self.issuePhotos = issuePhotos
        self.fixPhotos = fixPhotos
        self.materials = materials
    }
}

// MARK: - Job

struct Job: Identifiable, Codable, Equatable, Sendable {
    let id: UUID
    var address: String
    var contactName: String
    var contactPhone: String
    var contactEmail: String
    var notes: String
    var currentStage: JobStage
    var rebateAmount: Double
    var spots: [Spot]
    var formCount: Int
    var photoCount: Int
    var issueCount: Int
    var createdAt: Date
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        address: String = "",
        contactName: String = "",
        contactPhone: String = "",
        contactEmail: String = "",
        notes: String = "",
        currentStage: JobStage = .auditPending,
        rebateAmount: Double = 0,
        spots: [Spot] = [],
        formCount: Int = 0,
        photoCount: Int = 0,
        issueCount: Int = 0,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.address = address
        self.contactName = contactName
        self.contactPhone = contactPhone
        self.contactEmail = contactEmail
        self.notes = notes
        self.currentStage = currentStage
        self.rebateAmount = rebateAmount
        self.spots = spots
        self.formCount = formCount
        self.photoCount = photoCount
        self.issueCount = issueCount
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

// MARK: - Sample Data

extension Job {
    static let samples: [Job] = [
        Job(
            address: "742 Evergreen Terrace",
            contactName: "Homer Simpson",
            contactPhone: "(555) 123-4567",
            contactEmail: "homer@example.com",
            notes: "Full energy audit requested. Homeowner reported high utility bills and drafts.",
            currentStage: .workInProgress,
            rebateAmount: 2500,
            spots: [
                Spot(title: "Attic Hatch", jobType: .attic),
                Spot(title: "Kitchen Window", jobType: .airSealing),
            ],
            formCount: 1,
            photoCount: 2,
            issueCount: 0
        ),
        Job(
            address: "221B Baker Street",
            contactName: "John Watson",
            contactPhone: "(555) 987-6543",
            contactEmail: "watson@example.com",
            notes: "HVAC replacement — old 12 SEER unit failing.",
            currentStage: .inspectionPending,
            rebateAmount: 4000,
            spots: [
                Spot(title: "Heat Pump Pad", jobType: .hvac),
            ],
            formCount: 2,
            photoCount: 3,
            issueCount: 2
        ),
    ]
}

extension InspectionForm {
    static let samples: [InspectionForm] = {
        let atticSpotId = UUID()
        let kitchenSpotId = UUID()
        let hvacSpotId = UUID()
        let issue1Id = UUID()
        let issue2Id = UUID()

        return [
            InspectionForm(
                formType: .audit,
                inspectorName: "Mike Davis",
                date: Date().addingTimeInterval(-86400 * 2),
                notes: "Comprehensive energy audit completed.",
                issuePhotos: [
                    IssuePhoto(
                        spotId: atticSpotId,
                        category: .insufficientRValue,
                        severity: .major,
                        notes: "R-value measured at R-13, well below the recommended R-38 for this climate zone."
                    ),
                    IssuePhoto(
                        spotId: kitchenSpotId,
                        category: .missingWeatherstrip,
                        severity: .minor,
                        notes: "Visible gaps around window frame. Weatherstripping worn and missing in places."
                    ),
                ],
                materials: [
                    Material(name: "R-38 Fiberglass Batts", type: .insulation, quantity: "200 sq ft"),
                ]
            ),
            InspectionForm(
                formType: .inspection,
                inspectorName: "Sarah Chen",
                date: Date().addingTimeInterval(-86400),
                notes: "Initial inspection of HVAC installation.",
                fixPhotos: [
                    FixPhoto(
                        spotId: hvacSpotId,
                        linkedAuditIssueId: issue1Id,
                        resolutionNotes: "Unit leveled and P-trap installed."
                    ),
                ],
                materials: [
                    Material(name: "Carrier 25VNA0 Heat Pump", type: .hvacUnit, quantity: "1 unit"),
                    Material(name: "Foam Line Insulation", type: .insulation, quantity: "30 ft"),
                ]
            ),
        ]
    }()
}
