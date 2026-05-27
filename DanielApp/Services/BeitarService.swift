import Foundation

struct BeitarMatch: Identifiable, Codable {
    let id: UUID
    let opponent: String
    let date: Date
    let venue: String
    let competition: String
    let isHome: Bool
    var result: String?

    init(id: UUID = UUID(), opponent: String, date: Date, venue: String, competition: String, isHome: Bool, result: String? = nil) {
        self.id = id
        self.opponent = opponent
        self.date = date
        self.venue = venue
        self.competition = competition
        self.isHome = isHome
        self.result = result
    }
}

struct BeitarNews: Identifiable {
    let id = UUID()
    let headline: String
    let body: String
    let date: Date
}

@MainActor
final class BeitarService: ObservableObject {
    @Published var nextMatch: BeitarMatch?
    @Published var lastResult: BeitarMatch?
    @Published var leaguePosition: Int = 0
    @Published var leaguePoints: Int = 0
    @Published var topScorer: String = ""
    @Published var news: [BeitarNews] = []

    static let shared = BeitarService()

    init() {
        loadLocalData()
    }

    func loadLocalData() {
        let cal = Calendar.current
        let now = Date()
        nextMatch = BeitarMatch(
            opponent: "מכבי ת״א",
            date: cal.date(byAdding: .day, value: 3, to: now) ?? now,
            venue: "טדי, ירושלים",
            competition: "ליגת העל",
            isHome: true
        )
        lastResult = BeitarMatch(
            opponent: "הפועל ב״ש",
            date: cal.date(byAdding: .day, value: -4, to: now) ?? now,
            venue: "טרנר, באר שבע",
            competition: "ליגת העל",
            isHome: false,
            result: "2-1 ניצחון"
        )
        leaguePosition = 4
        leaguePoints = 45
        topScorer = "ברנדן אוגביבו"
        news = [
            BeitarNews(
                headline: "ניצחון חוץ חשוב בבאר שבע",
                body: "ביתר ירושלים חזרה הביתה עם שלוש נקודות חשובות אחרי 2-1 על הפועל ב״ש. המאמן ציין את הרוח הקבוצתית.",
                date: cal.date(byAdding: .day, value: -3, to: now) ?? now
            ),
            BeitarNews(
                headline: "השחקן החדש הגיע למחנה",
                body: "החלוץ הזר חתם ל-3 עונות והצטרף לאימונים. צפוי לעלות בדרבי הקרוב מול מכבי ת״א.",
                date: cal.date(byAdding: .day, value: -1, to: now) ?? now
            ),
            BeitarNews(
                headline: "כרטיסים לדרבי – מהיום בקופות",
                body: "המנויים יכולים להזמין עד יום שלישי בערב. שאר הכרטיסים – לרכישה חופשית מיום רביעי בבוקר.",
                date: now
            )
        ]
    }

    func daysUntilNext() -> Int? {
        guard let nm = nextMatch else { return nil }
        return Calendar.current.dateComponents([.day], from: Date(), to: nm.date).day
    }
}
