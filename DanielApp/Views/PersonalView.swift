import SwiftUI
import SwiftData

struct PersonalView: View {
    @Environment(\.modelContext) private var ctx
    @Query(sort: \PersonalNote.updatedAt, order: .reverse) private var notes: [PersonalNote]
    @State private var showAdd = false

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()
            if notes.isEmpty {
                VStack(spacing: 10) {
                    Image(systemName: "note.text").font(.system(size: 50)).foregroundStyle(.mint)
                    Text("אין פתקים עדיין").foregroundStyle(.white)
                    Text("שמור מחשבות, רעיונות, סיסמאות, רשימות").font(.caption)
                        .foregroundStyle(Theme.mutedText).multilineTextAlignment(.center)
                }.padding(40)
            } else {
                List {
                    ForEach(notes) { note in
                        NavigationLink(destination: EditNoteView(note: note)) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(note.title).font(.headline).foregroundStyle(.white)
                                if !note.body.isEmpty {
                                    Text(note.body).font(.caption).foregroundStyle(Theme.mutedText).lineLimit(2)
                                }
                                Text(note.updatedAt.hebrewRelative()).font(.caption2).foregroundStyle(Theme.mutedText)
                            }.padding(.vertical, 4)
                        }
                        .listRowBackground(Theme.card)
                    }
                    .onDelete { idx in idx.forEach { ctx.delete(notes[$0]) } }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .background(Theme.bg)
            }
        }
        .navigationTitle("ניהול אישי")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showAdd = true } label: { Image(systemName: "plus") }
                    .tint(Theme.accent)
            }
        }
        .sheet(isPresented: $showAdd) { AddNoteView().environment(\.layoutDirection, .rightToLeft) }
    }
}

struct AddNoteView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var ctx
    @State private var title = ""
    @State private var body_ = ""

    var body: some View {
        NavigationStack {
            Form {
                TextField("כותרת", text: $title)
                TextField("תוכן", text: $body_, axis: .vertical).lineLimit(5...20)
            }
            .navigationTitle("פתק חדש")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("ביטול") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("שמירה") {
                        ctx.insert(PersonalNote(title: title, body: body_))
                        dismiss()
                    }.disabled(title.isEmpty)
                }
            }
        }
    }
}

struct EditNoteView: View {
    @Bindable var note: PersonalNote
    var body: some View {
        Form {
            TextField("כותרת", text: $note.title)
            TextField("תוכן", text: $note.body, axis: .vertical).lineLimit(5...30)
        }
        .navigationTitle("פתק")
        .onChange(of: note.title) { _, _ in note.updatedAt = Date() }
        .onChange(of: note.body) { _, _ in note.updatedAt = Date() }
    }
}
