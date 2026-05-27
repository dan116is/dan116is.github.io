import Foundation
import SwiftData

struct AISuggestion: Identifiable {
    let id = UUID()
    let title: String
    let detail: String
    let icon: String
    let tone: Tone

    enum Tone {
        case info, warning, urgent, positive
    }
}

@MainActor
final class AIAssistant {
    let context: ModelContext

    init(context: ModelContext) {
        self.context = context
    }

    func dailyGreeting() -> String {
        let hour = Calendar.current.component(.hour, from: Date())
        let name = "דניאל"
        switch hour {
        case 5..<12: return "בוקר טוב, \(name) ☀️"
        case 12..<17: return "צהריים טובים, \(name) 🌞"
        case 17..<21: return "ערב טוב, \(name) 🌙"
        default: return "לילה טוב, \(name) ✨"
        }
    }

    func suggestions() -> [AISuggestion] {
        var out: [AISuggestion] = []
        let now = Date()
        let cal = Calendar.current

        if let tasks = try? context.fetch(FetchDescriptor<TaskItem>()) {
            let overdue = tasks.filter { !$0.isDone && ($0.dueDate.map { $0 < now } ?? false) }
            let urgent = tasks.filter { !$0.isDone && $0.priority == .urgent }
            let dueToday = tasks.filter {
                !$0.isDone && ($0.dueDate.map { cal.isDateInToday($0) } ?? false)
            }

            if !overdue.isEmpty {
                out.append(.init(
                    title: "\(overdue.count) משימות באיחור",
                    detail: "שווה לסגור או לדחות אותן עכשיו",
                    icon: "exclamationmark.triangle.fill",
                    tone: .urgent
                ))
            }
            if !urgent.isEmpty && overdue.isEmpty {
                out.append(.init(
                    title: "\(urgent.count) משימות דחופות",
                    detail: urgent.first?.title ?? "",
                    icon: "flame.fill",
                    tone: .warning
                ))
            }
            if !dueToday.isEmpty {
                out.append(.init(
                    title: "להיום: \(dueToday.count) משימות",
                    detail: dueToday.prefix(2).map { $0.title }.joined(separator: " • "),
                    icon: "calendar.badge.clock",
                    tone: .info
                ))
            }
        }

        if let payments = try? context.fetch(FetchDescriptor<Payment>()) {
            let upcoming = payments.filter {
                !$0.isPaid && $0.dueDate >= now &&
                $0.dueDate <= cal.date(byAdding: .day, value: 7, to: now)!
            }
            let overdue = payments.filter { !$0.isPaid && $0.dueDate < now }

            if !overdue.isEmpty {
                let total = overdue.reduce(0) { $0 + $1.amount }
                out.append(.init(
                    title: "תשלומים שעברו: \(overdue.count)",
                    detail: "סה\"כ ₪\(Int(total)) לטיפול",
                    icon: "creditcard.trianglebadge.exclamationmark",
                    tone: .urgent
                ))
            }
            if !upcoming.isEmpty {
                let total = upcoming.reduce(0) { $0 + $1.amount }
                out.append(.init(
                    title: "השבוע: \(upcoming.count) תשלומים",
                    detail: "סה\"כ ₪\(Int(total))",
                    icon: "calendar",
                    tone: .info
                ))
            }
        }

        if let meds = try? context.fetch(FetchDescriptor<Medication>()) {
            let activeMeds = meds.filter { ($0.endDate ?? Date.distantFuture) >= now }
            for med in activeMeds {
                let lastDose = med.doses.map { $0.takenAt }.max()
                let nextDue = med.times.compactMap { time -> Date? in
                    let h = cal.component(.hour, from: time)
                    let m = cal.component(.minute, from: time)
                    return cal.date(bySettingHour: h, minute: m, second: 0, of: now)
                }.first { $0 >= now }

                if let next = nextDue, next.timeIntervalSince(now) < 3600 {
                    let kid = med.child?.name ?? ""
                    out.append(.init(
                        title: "תרופה בקרוב: \(med.name)",
                        detail: kid.isEmpty ? med.dosage : "\(kid) • \(med.dosage)",
                        icon: "pills.fill",
                        tone: .warning
                    ))
                }

                if lastDose == nil && med.startDate <= now {
                    _ = med.name
                }
            }
        }

        if let business = try? context.fetch(FetchDescriptor<BusinessItem>()) {
            let openDeals = business.filter { !$0.isClosed && $0.type == .deal }
            if !openDeals.isEmpty {
                let pot = openDeals.reduce(0) { $0 + $1.amount }
                out.append(.init(
                    title: "\(openDeals.count) עסקאות פתוחות",
                    detail: "פוטנציאל ₪\(Int(pot))",
                    icon: "briefcase.fill",
                    tone: .positive
                ))
            }
        }

        if out.isEmpty {
            out.append(.init(
                title: "הכל נקי 🎯",
                detail: "אין משימות דחופות. רגע טוב למשהו שאתה דוחה",
                icon: "sparkles",
                tone: .positive
            ))
        }
        return out
    }
}
