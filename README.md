# דניאל - אפליקציית ניהול אישית

אפליקציית iOS אישית מותאמת לדניאל ישראלי. רצה לוקאלית על האייפון עם SwiftData (זיכרון מכשיר בלבד, ללא ענן).

## פיצ'רים

- **דשבורד חכם** - תצוגה מודרנית עם בינה ב-AI שמראה לך בכל רגע מה הכי חשוב
- **משימות** - עם עדיפויות וקטגוריות (אישי / משפחה / עסק / ילדים / בריאות / כספים)
- **סידורים** - רשימת מטלות עם מיקום ודדליין
- **תשלומים** - מעקב חשבונות, תשלומים חוזרים, סטטיסטיקות חודשיות
- **ילדים** - פרופיל לכל ילד עם תרופות, הערות ואלרגיות
- **תרופות** - מינונים, שעות לקיחה, יומן מינונים מלא
- **עסקים** - עסקאות, לידים, פגישות, הכנסות/הוצאות
- **ניהול אישי** - פתקים, רעיונות, הערות
- **ביתר ירושלים** - מסך ייעודי עם המשחק הבא, תוצאה אחרונה, מיקום בליגה וחדשות 💛🖤

## איך פותחים את הפרויקט

הפרויקט נכתב ב-SwiftUI + SwiftData ודורש Xcode 15+ ו-iOS 17+.

### אופציה 1 - XcodeGen (מומלץ)

```bash
brew install xcodegen
cd ~/path/to/this/repo
xcodegen generate
open DanielApp.xcodeproj
```

### אופציה 2 - יצירת פרויקט ידנית

1. ב-Xcode: `File → New → Project → App`
2. Product Name: `DanielApp`, Language: Swift, Interface: SwiftUI, Storage: SwiftData
3. גרור את התיקייה `DanielApp/` מהריפו לתוך נוויגטור הפרויקט
4. ודא ש-`Info.plist` מסומן כ-Custom Info.plist בהגדרות הטרגט
5. Deployment Target: iOS 17.0

## הרצה על האייפון שלך

1. חבר את האייפון למק עם כבל
2. בחר את המכשיר ב-Xcode מהתפריט העליון
3. ב-`Signing & Capabilities` בחר את ה-Apple ID שלך
4. שנה את ה-Bundle Identifier למשהו ייחודי (לדוגמה `il.daniel.app.daniel`)
5. לחץ Cmd+R להרצה
6. באייפון: `Settings → General → VPN & Device Management` ואשר את ה-Developer Profile

## מבנה הפרויקט

```
DanielApp/
├── DanielAppApp.swift          # נקודת כניסה + ModelContainer
├── Info.plist
├── Models/
│   └── Models.swift            # כל ה-SwiftData @Model
├── Services/
│   ├── AIAssistant.swift       # ה-AI שמייצר תובנות והמלצות
│   └── BeitarService.swift     # מידע על ביתר ירושלים
├── Views/
│   ├── Theme.swift             # סגנון, צבעים, פורמטרים בעברית
│   ├── DashboardView.swift     # המסך הראשי
│   ├── TasksView.swift
│   ├── ErrandsView.swift
│   ├── PaymentsView.swift
│   ├── KidsView.swift
│   ├── MedicationsView.swift
│   ├── BusinessView.swift
│   ├── PersonalView.swift
│   ├── BeitarView.swift
│   └── QuickAddView.swift
└── Assets.xcassets/
```

## בעתיד אפשר להוסיף

- חיבור חי ל-API של ליגת העל לעדכוני ביתר בזמן אמת
- התראות Push מקומיות לתרופות ותשלומים
- ווידג'טים למסך הבית של האייפון
- iCloud sync (אם תרצה גיבוי)
- אינטגרציית Siri Shortcuts לפקודות קוליות
