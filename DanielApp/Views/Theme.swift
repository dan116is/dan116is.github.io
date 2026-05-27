import SwiftUI

enum Theme {
    static let bg = Color(red: 0.04, green: 0.04, blue: 0.07)
    static let card = Color(red: 0.10, green: 0.10, blue: 0.14)
    static let cardHi = Color(red: 0.14, green: 0.14, blue: 0.18)
    static let accent = Color(red: 0.98, green: 0.78, blue: 0.10)
    static let accent2 = Color(red: 0.20, green: 0.55, blue: 1.0)
    static let success = Color(red: 0.20, green: 0.80, blue: 0.45)
    static let danger = Color(red: 0.95, green: 0.30, blue: 0.30)
    static let beitarYellow = Color(red: 1.0, green: 0.84, blue: 0.0)
    static let beitarBlack = Color(red: 0.02, green: 0.02, blue: 0.04)

    static let mutedText = Color.white.opacity(0.62)
}

struct CardStyle: ViewModifier {
    var padding: CGFloat = 16
    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(Theme.card)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .stroke(Color.white.opacity(0.06), lineWidth: 1)
            )
    }
}

extension View {
    func cardStyle(padding: CGFloat = 16) -> some View {
        modifier(CardStyle(padding: padding))
    }
}

extension Date {
    func hebrewRelative() -> String {
        let cal = Calendar.current
        if cal.isDateInToday(self) { return "היום" }
        if cal.isDateInTomorrow(self) { return "מחר" }
        if cal.isDateInYesterday(self) { return "אתמול" }
        let df = DateFormatter()
        df.locale = Locale(identifier: "he_IL")
        df.dateFormat = "EEEE d MMM"
        return df.string(from: self)
    }

    func hebrewShort() -> String {
        let df = DateFormatter()
        df.locale = Locale(identifier: "he_IL")
        df.dateFormat = "d MMM"
        return df.string(from: self)
    }

    func hebrewTime() -> String {
        let df = DateFormatter()
        df.locale = Locale(identifier: "he_IL")
        df.dateFormat = "HH:mm"
        return df.string(from: self)
    }
}
