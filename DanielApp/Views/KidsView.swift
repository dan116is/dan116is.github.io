import SwiftUI
import SwiftData

struct KidsView: View {
    @Environment(\.modelContext) private var ctx
    @Query(sort: \Child.birthDate) private var kids: [Child]
    @State private var showAdd = false

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()
            if kids.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "figure.and.child.holdinghands")
                        .font(.system(size: 60)).foregroundStyle(Theme.accent)
                    Text("עוד לא הוספת ילדים").foregroundStyle(.white).font(.headline)
                    Text("הוסף את הילדים שלך כדי לנהל תרופות, אירועים והערות").font(.caption)
                        .foregroundStyle(Theme.mutedText).multilineTextAlignment(.center)
                    Button("הוסף ילד") { showAdd = true }
                        .buttonStyle(.borderedProminent).tint(Theme.accent)
                }.padding(40)
            } else {
                ScrollView {
                    VStack(spacing: 12) {
                        ForEach(kids) { child in
                            NavigationLink(destination: ChildDetailView(child: child)) {
                                ChildCard(child: child)
                            }
                            .buttonStyle(.plain)
                        }
                    }.padding(16)
                }
            }
        }
        .navigationTitle("ילדים")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showAdd = true } label: { Image(systemName: "plus") }
                    .tint(Theme.accent)
            }
        }
        .sheet(isPresented: $showAdd) { AddChildView().environment(\.layoutDirection, .rightToLeft) }
    }
}

struct ChildCard: View {
    let child: Child
    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle().fill(LinearGradient(colors: [.pink, .purple], startPoint: .topLeading, endPoint: .bottomTrailing))
                    .frame(width: 56, height: 56)
                Text(String(child.name.prefix(1)))
                    .font(.title2.bold()).foregroundStyle(.white)
            }
            VStack(alignment: .leading, spacing: 3) {
                Text(child.name).font(.headline).foregroundStyle(.white)
                Text("גיל \(child.ageYears)").font(.caption).foregroundStyle(Theme.mutedText)
                if !child.medications.isEmpty {
                    Pill(text: "\(child.medications.count) תרופות פעילות", color: .pink)
                }
            }
            Spacer()
            Image(systemName: "chevron.left").foregroundStyle(Theme.mutedText)
        }
        .cardStyle()
    }
}

struct AddChildView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var ctx
    @State private var name = ""
    @State private var birth = Calendar.current.date(byAdding: .year, value: -5, to: Date()) ?? Date()
    @State private var notes = ""

    var body: some View {
        NavigationStack {
            Form {
                TextField("שם הילד/ה", text: $name)
                DatePicker("תאריך לידה", selection: $birth, displayedComponents: [.date])
                    .environment(\.locale, Locale(identifier: "he_IL"))
                TextField("הערות (אלרגיות, רגישויות)", text: $notes, axis: .vertical)
            }
            .navigationTitle("ילד חדש")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("ביטול") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("שמירה") {
                        ctx.insert(Child(name: name, birthDate: birth, notes: notes))
                        dismiss()
                    }.disabled(name.isEmpty)
                }
            }
        }
    }
}

struct ChildDetailView: View {
    @Bindable var child: Child
    @Environment(\.modelContext) private var ctx
    @State private var showAddMed = false

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    HStack(spacing: 14) {
                        ZStack {
                            Circle().fill(LinearGradient(colors: [.pink, .purple], startPoint: .topLeading, endPoint: .bottomTrailing))
                                .frame(width: 72, height: 72)
                            Text(String(child.name.prefix(1)))
                                .font(.system(size: 32, weight: .bold)).foregroundStyle(.white)
                        }
                        VStack(alignment: .leading) {
                            Text(child.name).font(.title2.bold()).foregroundStyle(.white)
                            Text("גיל \(child.ageYears)").font(.subheadline).foregroundStyle(Theme.mutedText)
                        }
                    }
                    .cardStyle()

                    if !child.notes.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("הערות").font(.headline).foregroundStyle(.white)
                            Text(child.notes).font(.subheadline).foregroundStyle(Theme.mutedText)
                        }.cardStyle()
                    }

                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text("תרופות").font(.headline).foregroundStyle(.white)
                            Spacer()
                            Button { showAddMed = true } label: {
                                Label("הוסף", systemImage: "plus.circle.fill")
                                    .foregroundStyle(Theme.accent).font(.subheadline.bold())
                            }
                        }
                        if child.medications.isEmpty {
                            Text("אין תרופות פעילות").font(.caption).foregroundStyle(Theme.mutedText)
                        } else {
                            ForEach(child.medications) { med in
                                NavigationLink(destination: MedicationDetailView(med: med)) {
                                    MedRowSmall(med: med)
                                }.buttonStyle(.plain)
                            }
                        }
                    }.cardStyle()
                }.padding(16)
            }
        }
        .navigationTitle(child.name)
        .sheet(isPresented: $showAddMed) {
            AddMedicationView(child: child).environment(\.layoutDirection, .rightToLeft)
        }
    }
}
