import SwiftUI
import SwiftData

@main
struct DanielAppApp: App {
    let container: ModelContainer = {
        let schema = Schema([
            TaskItem.self,
            Errand.self,
            Payment.self,
            Child.self,
            Medication.self,
            MedicationDose.self,
            BusinessItem.self,
            PersonalNote.self
        ])
        let config = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
        do {
            return try ModelContainer(for: schema, configurations: [config])
        } catch {
            fatalError("שגיאה ביצירת ModelContainer: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            DashboardView()
                .environment(\.layoutDirection, .rightToLeft)
                .preferredColorScheme(.dark)
        }
        .modelContainer(container)
    }
}
