import SwiftUI
import SwiftData

struct BusinessView: View {
    @Environment(\.modelContext) private var ctx
    @Query(sort: [SortDescriptor(\BusinessItem.isClosed), SortDescriptor(\BusinessItem.date, order: .reverse)]) private var items: [BusinessItem]
    @State private var showAdd = false
    @State private var typeFilter: BusinessType? = nil

    var filtered: [BusinessItem] {
        if let f = typeFilter { return items.filter { $0.type == f } }
        return items
    }

    var openDealsValue: Double {
        items.filter { !$0.isClosed && $0.type == .deal }.reduce(0) { $0 + $1.amount }
    }
    var monthIncome: Double {
        let cal = Calendar.current
        let comps = cal.dateComponents([.year, .month], from: Date())
        return items.filter {
            $0.type == .income && cal.dateComponents([.year, .month], from: $0.date) == comps
        }.reduce(0) { $0 + $1.amount }
    }

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()
            VStack(spacing: 12) {
                HStack(spacing: 12) {
                    StatTile(value: "₪\(Int(openDealsValue))", label: "עסקאות פתוחות", icon: "briefcase", color: .indigo)
                    StatTile(value: "₪\(Int(monthIncome))", label: "הכנסות החודש", icon: "arrow.up.right.circle.fill", color: Theme.success)
                }.padding(.horizontal, 16).padding(.top, 8)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        FilterChip(text: "הכל", active: typeFilter == nil) { typeFilter = nil }
                        ForEach(BusinessType.allCases) { t in
                            FilterChip(text: t.rawValue, active: typeFilter == t) { typeFilter = t }
                        }
                    }.padding(.horizontal, 16)
                }

                List {
                    ForEach(filtered) { item in
                        BusinessRow(item: item).listRowBackground(Theme.card)
                    }
                    .onDelete { idx in idx.forEach { ctx.delete(filtered[$0]) } }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .background(Theme.bg)
            }
        }
        .navigationTitle("עסקים")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showAdd = true } label: { Image(systemName: "plus") }
                    .tint(Theme.accent)
            }
        }
        .sheet(isPresented: $showAdd) { AddBusinessView().environment(\.layoutDirection, .rightToLeft) }
    }
}

struct BusinessRow: View {
    @Bindable var item: BusinessItem
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: iconFor(item.type))
                .foregroundStyle(colorFor(item.type))
                .frame(width: 40, height: 40)
                .background(Circle().fill(colorFor(item.type).opacity(0.18)))
            VStack(alignment: .leading, spacing: 3) {
                Text(item.title).font(.subheadline.bold()).foregroundStyle(.white)
                HStack(spacing: 6) {
                    Pill(text: item.type.rawValue, color: colorFor(item.type))
                    if item.amount > 0 { Pill(text: "₪\(Int(item.amount))", color: Theme.accent) }
                    Pill(text: item.date.hebrewShort(), color: Theme.mutedText)
                }
                if !item.contact.isEmpty {
                    Text(item.contact).font(.caption).foregroundStyle(Theme.mutedText)
                }
            }
            Spacer()
            if !item.isClosed {
                Button { item.isClosed.toggle() } label: {
                    Image(systemName: "checkmark.circle").foregroundStyle(Theme.mutedText)
                }.buttonStyle(.plain)
            } else {
                Image(systemName: "checkmark.circle.fill").foregroundStyle(Theme.success)
            }
        }
        .padding(.vertical, 4)
    }

    func iconFor(_ t: BusinessType) -> String {
        switch t {
        case .deal: return "handshake.fill"
        case .lead: return "person.crop.circle.badge.plus"
        case .meeting: return "calendar.badge.clock"
        case .income: return "arrow.up.right.circle.fill"
        case .expense: return "arrow.down.right.circle.fill"
        }
    }
    func colorFor(_ t: BusinessType) -> Color {
        switch t {
        case .deal: return .indigo
        case .lead: return Theme.accent2
        case .meeting: return Theme.accent
        case .income: return Theme.success
        case .expense: return Theme.danger
        }
    }
}

struct AddBusinessView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var ctx
    @State private var title = ""
    @State private var type: BusinessType = .deal
    @State private var amount = ""
    @State private var date = Date()
    @State private var contact = ""
    @State private var notes = ""

    var body: some View {
        NavigationStack {
            Form {
                TextField("כותרת", text: $title)
                Picker("סוג", selection: $type) {
                    ForEach(BusinessType.allCases) { Text($0.rawValue).tag($0) }
                }
                TextField("סכום ₪", text: $amount).keyboardType(.decimalPad)
                DatePicker("תאריך", selection: $date)
                    .environment(\.locale, Locale(identifier: "he_IL"))
                TextField("איש קשר", text: $contact)
                TextField("הערות", text: $notes, axis: .vertical)
            }
            .navigationTitle("פעילות עסקית")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("ביטול") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("שמירה") {
                        let amt = Double(amount.replacingOccurrences(of: ",", with: ".")) ?? 0
                        let b = BusinessItem(title: title, type: type, amount: amt, date: date, contact: contact, notes: notes)
                        ctx.insert(b)
                        dismiss()
                    }.disabled(title.isEmpty)
                }
            }
        }
    }
}
