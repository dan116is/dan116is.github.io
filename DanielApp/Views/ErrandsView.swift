import SwiftUI
import SwiftData

struct ErrandsView: View {
    @Environment(\.modelContext) private var ctx
    @Query(sort: [SortDescriptor(\Errand.isDone), SortDescriptor(\Errand.dueDate)]) private var errands: [Errand]
    @State private var showAdd = false

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()
            List {
                ForEach(errands) { e in
                    ErrandRow(errand: e).listRowBackground(Theme.card)
                }
                .onDelete { idx in idx.forEach { ctx.delete(errands[$0]) } }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(Theme.bg)
        }
        .navigationTitle("סידורים")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showAdd = true } label: { Image(systemName: "plus") }
                    .tint(Theme.accent)
            }
        }
        .sheet(isPresented: $showAdd) { AddErrandView().environment(\.layoutDirection, .rightToLeft) }
    }
}

struct ErrandRow: View {
    @Bindable var errand: Errand
    var body: some View {
        HStack(spacing: 12) {
            Button { errand.isDone.toggle() } label: {
                Image(systemName: errand.isDone ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 22))
                    .foregroundStyle(errand.isDone ? Theme.success : Theme.mutedText)
            }
            .buttonStyle(.plain)
            VStack(alignment: .leading, spacing: 3) {
                Text(errand.title).font(.subheadline.bold())
                    .foregroundStyle(errand.isDone ? Theme.mutedText : .white)
                    .strikethrough(errand.isDone)
                HStack(spacing: 6) {
                    if !errand.location.isEmpty {
                        Pill(text: errand.location, color: .teal)
                    }
                    if let d = errand.dueDate {
                        Pill(text: d.hebrewRelative(),
                             color: d < Date() && !errand.isDone ? Theme.danger : Theme.accent2)
                    }
                }
            }
            Spacer()
        }
        .padding(.vertical, 4)
    }
}

struct AddErrandView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var ctx
    @State private var title = ""
    @State private var location = ""
    @State private var hasDue = false
    @State private var due = Date()

    var body: some View {
        NavigationStack {
            Form {
                TextField("מה לעשות", text: $title)
                TextField("איפה (אופציונלי)", text: $location)
                Toggle("יש דדליין", isOn: $hasDue)
                if hasDue {
                    DatePicker("מתי", selection: $due)
                        .environment(\.locale, Locale(identifier: "he_IL"))
                }
            }
            .navigationTitle("סידור חדש")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("ביטול") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("שמירה") {
                        let e = Errand(title: title, location: location, dueDate: hasDue ? due : nil)
                        ctx.insert(e)
                        dismiss()
                    }.disabled(title.isEmpty)
                }
            }
        }
    }
}
