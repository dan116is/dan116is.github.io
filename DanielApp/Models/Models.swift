import Foundation
import SwiftData

enum Priority: String, Codable, CaseIterable, Identifiable {
    case low = "נמוכה"
    case medium = "בינונית"
    case high = "גבוהה"
    case urgent = "דחוף"
    var id: String { rawValue }

    var color: String {
        switch self {
        case .low: return "gray"
        case .medium: return "blue"
        case .high: return "orange"
        case .urgent: return "red"
        }
    }
}

enum LifeCategory: String, Codable, CaseIterable, Identifiable {
    case personal = "אישי"
    case family = "משפחה"
    case business = "עסק"
    case kids = "ילדים"
    case health = "בריאות"
    case finance = "כספים"
    var id: String { rawValue }

    var icon: String {
        switch self {
        case .personal: return "person.fill"
        case .family: return "house.fill"
        case .business: return "briefcase.fill"
        case .kids: return "figure.and.child.holdinghands"
        case .health: return "heart.fill"
        case .finance: return "creditcard.fill"
        }
    }
}

@Model
final class TaskItem {
    var title: String
    var details: String
    var dueDate: Date?
    var isDone: Bool
    var priority: Priority
    var category: LifeCategory
    var createdAt: Date

    init(title: String,
         details: String = "",
         dueDate: Date? = nil,
         isDone: Bool = false,
         priority: Priority = .medium,
         category: LifeCategory = .personal) {
        self.title = title
        self.details = details
        self.dueDate = dueDate
        self.isDone = isDone
        self.priority = priority
        self.category = category
        self.createdAt = Date()
    }
}

@Model
final class Errand {
    var title: String
    var location: String
    var dueDate: Date?
    var isDone: Bool
    var createdAt: Date

    init(title: String, location: String = "", dueDate: Date? = nil, isDone: Bool = false) {
        self.title = title
        self.location = location
        self.dueDate = dueDate
        self.isDone = isDone
        self.createdAt = Date()
    }
}

@Model
final class Payment {
    var title: String
    var amount: Double
    var dueDate: Date
    var isPaid: Bool
    var isRecurring: Bool
    var notes: String
    var category: LifeCategory
    var createdAt: Date

    init(title: String,
         amount: Double,
         dueDate: Date,
         isPaid: Bool = false,
         isRecurring: Bool = false,
         notes: String = "",
         category: LifeCategory = .finance) {
        self.title = title
        self.amount = amount
        self.dueDate = dueDate
        self.isPaid = isPaid
        self.isRecurring = isRecurring
        self.notes = notes
        self.category = category
        self.createdAt = Date()
    }
}

@Model
final class Child {
    var name: String
    var birthDate: Date
    var notes: String
    @Relationship(deleteRule: .cascade, inverse: \Medication.child) var medications: [Medication] = []

    init(name: String, birthDate: Date, notes: String = "") {
        self.name = name
        self.birthDate = birthDate
        self.notes = notes
    }

    var ageYears: Int {
        Calendar.current.dateComponents([.year], from: birthDate, to: Date()).year ?? 0
    }
}

@Model
final class Medication {
    var name: String
    var dosage: String
    var instructions: String
    var startDate: Date
    var endDate: Date?
    var times: [Date]
    var child: Child?
    @Relationship(deleteRule: .cascade, inverse: \MedicationDose.medication) var doses: [MedicationDose] = []

    init(name: String,
         dosage: String,
         instructions: String = "",
         startDate: Date = Date(),
         endDate: Date? = nil,
         times: [Date] = [],
         child: Child? = nil) {
        self.name = name
        self.dosage = dosage
        self.instructions = instructions
        self.startDate = startDate
        self.endDate = endDate
        self.times = times
        self.child = child
    }
}

@Model
final class MedicationDose {
    var takenAt: Date
    var medication: Medication?

    init(takenAt: Date = Date(), medication: Medication? = nil) {
        self.takenAt = takenAt
        self.medication = medication
    }
}

enum BusinessType: String, Codable, CaseIterable, Identifiable {
    case deal = "עסקה"
    case lead = "ליד"
    case meeting = "פגישה"
    case income = "הכנסה"
    case expense = "הוצאה"
    var id: String { rawValue }
}

@Model
final class BusinessItem {
    var title: String
    var type: BusinessType
    var amount: Double
    var date: Date
    var contact: String
    var notes: String
    var isClosed: Bool
    var createdAt: Date

    init(title: String,
         type: BusinessType,
         amount: Double = 0,
         date: Date = Date(),
         contact: String = "",
         notes: String = "",
         isClosed: Bool = false) {
        self.title = title
        self.type = type
        self.amount = amount
        self.date = date
        self.contact = contact
        self.notes = notes
        self.isClosed = isClosed
        self.createdAt = Date()
    }
}

@Model
final class PersonalNote {
    var title: String
    var body: String
    var createdAt: Date
    var updatedAt: Date

    init(title: String, body: String = "") {
        self.title = title
        self.body = body
        self.createdAt = Date()
        self.updatedAt = Date()
    }
}
