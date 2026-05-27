import SwiftUI
import SwiftData

struct DashboardView: View {
    @Environment(\.modelContext) private var ctx
    @Query private var tasks: [TaskItem]
    @Query private var payments: [Payment]
    @Query private var meds: [Medication]
    @Query private var kids: [Child]
    @Query private var business: [BusinessItem]
    @Query private var errands: [Errand]

    @StateObject private var beitar = BeitarService.shared
    @State private var showAdd = false

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        header
                        aiCard
                        beitarCard
                        quickStats
                        modulesGrid
                        upcomingSection
                        Spacer(minLength: 60)
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                }
            }
            .navigationBarHidden(true)
            .overlay(alignment: .bottomLeading) {
                Button { showAdd = true } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundStyle(Theme.beitarBlack)
                        .frame(width: 60, height: 60)
                        .background(
                            Circle().fill(Theme.accent)
                                .shadow(color: Theme.accent.opacity(0.5), radius: 14, y: 6)
                        )
                }
                .padding(.bottom, 24)
                .padding(.leading, 24)
            }
            .sheet(isPresented: $showAdd) {
                QuickAddView()
                    .environment(\.layoutDirection, .rightToLeft)
            }
        }
    }

    private var assistant: AIAssistant { AIAssistant(context: ctx) }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(assistant.dailyGreeting())
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(.white)
            Text(Date().hebrewRelative() + " • " + Date().hebrewShort())
                .font(.subheadline)
                .foregroundStyle(Theme.mutedText)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 8)
    }

    private var aiCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "sparkles")
                    .foregroundStyle(Theme.accent)
                Text("מה חשוב עכשיו")
                    .font(.headline)
                    .foregroundStyle(.white)
                Spacer()
            }
            ForEach(assistant.suggestions()) { s in
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: s.icon)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(toneColor(s.tone))
                        .frame(width: 36, height: 36)
                        .background(Circle().fill(toneColor(s.tone).opacity(0.18)))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(s.title).font(.subheadline.bold()).foregroundStyle(.white)
                        if !s.detail.isEmpty {
                            Text(s.detail).font(.caption).foregroundStyle(Theme.mutedText)
                        }
                    }
                    Spacer()
                }
            }
        }
        .cardStyle()
    }

    private func toneColor(_ t: AISuggestion.Tone) -> Color {
        switch t {
        case .info: return Theme.accent2
        case .warning: return .orange
        case .urgent: return Theme.danger
        case .positive: return Theme.success
        }
    }

    private var beitarCard: some View {
        NavigationLink(destination: BeitarView()) {
            ZStack(alignment: .topTrailing) {
                LinearGradient(
                    colors: [Theme.beitarBlack, Color.black.opacity(0.85)],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )

                VStack(alignment: .leading, spacing: 14) {
                    HStack(spacing: 10) {
                        ZStack {
                            Circle().fill(Theme.beitarYellow)
                                .frame(width: 44, height: 44)
                            Text("ב")
                                .font(.system(size: 26, weight: .black))
                                .foregroundStyle(Theme.beitarBlack)
                        }
                        VStack(alignment: .leading, spacing: 2) {
                            Text("ביתר ירושלים")
                                .font(.system(size: 18, weight: .heavy))
                                .foregroundStyle(Theme.beitarYellow)
                            Text("הקבוצה הכי גדולה בארץ 💛🖤")
                                .font(.caption)
                                .foregroundStyle(.white.opacity(0.7))
                        }
                        Spacer()
                    }

                    if let next = beitar.nextMatch {
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("המשחק הבא")
                                    .font(.caption).foregroundStyle(.white.opacity(0.55))
                                Text("\(next.isHome ? "בית" : "חוץ") נגד \(next.opponent)")
                                    .font(.subheadline.bold()).foregroundStyle(.white)
                                Text("\(next.date.hebrewRelative()) • \(next.date.hebrewTime()) • \(next.venue)")
                                    .font(.caption).foregroundStyle(.white.opacity(0.7))
                            }
                            Spacer()
                            if let days = beitar.daysUntilNext() {
                                VStack {
                                    Text("\(max(days,0))")
                                        .font(.system(size: 26, weight: .black))
                                        .foregroundStyle(Theme.beitarYellow)
                                    Text(days == 1 ? "יום" : "ימים")
                                        .font(.caption2).foregroundStyle(.white.opacity(0.7))
                                }
                                .padding(.horizontal, 14).padding(.vertical, 8)
                                .background(RoundedRectangle(cornerRadius: 14).fill(Theme.beitarYellow.opacity(0.12)))
                            }
                        }
                    }

                    HStack(spacing: 8) {
                        Pill(text: "מקום \(beitar.leaguePosition) בליגה", color: Theme.beitarYellow)
                        Pill(text: "\(beitar.leaguePoints) נק'", color: Theme.beitarYellow)
                    }
                }
                .padding(16)
            }
            .clipShape(RoundedRectangle(cornerRadius: 22))
            .overlay(
                RoundedRectangle(cornerRadius: 22)
                    .stroke(Theme.beitarYellow.opacity(0.35), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var quickStats: some View {
        HStack(spacing: 12) {
            StatTile(value: "\(openTasks)", label: "משימות פתוחות", icon: "checklist", color: Theme.accent2)
            StatTile(value: "\(upcomingPayments)", label: "תשלומים השבוע", icon: "creditcard", color: Theme.accent)
            StatTile(value: "\(activeMeds)", label: "תרופות פעילות", icon: "pills", color: .pink)
        }
    }

    private var openTasks: Int { tasks.filter { !$0.isDone }.count }
    private var upcomingPayments: Int {
        let now = Date()
        let weekLater = Calendar.current.date(byAdding: .day, value: 7, to: now)!
        return payments.filter { !$0.isPaid && $0.dueDate >= now && $0.dueDate <= weekLater }.count
    }
    private var activeMeds: Int {
        meds.filter { ($0.endDate ?? Date.distantFuture) >= Date() }.count
    }

    private var modulesGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
            ModuleTile(title: "משימות", subtitle: "\(openTasks) פתוחות", icon: "checklist", color: Theme.accent2) {
                TasksView()
            }
            ModuleTile(title: "סידורים", subtitle: "\(errands.filter{!$0.isDone}.count) ממתינים", icon: "list.bullet.rectangle", color: .teal) {
                ErrandsView()
            }
            ModuleTile(title: "תשלומים", subtitle: "\(upcomingPayments) השבוע", icon: "creditcard.fill", color: Theme.accent) {
                PaymentsView()
            }
            ModuleTile(title: "ילדים", subtitle: "\(kids.count) ילדים", icon: "figure.and.child.holdinghands", color: .pink) {
                KidsView()
            }
            ModuleTile(title: "תרופות", subtitle: "\(activeMeds) פעילות", icon: "pills.fill", color: .red) {
                MedicationsView()
            }
            ModuleTile(title: "עסקים", subtitle: "\(business.filter{!$0.isClosed}.count) פעילים", icon: "briefcase.fill", color: .indigo) {
                BusinessView()
            }
            ModuleTile(title: "ניהול אישי", subtitle: "פתקים והערות", icon: "person.text.rectangle", color: .mint) {
                PersonalView()
            }
            ModuleTile(title: "ביתר ירושלים", subtitle: "כל המידע", icon: "sportscourt.fill", color: Theme.beitarYellow) {
                BeitarView()
            }
        }
    }

    private var upcomingSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("הקרובים שלך")
                .font(.headline).foregroundStyle(.white)

            let items = nextItems()
            if items.isEmpty {
                Text("אין אירועים קרובים. הכל רגוע 😎")
                    .font(.subheadline).foregroundStyle(Theme.mutedText)
                    .padding(.vertical, 8)
            } else {
                ForEach(items, id: \.id) { item in
                    HStack {
                        Image(systemName: item.icon)
                            .foregroundStyle(item.color)
                            .frame(width: 32)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.title).font(.subheadline).foregroundStyle(.white)
                            Text(item.subtitle).font(.caption).foregroundStyle(Theme.mutedText)
                        }
                        Spacer()
                        Text(item.date.hebrewRelative())
                            .font(.caption.bold())
                            .padding(.horizontal, 8).padding(.vertical, 4)
                            .background(RoundedRectangle(cornerRadius: 8).fill(item.color.opacity(0.18)))
                            .foregroundStyle(item.color)
                    }
                    .padding(.vertical, 6)
                }
            }
        }
        .cardStyle()
    }

    struct UpcomingItem {
        let id = UUID()
        let title: String
        let subtitle: String
        let date: Date
        let icon: String
        let color: Color
    }

    private func nextItems() -> [UpcomingItem] {
        var out: [UpcomingItem] = []
        let now = Date()
        for t in tasks where !t.isDone {
            if let d = t.dueDate, d >= now {
                out.append(.init(title: t.title, subtitle: "משימה • " + t.priority.rawValue, date: d, icon: "checklist", color: Theme.accent2))
            }
        }
        for p in payments where !p.isPaid {
            if p.dueDate >= now {
                out.append(.init(title: p.title, subtitle: "₪\(Int(p.amount))", date: p.dueDate, icon: "creditcard", color: Theme.accent))
            }
        }
        for e in errands where !e.isDone {
            if let d = e.dueDate, d >= now {
                out.append(.init(title: e.title, subtitle: e.location.isEmpty ? "סידור" : e.location, date: d, icon: "list.bullet", color: .teal))
            }
        }
        return Array(out.sorted { $0.date < $1.date }.prefix(5))
    }
}

struct Pill: View {
    let text: String
    var color: Color = Theme.accent
    var body: some View {
        Text(text)
            .font(.caption.bold())
            .padding(.horizontal, 10).padding(.vertical, 5)
            .background(RoundedRectangle(cornerRadius: 8).fill(color.opacity(0.18)))
            .foregroundStyle(color)
    }
}

struct StatTile: View {
    let value: String
    let label: String
    let icon: String
    let color: Color
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image(systemName: icon).foregroundStyle(color)
            Text(value).font(.system(size: 24, weight: .heavy)).foregroundStyle(.white)
            Text(label).font(.caption).foregroundStyle(Theme.mutedText)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle(padding: 12)
    }
}

struct ModuleTile<Destination: View>: View {
    let title: String
    let subtitle: String
    let icon: String
    let color: Color
    @ViewBuilder var destination: () -> Destination

    var body: some View {
        NavigationLink {
            destination()
        } label: {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Image(systemName: icon)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(color)
                        .frame(width: 40, height: 40)
                        .background(Circle().fill(color.opacity(0.18)))
                    Spacer()
                    Image(systemName: "chevron.left").font(.caption).foregroundStyle(Theme.mutedText)
                }
                Text(title).font(.headline).foregroundStyle(.white)
                Text(subtitle).font(.caption).foregroundStyle(Theme.mutedText)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .cardStyle()
        }
        .buttonStyle(.plain)
    }
}
