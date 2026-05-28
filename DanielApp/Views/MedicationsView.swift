import SwiftUI
import SwiftData

struct MedicationsView: View {
    @Environment(\.modelContext) private var ctx
    @Query(sort: \Medication.startDate) private var meds: [Medication]
    @Query private var kids: [Child]
    @State private var showAdd = false

    var active: [Medication] {
        meds.filter { ($0.endDate ?? Date.distantFuture) >= Date() }
    }
    var past: [Medication] {
        meds.filter { ($0.endDate ?? Date.distantFuture) < Date() }
    }

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    if !active.isEmpty {
                        Text("פעילות").font(.headline).foregroundStyle(.white).padding(.horizontal, 4)
                        ForEach(active) { med in
                            NavigationLink(destination: MedicationDetailView(med: med)) {
                                MedCard(med: med)
                            }.buttonStyle(.plain)
                        }
                    }
                    if !past.isEmpty {
                        Text("הסתיימו").font(.headline).foregroundStyle(.white).padding(.horizontal, 4).padding(.top, 8)
                        ForEach(past) { med in
                            NavigationLink(destination: MedicationDetailView(med: med)) {
                                MedCard(med: med).opacity(0.5)
                            }.buttonStyle(.plain)
                        }
                    }
                    if meds.isEmpty {
                        VStack(spacing: 10) {
                            Image(systemName: "pills.fill").font(.system(size: 50)).foregroundStyle(.pink)
                            Text("אין תרופות במעקב").foregroundStyle(.white)
                            Text("הוסף תרופה כדי לקבל תזכורות וניהול מינונים")
                                .font(.caption).foregroundStyle(Theme.mutedText).multilineTextAlignment(.center)
                        }.padding(40)
                    }
                }.padding(16)
            }
        }
        .navigationTitle("תרופות")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { showAdd = true } label: { Image(systemName: "plus") }
                    .tint(Theme.accent)
            }
        }
        .sheet(isPresented: $showAdd) {
            AddMedicationView(child: nil).environment(\.layoutDirection, .rightToLeft)
        }
    }
}

struct MedCard: View {
    let med: Medication
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "pills.fill")
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(.pink)
                .frame(width: 44, height: 44)
                .background(Circle().fill(Color.pink.opacity(0.18)))
            VStack(alignment: .leading, spacing: 4) {
                Text(med.name).font(.headline).foregroundStyle(.white)
                Text(med.dosage).font(.caption).foregroundStyle(Theme.mutedText)
                HStack(spacing: 6) {
                    if let child = med.child {
                        Pill(text: child.name, color: .pink)
                    }
                    if !med.times.isEmpty {
                        Pill(text: "\(med.times.count)/יום", color: Theme.accent2)
                    }
                }
            }
            Spacer()
            Image(systemName: "chevron.left").foregroundStyle(Theme.mutedText)
        }
        .cardStyle()
    }
}

struct MedRowSmall: View {
    let med: Medication
    var body: some View {
        HStack {
            Image(systemName: "pills").foregroundStyle(.pink)
            VStack(alignment: .leading) {
                Text(med.name).font(.subheadline.bold()).foregroundStyle(.white)
                Text(med.dosage).font(.caption).foregroundStyle(Theme.mutedText)
            }
            Spacer()
            Image(systemName: "chevron.left").foregroundStyle(Theme.mutedText).font(.caption)
        }
        .padding(.vertical, 4)
    }
}

struct AddMedicationView: View {
    let child: Child?
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var ctx
    @Query private var allKids: [Child]

    @State private var name = ""
    @State private var dosage = ""
    @State private var instructions = ""
    @State private var start = Date()
    @State private var hasEnd = false
    @State private var end = Calendar.current.date(byAdding: .day, value: 7, to: Date()) ?? Date()
    @State private var times: [Date] = []
    @State private var selectedChild: Child?

    var body: some View {
        NavigationStack {
            Form {
                Section("פרטי תרופה") {
                    TextField("שם התרופה", text: $name)
                    TextField("מינון (לדוגמה: 5 מ\"ל / חצי כדור)", text: $dosage)
                    TextField("הוראות (לדוגמה: אחרי אוכל)", text: $instructions, axis: .vertical)
                }
                if child == nil {
                    Section("עבור מי") {
                        Picker("ילד", selection: $selectedChild) {
                            Text("אישית").tag(Child?.none)
                            ForEach(allKids) { k in Text(k.name).tag(Child?.some(k)) }
                        }
                    }
                }
                Section("תקופה") {
                    DatePicker("התחלה", selection: $start, displayedComponents: [.date])
                        .environment(\.locale, Locale(identifier: "he_IL"))
                    Toggle("יש תאריך סיום", isOn: $hasEnd)
                    if hasEnd {
                        DatePicker("סיום", selection: $end, displayedComponents: [.date])
                            .environment(\.locale, Locale(identifier: "he_IL"))
                    }
                }
                Section("שעות לקיחה") {
                    ForEach(times.indices, id: \.self) { i in
                        DatePicker("שעה \(i+1)", selection: $times[i], displayedComponents: [.hourAndMinute])
                    }
                    Button {
                        times.append(Date())
                    } label: {
                        Label("הוסף שעה", systemImage: "plus.circle.fill")
                    }
                }
            }
            .navigationTitle("תרופה חדשה")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("ביטול") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("שמירה") {
                        let target = child ?? selectedChild
                        let m = Medication(name: name, dosage: dosage, instructions: instructions,
                                           startDate: start, endDate: hasEnd ? end : nil, times: times, child: target)
                        ctx.insert(m)
                        dismiss()
                    }.disabled(name.isEmpty || dosage.isEmpty)
                }
            }
        }
    }
}

struct MedicationDetailView: View {
    @Bindable var med: Medication
    @Environment(\.modelContext) private var ctx
    @State private var showTaken = false

    var body: some View {
        ZStack {
            Theme.bg.ignoresSafeArea()
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(med.name).font(.title2.bold()).foregroundStyle(.white)
                        Text(med.dosage).font(.subheadline).foregroundStyle(Theme.mutedText)
                        if !med.instructions.isEmpty {
                            Text(med.instructions).font(.caption).foregroundStyle(Theme.mutedText).padding(.top, 4)
                        }
                        if let c = med.child {
                            Pill(text: "עבור: \(c.name)", color: .pink)
                        }
                    }.cardStyle()

                    if !med.times.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("שעות לקיחה").font(.headline).foregroundStyle(.white)
                            HStack(spacing: 8) {
                                ForEach(med.times.indices, id: \.self) { i in
                                    Pill(text: med.times[i].hebrewTime(), color: Theme.accent2)
                                }
                            }
                        }.cardStyle()
                    }

                    Button {
                        let d = MedicationDose(takenAt: Date(), medication: med)
                        ctx.insert(d)
                        showTaken = true
                    } label: {
                        Label("סמן נלקח עכשיו", systemImage: "checkmark.circle.fill")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(RoundedRectangle(cornerRadius: 14).fill(Theme.success))
                            .foregroundStyle(.white).font(.headline)
                    }

                    if !med.doses.isEmpty {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("יומן מינונים").font(.headline).foregroundStyle(.white)
                            ForEach(med.doses.sorted { $0.takenAt > $1.takenAt }.prefix(10)) { dose in
                                HStack {
                                    Image(systemName: "checkmark.circle.fill").foregroundStyle(Theme.success)
                                    Text(dose.takenAt.hebrewRelative() + " • " + dose.takenAt.hebrewTime())
                                        .font(.subheadline).foregroundStyle(.white)
                                    Spacer()
                                }
                            }
                        }.cardStyle()
                    }
                }.padding(16)
            }
        }
        .navigationTitle("תרופה")
        .alert("נרשם!", isPresented: $showTaken) {
            Button("אוקיי", role: .cancel) { }
        }
    }
}
