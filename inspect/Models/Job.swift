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

// MARK: - JobType Lookup

extension JobType {
    static func icon(for value: String) -> String {
        JobType(rawValue: value)?.icon ?? "wrench.fill"
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

    // Category filtering is now handled by ConfigStore.categories(for:)
}

// MARK: - Issue Severity

enum IssueSeverity: String, CaseIterable, Codable, Identifiable, Sendable {
    case critical = "Critical"
    case major = "Major"
    case minor = "Minor"

    var id: String { rawValue }

    var color: Color {
        switch self {
        case .critical: DS.Colors.error
        case .major: DS.Colors.warning
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
    var jobType: String

    init(
        id: UUID = UUID(),
        title: String = "",
        jobType: String = "Insulation"
    ) {
        self.id = id
        self.title = title
        self.jobType = jobType
    }
}

// MARK: - Form Spot (snapshot of a spot within a form, with photos)

struct FormSpot: Identifiable, Codable, Equatable, Sendable {
    let id: UUID
    var title: String
    var jobType: String
    var issuePhotos: [IssuePhoto]
    var fixPhotos: [FixPhoto]
    var materials: [Material]

    init(id: UUID = UUID(), title: String = "", jobType: String = "Insulation",
         issuePhotos: [IssuePhoto] = [], fixPhotos: [FixPhoto] = [], materials: [Material] = []) {
        self.id = id
        self.title = title
        self.jobType = jobType
        self.issuePhotos = issuePhotos
        self.fixPhotos = fixPhotos
        self.materials = materials
    }

    init(from spot: Spot) {
        self.id = spot.id
        self.title = spot.title
        self.jobType = spot.jobType
        self.issuePhotos = []
        self.fixPhotos = []
        self.materials = []
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(UUID.self, forKey: .id)
        title = try c.decode(String.self, forKey: .title)
        jobType = try c.decode(String.self, forKey: .jobType)
        issuePhotos = try c.decodeIfPresent([IssuePhoto].self, forKey: .issuePhotos) ?? []
        fixPhotos = try c.decodeIfPresent([FixPhoto].self, forKey: .fixPhotos) ?? []
        materials = try c.decodeIfPresent([Material].self, forKey: .materials) ?? []
    }
}

// MARK: - Issue Photo (audit forms — one photo = one issue)

struct IssuePhoto: Identifiable, Codable, Equatable, Sendable {
    let id: UUID
    var photoURL: String?
    var category: String
    var severity: IssueSeverity
    var notes: String
    var dateTaken: Date

    init(
        id: UUID = UUID(),
        photoURL: String? = nil,
        category: String = "Other",
        severity: IssueSeverity = .major,
        notes: String = "",
        dateTaken: Date = Date()
    ) {
        self.id = id
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
    var linkedAuditIssueId: UUID?
    var photoURL: String?
    var resolutionNotes: String
    var dateTaken: Date

    init(
        id: UUID = UUID(),
        linkedAuditIssueId: UUID? = nil,
        photoURL: String? = nil,
        resolutionNotes: String = "",
        dateTaken: Date = Date()
    ) {
        self.id = id
        self.linkedAuditIssueId = linkedAuditIssueId
        self.photoURL = photoURL
        self.resolutionNotes = resolutionNotes
        self.dateTaken = dateTaken
    }
}

// MARK: - MaterialType Lookup

extension MaterialType {
    static func icon(for value: String) -> String {
        MaterialType(rawValue: value)?.icon ?? "shippingbox.fill"
    }

    static func color(for value: String) -> Color {
        MaterialType(rawValue: value)?.color ?? DS.Colors.stageCancelled
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
        case .insulation: DS.Colors.primaryLight
        case .sealant: DS.Colors.info
        case .hvacUnit: DS.Colors.success
        case .ductwork: DS.Colors.stageInspectionPending
        case .other: DS.Colors.stageCancelled
        }
    }
}

// MARK: - Material

struct Material: Identifiable, Codable, Equatable, Sendable {
    let id: UUID
    var name: String
    var type: String
    var quantity: String
    var cost: Double?

    init(
        id: UUID = UUID(),
        name: String = "",
        type: String = "Insulation",
        quantity: String = "",
        cost: Double? = nil
    ) {
        self.id = id
        self.name = name
        self.type = type
        self.quantity = quantity
        self.cost = cost
    }
}

// MARK: - Rebate Outcome

enum RebateOutcome: String, Codable, CaseIterable, Identifiable, Sendable {
    case pending = "Pending"
    case approved = "Approved"
    case declined = "Declined"

    var id: String { rawValue }
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
        case .auditPending: DS.Colors.stageAuditPending
        case .workInProgress: DS.Colors.stageWorkInProgress
        case .inspectionPending: DS.Colors.stageInspectionPending
        case .completed: DS.Colors.stageCompleted
        case .cancelled: DS.Colors.stageCancelled
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

    var shortLabel: String {
        switch self {
        case .auditPending: "Audit"
        case .workInProgress: "In Progress"
        case .inspectionPending: "Inspection"
        case .completed: "Completed"
        case .cancelled: "Cancelled"
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
    var spots: [FormSpot]

    // Exclude computed properties from Codable encoding
    private enum CodingKeys: String, CodingKey {
        case id, formType, inspectorName, date, notes, spots
    }

    /// Flattened issue photos across all spots
    var issuePhotos: [IssuePhoto] { spots.flatMap { $0.issuePhotos } }
    /// Flattened fix photos across all spots
    var fixPhotos: [FixPhoto] { spots.flatMap { $0.fixPhotos } }
    /// All materials across all spots
    var allMaterials: [Material] { spots.flatMap { $0.materials } }

    var photoCount: Int { issuePhotos.count + fixPhotos.count }

    init(
        id: UUID = UUID(),
        formType: FormType = .inspection,
        inspectorName: String = "",
        date: Date = Date(),
        notes: String = "",
        spots: [FormSpot] = []
    ) {
        self.id = id
        self.formType = formType
        self.inspectorName = inspectorName
        self.date = date
        self.notes = notes
        self.spots = spots
    }

    /// Append an issue photo to the FormSpot matching spotId, creating one if needed
    mutating func appendIssuePhoto(_ photo: IssuePhoto, toSpot spotId: UUID, availableSpots: [Spot]) {
        if let si = spots.firstIndex(where: { $0.id == spotId }) {
            spots[si].issuePhotos.append(photo)
        } else if let spot = availableSpots.first(where: { $0.id == spotId }) {
            var formSpot = FormSpot(from: spot)
            formSpot.issuePhotos.append(photo)
            spots.append(formSpot)
        }
    }

    /// Append a fix photo to the FormSpot matching spotId, creating one if needed
    mutating func appendFixPhoto(_ photo: FixPhoto, toSpot spotId: UUID, availableSpots: [Spot]) {
        if let si = spots.firstIndex(where: { $0.id == spotId }) {
            spots[si].fixPhotos.append(photo)
        } else if let spot = availableSpots.first(where: { $0.id == spotId }) {
            var formSpot = FormSpot(from: spot)
            formSpot.fixPhotos.append(photo)
            spots.append(formSpot)
        }
    }

    /// Append materials to the FormSpot matching spotId
    mutating func appendMaterials(_ materials: [Material], toSpot spotId: UUID, availableSpots: [Spot]) {
        guard !materials.isEmpty else { return }
        if let si = spots.firstIndex(where: { $0.id == spotId }) {
            spots[si].materials.append(contentsOf: materials)
        } else if let spot = availableSpots.first(where: { $0.id == spotId }) {
            var formSpot = FormSpot(from: spot)
            formSpot.materials = materials
            spots.append(formSpot)
        }
    }
}

// MARK: - Job

struct Job: Identifiable, Codable, Equatable, Sendable {
    let id: UUID
    var companyId: String?
    var streetAddress: String
    var city: String
    var state: String
    var zipCode: String
    var contactName: String
    var contactPhone: String
    var contactEmail: String
    var notes: String
    var currentStage: JobStage
    var rebateAmount: Double
    var rebateOutcome: RebateOutcome
    var spots: [Spot]
    var formCount: Int
    var photoCount: Int
    var issueCount: Int
    var fixCount: Int
    var houseImageURL: String?
    var latitude: Double?
    var longitude: Double?
    var createdAt: Date
    var updatedAt: Date

    /// Combined display address
    var address: String {
        [streetAddress, city, state, zipCode]
            .filter { !$0.isEmpty }
            .joined(separator: ", ")
    }

    init(
        id: UUID = UUID(),
        companyId: String? = nil,
        streetAddress: String = "",
        city: String = "",
        state: String = "",
        zipCode: String = "",
        contactName: String = "",
        contactPhone: String = "",
        contactEmail: String = "",
        notes: String = "",
        currentStage: JobStage = .auditPending,
        rebateAmount: Double = 0,
        rebateOutcome: RebateOutcome = .pending,
        spots: [Spot] = [],
        formCount: Int = 0,
        photoCount: Int = 0,
        issueCount: Int = 0,
        fixCount: Int = 0,
        houseImageURL: String? = nil,
        latitude: Double? = nil,
        longitude: Double? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.companyId = companyId
        self.streetAddress = streetAddress
        self.city = city
        self.state = state
        self.zipCode = zipCode
        self.contactName = contactName
        self.contactPhone = contactPhone
        self.contactEmail = contactEmail
        self.notes = notes
        self.currentStage = currentStage
        self.rebateAmount = rebateAmount
        self.rebateOutcome = rebateOutcome
        self.spots = spots
        self.formCount = formCount
        self.photoCount = photoCount
        self.issueCount = issueCount
        self.fixCount = fixCount
        self.houseImageURL = houseImageURL
        self.latitude = latitude
        self.longitude = longitude
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    // Exclude computed `address` from Codable
    private enum CodingKeys: String, CodingKey {
        case id, companyId, streetAddress, city, state, zipCode, address
        case contactName, contactPhone, contactEmail, notes
        case currentStage, rebateAmount, rebateOutcome, spots
        case formCount, photoCount, issueCount, fixCount
        case houseImageURL
        case latitude, longitude
        case createdAt, updatedAt
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encodeIfPresent(companyId, forKey: .companyId)
        try c.encode(streetAddress, forKey: .streetAddress)
        try c.encode(city, forKey: .city)
        try c.encode(state, forKey: .state)
        try c.encode(zipCode, forKey: .zipCode)
        try c.encode(contactName, forKey: .contactName)
        try c.encode(contactPhone, forKey: .contactPhone)
        try c.encode(contactEmail, forKey: .contactEmail)
        try c.encode(notes, forKey: .notes)
        try c.encode(currentStage, forKey: .currentStage)
        try c.encode(rebateAmount, forKey: .rebateAmount)
        try c.encode(rebateOutcome, forKey: .rebateOutcome)
        try c.encode(spots, forKey: .spots)
        try c.encode(formCount, forKey: .formCount)
        try c.encode(photoCount, forKey: .photoCount)
        try c.encode(issueCount, forKey: .issueCount)
        try c.encode(fixCount, forKey: .fixCount)
        try c.encodeIfPresent(houseImageURL, forKey: .houseImageURL)
        try c.encodeIfPresent(latitude, forKey: .latitude)
        try c.encodeIfPresent(longitude, forKey: .longitude)
        try c.encode(createdAt, forKey: .createdAt)
        try c.encode(updatedAt, forKey: .updatedAt)
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(UUID.self, forKey: .id)
        companyId = try c.decodeIfPresent(String.self, forKey: .companyId)
        // Migrate old single `address` field → streetAddress
        if let sa = try c.decodeIfPresent(String.self, forKey: .streetAddress), !sa.isEmpty {
            streetAddress = sa
        } else {
            streetAddress = try c.decodeIfPresent(String.self, forKey: .address) ?? ""
        }
        city = try c.decodeIfPresent(String.self, forKey: .city) ?? ""
        state = try c.decodeIfPresent(String.self, forKey: .state) ?? ""
        zipCode = try c.decodeIfPresent(String.self, forKey: .zipCode) ?? ""
        contactName = try c.decode(String.self, forKey: .contactName)
        contactPhone = try c.decode(String.self, forKey: .contactPhone)
        contactEmail = try c.decode(String.self, forKey: .contactEmail)
        notes = try c.decode(String.self, forKey: .notes)
        currentStage = try c.decode(JobStage.self, forKey: .currentStage)
        rebateAmount = try c.decode(Double.self, forKey: .rebateAmount)
        rebateOutcome = try c.decodeIfPresent(RebateOutcome.self, forKey: .rebateOutcome) ?? .pending
        spots = try c.decodeIfPresent([Spot].self, forKey: .spots) ?? []
        formCount = try c.decodeIfPresent(Int.self, forKey: .formCount) ?? 0
        photoCount = try c.decodeIfPresent(Int.self, forKey: .photoCount) ?? 0
        issueCount = try c.decodeIfPresent(Int.self, forKey: .issueCount) ?? 0
        fixCount = try c.decodeIfPresent(Int.self, forKey: .fixCount) ?? 0
        houseImageURL = try c.decodeIfPresent(String.self, forKey: .houseImageURL)
        latitude = try c.decodeIfPresent(Double.self, forKey: .latitude)
        longitude = try c.decodeIfPresent(Double.self, forKey: .longitude)
        createdAt = try c.decode(Date.self, forKey: .createdAt)
        updatedAt = try c.decode(Date.self, forKey: .updatedAt)
    }
}

// MARK: - Sample Data

extension Job {
    static let samples: [Job] = [
        Job(
            streetAddress: "742 Evergreen Terrace",
            city: "Springfield",
            state: "IL",
            zipCode: "62704",
            contactName: "Homer Simpson",
            contactPhone: "(555) 123-4567",
            contactEmail: "homer@example.com",
            notes: "Full energy audit requested. Homeowner reported high utility bills and drafts.",
            currentStage: .workInProgress,
            rebateAmount: 2500,
            spots: [
                Spot(title: "Attic Hatch", jobType: "Attic Insulation"),
                Spot(title: "Kitchen Window", jobType: "Air Sealing"),
            ],
            formCount: 1,
            photoCount: 2,
            issueCount: 0
        ),
        Job(
            streetAddress: "221B Baker Street",
            city: "London",
            state: "UK",
            zipCode: "NW1 6XE",
            contactName: "John Watson",
            contactPhone: "(555) 987-6543",
            contactEmail: "watson@example.com",
            notes: "HVAC replacement — old 12 SEER unit failing.",
            currentStage: .inspectionPending,
            rebateAmount: 4000,
            spots: [
                Spot(title: "Heat Pump Pad", jobType: "HVAC Installation"),
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

        return [
            InspectionForm(
                formType: .audit,
                inspectorName: "Mike Davis",
                date: Date().addingTimeInterval(-86400 * 2),
                notes: "Comprehensive energy audit completed.",
                spots: [
                    FormSpot(
                        id: atticSpotId,
                        title: "Attic Hatch",
                        jobType: "Attic Insulation",
                        issuePhotos: [
                            IssuePhoto(
                                category: "Insufficient R-Value",
                                severity: .major,
                                notes: "R-value measured at R-13, well below the recommended R-38 for this climate zone."
                            ),
                        ],
                        materials: [
                            Material(name: "R-38 Fiberglass Batts", type: "Insulation", quantity: "200 sq ft"),
                        ]
                    ),
                    FormSpot(
                        id: kitchenSpotId,
                        title: "Kitchen Window",
                        jobType: "Air Sealing",
                        issuePhotos: [
                            IssuePhoto(
                                category: "Missing Weatherstripping",
                                severity: .minor,
                                notes: "Visible gaps around window frame. Weatherstripping worn and missing in places."
                            ),
                        ]
                    ),
                ]
            ),
            InspectionForm(
                formType: .inspection,
                inspectorName: "Sarah Chen",
                date: Date().addingTimeInterval(-86400),
                notes: "Initial inspection of HVAC installation.",
                spots: [
                    FormSpot(
                        id: hvacSpotId,
                        title: "Heat Pump Pad",
                        jobType: "HVAC Installation",
                        fixPhotos: [
                            FixPhoto(
                                linkedAuditIssueId: issue1Id,
                                resolutionNotes: "Unit leveled and P-trap installed."
                            ),
                        ],
                        materials: [
                            Material(name: "Carrier 25VNA0 Heat Pump", type: "HVAC Unit", quantity: "1 unit"),
                            Material(name: "Foam Line Insulation", type: "Insulation", quantity: "30 ft"),
                        ]
                    ),
                ]
            ),
        ]
    }()
}
