import SwiftUI
import SwiftData

struct PaymentsView: View {
    @Environment(\.modelContext) private var ctx
    @Query(sort: [SortDescriptor(\Payment.isPaid), SortDescriptor(\Payment.dueDate)]) private var payments: [Payment]
    @State private var showAdd = false

    var totalDue: Double {
        payments.filter { !$0.isPaid }.reduce(0) { $0 + $1.amount }
    }
    var paidThisMonth: Double {
        let cal = Calendar.current
        let comps = cal.dateComponents([.year, .month], from: Date())
        return payments.filter {
            $0.isPaid && cal.dateComponents([.year, .month], from: $0.dueDate) == comps
        }.reduce(0) { $0 + $1.amount }
    }

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()
            VStack(spacing: 14) {
                HStack(spacing: 12) {
                    StatTile(value: "₪\(Int(totalDue))", label: "סה״כ לתשלום", icon: "creditcard", color: Theme.danger)
                    StatTile(value: "₪\(Int(paidThisMonth))", label: "שולם החודש", icon: "checkmark.seal.fill", color: Theme.success)
                }
                .padding(.horizontal, 16).padding(.top, 8)

                List {
                    ForEach(payments) { p in
                        PaymentRow(payment: p)
                            .listRowBackground(Theme.card)
                    }
                    .onDelete { idx in idx.forEach { ctx.delete(payments[$0]) } }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .background(Theme.bg)
            }
        }
        .navigationTitle("תשלומים")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showAdd = true } label: { Image(systemName: "plus") }
                    .tint(Theme.accent)
            }
        }
        .sheet(isPresented: $showAdd) { AddPaymentView().environment(\.layoutDirection, .rightToLeft) }
    }
}

struct PaymentRow: View {
    @Bindable var payment: Payment
    var body: some View {
        HStack(spacing: 12) {
            Button { payment.isPaid.toggle() } label: {
                Image(systemName: payment.isPaid ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 22))
                    .foregroundStyle(payment.isPaid ? Theme.success : Theme.mutedText)
            }
            .buttonStyle(.plain)
            VStack(alignment: .leading, spacing: 3) {
                Text(payment.title).font(.subheadline.bold()).foregroundStyle(.white)
                HStack(spacing: 6) {
                    Pill(text: "₪\(Int(payment.amount))", color: Theme.accent)
                    Pill(text: payment.dueDate.hebrewRelative(),
                         color: payment.dueDate < Date() && !payment.isPaid ? Theme.danger : Theme.accent2)
                    if payment.isRecurring { Pill(text: "חודשי", color: .purple) }
                }
                if !payment.notes.isEmpty {
                    Text(payment.notes).font(.caption).foregroundStyle(Theme.mutedText)
                }
            }
            Spacer()
        }
        .padding(.vertical, 4)
    }
}

struct AddPaymentView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var ctx
    @State private var title = ""
    @State private var amount = ""
    @State private var due = Date()
    @State private var recurring = false
    @State private var notes = ""
    @State private var category: LifeCategory = .finance

    var body: some View {
        NavigationStack {
            Form {
                TextField("שם התשלום", text: $title)
                TextField("סכום ₪", text: $amount).keyboardType(.decimalPad)
                DatePicker("תאריך לתשלום", selection: $due, displayedComponents: [.date])
                    .environment(\.locale, Locale(identifier: "he_IL"))
                Toggle("תשלום חוזר חודשי", isOn: $recurring)
                Picker("קטגוריה", selection: $category) {
                    ForEach(LifeCategory.allCases) { Text($0.rawValue).tag($0) }
                }
                TextField("הערות", text: $notes, axis: .vertical)
            }
            .navigationTitle("תשלום חדש")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("ביטול") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("שמירה") {
                        let amt = Double(amount.replacingOccurrences(of: ",", with: ".")) ?? 0
                        let p = Payment(title: title, amount: amt, dueDate: due, isRecurring: recurring, notes: notes, category: category)
                        ctx.insert(p)
                        dismiss()
                    }.disabled(title.isEmpty || Double(amount) == nil)
                }
            }
        }
    }
}
