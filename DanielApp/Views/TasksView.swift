import SwiftUI
import SwiftData

struct TasksView: View {
    @Environment(\.modelContext) private var ctx
    @Query(sort: [SortDescriptor(\TaskItem.isDone), SortDescriptor(\TaskItem.dueDate)]) private var tasks: [TaskItem]
    @State private var showAdd = false
    @State private var filter: LifeCategory? = nil

    var filtered: [TaskItem] {
        if let f = filter { return tasks.filter { $0.category == f } }
        return tasks
    }

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()
            VStack(spacing: 0) {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        FilterChip(text: "הכל", active: filter == nil) { filter = nil }
                        ForEach(LifeCategory.allCases) { c in
                            FilterChip(text: c.rawValue, active: filter == c) { filter = c }
                        }
                    }
                    .padding(.horizontal, 16).padding(.vertical, 10)
                }
                List {
                    ForEach(filtered) { task in
                        TaskRow(task: task)
                            .listRowBackground(Theme.card)
                            .listRowSeparatorTint(Color.white.opacity(0.05))
                    }
                    .onDelete { idx in
                        for i in idx { ctx.delete(filtered[i]) }
                    }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .background(Theme.bg)
            }
        }
        .navigationTitle("משימות")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showAdd = true } label: { Image(systemName: "plus") }
                    .tint(Theme.accent)
            }
        }
        .sheet(isPresented: $showAdd) {
            AddTaskView()
                .environment(\.layoutDirection, .rightToLeft)
        }
    }
}

struct TaskRow: View {
    @Bindable var task: TaskItem
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Button { task.isDone.toggle() } label: {
                Image(systemName: task.isDone ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 22))
                    .foregroundStyle(task.isDone ? Theme.success : Theme.mutedText)
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 4) {
                Text(task.title)
                    .font(.subheadline.bold())
                    .foregroundStyle(task.isDone ? Theme.mutedText : .white)
                    .strikethrough(task.isDone)
                if !task.details.isEmpty {
                    Text(task.details).font(.caption).foregroundStyle(Theme.mutedText)
                }
                HStack(spacing: 6) {
                    Pill(text: task.category.rawValue, color: .white.opacity(0.7))
                    Pill(text: task.priority.rawValue, color: priorityColor(task.priority))
                    if let d = task.dueDate {
                        Pill(text: d.hebrewRelative(), color: d < Date() && !task.isDone ? Theme.danger : Theme.accent2)
                    }
                }
            }
            Spacer()
        }
        .padding(.vertical, 4)
    }

    func priorityColor(_ p: Priority) -> Color {
        switch p {
        case .low: return .gray
        case .medium: return Theme.accent2
        case .high: return .orange
        case .urgent: return Theme.danger
        }
    }
}

struct AddTaskView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var ctx

    @State private var title = ""
    @State private var details = ""
    @State private var hasDue = false
    @State private var due = Date()
    @State private var priority: Priority = .medium
    @State private var category: LifeCategory = .personal

    var body: some View {
        NavigationStack {
            Form {
                Section("כותרת") {
                    TextField("מה צריך לעשות?", text: $title)
                    TextField("פרטים (לא חובה)", text: $details, axis: .vertical)
                }
                Section("פרטים") {
                    Toggle("יש תאריך יעד", isOn: $hasDue)
                    if hasDue {
                        DatePicker("יעד", selection: $due)
                            .environment(\.locale, Locale(identifier: "he_IL"))
                    }
                    Picker("עדיפות", selection: $priority) {
                        ForEach(Priority.allCases) { Text($0.rawValue).tag($0) }
                    }
                    Picker("קטגוריה", selection: $category) {
                        ForEach(LifeCategory.allCases) { Text($0.rawValue).tag($0) }
                    }
                }
            }
            .navigationTitle("משימה חדשה")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("ביטול") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("שמירה") {
                        let t = TaskItem(title: title, details: details, dueDate: hasDue ? due : nil, priority: priority, category: category)
                        ctx.insert(t)
                        dismiss()
                    }.disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }
}

struct FilterChip: View {
    let text: String
    let active: Bool
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(text)
                .font(.caption.bold())
                .padding(.horizontal, 12).padding(.vertical, 6)
                .background(RoundedRectangle(cornerRadius: 10).fill(active ? Theme.accent : Theme.card))
                .foregroundStyle(active ? Theme.beitarBlack : .white)
        }
        .buttonStyle(.plain)
    }
}
