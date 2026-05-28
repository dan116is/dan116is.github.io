import SwiftUI

struct QuickAddView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var choice: Choice?

    enum Choice: String, CaseIterable, Identifiable {
        case task = "משימה"
        case errand = "סידור"
        case payment = "תשלום"
        case business = "פעילות עסקית"
        case note = "פתק"
        case child = "ילד"
        case med = "תרופה"
        var id: String { rawValue }

        var icon: String {
            switch self {
            case .task: return "checklist"
            case .errand: return "list.bullet.rectangle"
            case .payment: return "creditcard.fill"
            case .business: return "briefcase.fill"
            case .note: return "note.text"
            case .child: return "figure.and.child.holdinghands"
            case .med: return "pills.fill"
            }
        }
        var color: Color {
            switch self {
            case .task: return Theme.accent2
            case .errand: return .teal
            case .payment: return Theme.accent
            case .business: return .indigo
            case .note: return .mint
            case .child: return .pink
            case .med: return .red
            }
        }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                Theme.bg.ignoresSafeArea()
                VStack(spacing: 16) {
                    Text("מה רוצה להוסיף?")
                        .font(.title2.bold()).foregroundStyle(.white)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 20).padding(.top, 12)

                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                        ForEach(Choice.allCases) { c in
                            Button { choice = c } label: {
                                VStack(spacing: 10) {
                                    Image(systemName: c.icon)
                                        .font(.system(size: 28))
                                        .foregroundStyle(c.color)
                                        .frame(width: 56, height: 56)
                                        .background(Circle().fill(c.color.opacity(0.18)))
                                    Text(c.rawValue).font(.subheadline.bold()).foregroundStyle(.white)
                                }
                                .frame(maxWidth: .infinity).padding(.vertical, 14)
                                .background(RoundedRectangle(cornerRadius: 18).fill(Theme.card))
                            }
                            .buttonStyle(.plain)
                        }
                    }.padding(.horizontal, 16)

                    Spacer()
                }
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("סגור") { dismiss() }.tint(Theme.accent)
                }
            }
            .sheet(item: $choice) { c in
                Group {
                    switch c {
                    case .task: AddTaskView()
                    case .errand: AddErrandView()
                    case .payment: AddPaymentView()
                    case .business: AddBusinessView()
                    case .note: AddNoteView()
                    case .child: AddChildView()
                    case .med: AddMedicationView(child: nil)
                    }
                }
                .environment(\.layoutDirection, .rightToLeft)
            }
        }
    }
}
