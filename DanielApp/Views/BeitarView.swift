import SwiftUI

struct BeitarView: View {
    @StateObject private var svc = BeitarService.shared

    var body: some View {
        ZStack {
            Theme.beitarBlack.ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    hero
                    if let next = svc.nextMatch { nextCard(next) }
                    if let last = svc.lastResult { lastCard(last) }
                    statsCard
                    newsSection
                }.padding(16)
            }
        }
        .navigationTitle("ביתר ירושלים")
        .toolbarColorScheme(.dark, for: .navigationBar)
    }

    private var hero: some View {
        VStack(spacing: 10) {
            ZStack {
                Circle().fill(Theme.beitarYellow).frame(width: 90, height: 90)
                Text("ב").font(.system(size: 56, weight: .black)).foregroundStyle(Theme.beitarBlack)
            }
            Text("ביתר ירושלים").font(.system(size: 26, weight: .black))
                .foregroundStyle(Theme.beitarYellow)
            Text("הקבוצה הכי גדולה בארץ • דניאל ישראלי 💛🖤")
                .font(.caption).foregroundStyle(.white.opacity(0.7))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
    }

    private func nextCard(_ m: BeitarMatch) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: "calendar").foregroundStyle(Theme.beitarYellow)
                Text("המשחק הבא").font(.headline).foregroundStyle(Theme.beitarYellow)
                Spacer()
                if let days = svc.daysUntilNext() {
                    Text("\(max(days,0)) ימים")
                        .font(.caption.bold())
                        .padding(.horizontal, 10).padding(.vertical, 4)
                        .background(RoundedRectangle(cornerRadius: 8).fill(Theme.beitarYellow.opacity(0.18)))
                        .foregroundStyle(Theme.beitarYellow)
                }
            }
            HStack(spacing: 20) {
                team("ביתר", isHome: m.isHome)
                Text("VS").font(.title3.bold()).foregroundStyle(.white.opacity(0.5))
                team(m.opponent, isHome: !m.isHome)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            VStack(alignment: .leading, spacing: 4) {
                Label(m.date.hebrewRelative() + " • " + m.date.hebrewTime(), systemImage: "clock")
                    .foregroundStyle(.white).font(.subheadline)
                Label(m.venue, systemImage: "mappin").foregroundStyle(.white.opacity(0.8)).font(.subheadline)
                Label(m.competition, systemImage: "trophy.fill").foregroundStyle(Theme.beitarYellow).font(.caption)
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 22)
                .fill(Color.white.opacity(0.05))
                .overlay(RoundedRectangle(cornerRadius: 22).stroke(Theme.beitarYellow.opacity(0.4), lineWidth: 1))
        )
    }

    private func team(_ name: String, isHome: Bool) -> some View {
        VStack(spacing: 8) {
            ZStack {
                Circle().fill(name == "ביתר" ? Theme.beitarYellow : Color.white.opacity(0.15))
                    .frame(width: 50, height: 50)
                Text(String(name.prefix(1)))
                    .font(.title2.bold())
                    .foregroundStyle(name == "ביתר" ? Theme.beitarBlack : .white)
            }
            Text(name).font(.caption.bold()).foregroundStyle(.white)
            Text(isHome ? "בית" : "חוץ").font(.caption2).foregroundStyle(.white.opacity(0.5))
        }
    }

    private func lastCard(_ m: BeitarMatch) -> some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text("התוצאה האחרונה").font(.caption).foregroundStyle(.white.opacity(0.6))
                Text("נגד \(m.opponent)").font(.subheadline.bold()).foregroundStyle(.white)
                Text(m.competition).font(.caption).foregroundStyle(.white.opacity(0.6))
            }
            Spacer()
            if let r = m.result {
                Text(r).font(.headline)
                    .padding(.horizontal, 12).padding(.vertical, 8)
                    .background(RoundedRectangle(cornerRadius: 10).fill(Theme.success.opacity(0.25)))
                    .foregroundStyle(Theme.success)
            }
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 22).fill(Color.white.opacity(0.05)))
    }

    private var statsCard: some View {
        HStack(spacing: 12) {
            statBox(svc.leaguePosition.description + "º", "מקום בליגה")
            statBox(svc.leaguePoints.description, "נקודות")
            statBox(svc.topScorer.components(separatedBy: " ").first ?? "—", "כובש מוביל")
        }
    }

    private func statBox(_ value: String, _ label: String) -> some View {
        VStack(spacing: 6) {
            Text(value).font(.system(size: 22, weight: .heavy)).foregroundStyle(Theme.beitarYellow)
            Text(label).font(.caption2).foregroundStyle(.white.opacity(0.65))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(RoundedRectangle(cornerRadius: 16).fill(Color.white.opacity(0.05)))
    }

    private var newsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("חדשות מהצהובים שחורים").font(.headline).foregroundStyle(Theme.beitarYellow).padding(.top, 6)
            ForEach(svc.news) { n in
                VStack(alignment: .leading, spacing: 4) {
                    Text(n.headline).font(.subheadline.bold()).foregroundStyle(.white)
                    Text(n.body).font(.caption).foregroundStyle(.white.opacity(0.75))
                    Text(n.date.hebrewRelative()).font(.caption2).foregroundStyle(.white.opacity(0.45))
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(RoundedRectangle(cornerRadius: 18).fill(Color.white.opacity(0.05)))
            }
        }
    }
}
