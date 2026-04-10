# CLAUDE.md — Lucy02 Agent Control Room

## מי אנחנו

Lucy02 היא חברה שבונה מוצרי AI מותאמים אישית לעסקים. כל לקוח מקבל מערכת סוכנים שעובדים יחד לאוטומציה של תהליכים. הכלי הפנימי שלנו — AI Factory — מייצר את המוצרים האלה. המסמך הזה מגדיר את Agent Control Room (ACR) — מערכת ניהול ומוניטורינג לכל מה שאנחנו בונים.

---

## חלק א׳ — מתודולוגיית עבודה: 6 שלבים לבניית סוכנים

### פרומפט 1: תכנן את הסוכן לפני שאתה בונה

```
<role>אתה אדריכל סוכני AI שתכנן, בנה ופרס מאות סוכנים.</role>
<task>בנה תוכנית סוכן מלאה לפני שאני כותב prompt אחד.</task>
<steps>
1. שאל מהי הבעיה, מי הלקוח, מה התוצאה הרצויה
2. תקף את הבעיה — האם סוכן יכול לפתור אותה אוטומטית
3. מפה את תהליך העבודה המלא — כל שלב מהטריגר ועד הפלט
4. בחר סטאק מינימלי — הכלים, APIs ומודלים הנדרשים בלבד
5. הגדר קריטריוני הצלחה מדידים
</steps>
<output>תיקוף בעיה → מפת תהליך → סטאק מינימלי → קריטריוני הצלחה</output>
```

### פרומפט 2: בנה את הסוכן בלי לשבור אותו

```
<role>אתה מהנדס סוכני AI בכיר שבונה סוכנים מוכנים לפרודקשן.</role>
<task>בנה את הסוכן נכון מהפעם הראשונה — טיפול שגיאות, fallback, בדיקות.</task>
<steps>
1. זהה כל נקודת כשל בבנייה הנוכחית
2. תכנן טיפול שגיאות לכל נקודת כשל
3. בנה לוגיקת fallback — העברה לאדם לכל מקרה קצה
4. ספק פרוטוקול בדיקות טרום-פריסה
</steps>
<output>מפת נקודות כשל → טיפול שגיאות → Fallback → פרוטוקול בדיקות</output>
```

### פרומפט 3: פרוס את הסוכן בלי כאוס

```
<role>אתה מומחה פריסת סוכני AI.</role>
<task>פרוס בסביבת לקוח אמיתית בלי כאוס, אסונות credentials, או כשלי הרגע האחרון.</task>
<steps>
1. בנה רשימת תיוג טרום-פריסה — כל credential והרשאה מאומתים
2. תכנן רצף פריסה — הסדר המדויק שמונע קונפליקטים
3. צור מסמך מסירה ללקוח (לא-טכני)
4. בנה תוכנית מוניטורינג אוטומטית אחרי פריסה
</steps>
<output>Checklist → רצף פריסה → מסמך מסירה → מוניטורינג</output>
```

### פרומפט 4: תמחר את הסוכן כדי לנצח

```
<role>אתה אסטרטג תמחור סוכני AI.</role>
<task>בנה אסטרטגיית תמחור מבוססת-תוצאות שמנצחת לקוחות בלי הנחות.</task>
<steps>
1. חשב ROI מדויק — זמן שנחסך, שגיאות שבוטלו, הכנסות שנוצרו
2. תכנן תמחור מבוסס-תוצאות (לא שעות)
3. בנה 3 רמות — טוב / טוב יותר / הכי טוב
4. ספק מסגרת שיחת תמחור שמוביל עם ROI
</steps>
<output>חישוב ROI → תמחור מבוסס-תוצאות → 3 רמות → מסגרת שיחה</output>
```

### פרומפט 5: מכור את הסוכן בלי למכור

```
<role>אתה אסטרטג מכירות סוכני AI.</role>
<task>בנה מערכת מכירות שסוגרת לקוחות בלי cold pitching או שטף פיצ'רים.</task>
<steps>
1. מפה את הכאב הנוכחי של הלקוח — שעות, שגיאות, עיכובים, עלויות
2. בנה שיחת כימות כאב — שאלות שגורמות ללקוח לחשב בעצמו
3. תכנן רצף הדגמה עם הנתונים האמיתיים שלהם
4. ספק מסגרת סגירה — שאלה שהופכת prospect ללקוח
</steps>
<output>מפת כאב → שיחת כימות → הדגמה → סגירה</output>
```

### פרומפט 6: הגדל את עסק הסוכנים שלך

```
<role>אתה אדריכל עסקי סוכני AI.</role>
<task>בנה מערכת שלוקחת את העסק מבניות חד-פעמיות לפעולה סקיילבילית.</task>
<steps>
1. זהה כל חלק שמתחיל מאפס עם כל לקוח חדש
2. בנה ספריית תבניות סוכנים לשימוש חוזר (חיסכון 70% זמן)
3. תכנן מערכת מכירות inbound חוזרת
4. בנה חבילות ממוצרות + מפת דרכים ל-90 יום
</steps>
<output>ביקורת תהליכים → ספריית תבניות → מכירות inbound → חבילות + מפת דרכים</output>
```

---

## חלק ב׳ — מפרט מוצר: Agent Control Room (ACR)

### סקירה

מערכת ניהול ומוניטורינג רב-לקוחית (multi-tenant) לסוכני AI. חדר בקרה מרכזי שדרכו צוות Lucy02 רואה את כל הלקוחות, כל הסוכנים, כל ה-workflows — בזמן אמת. כל לקוח גם מקבל פורטל ממותג readonly.

**פער שוק:** אין מוצר קיים שמשלב מוניטורינג רב-לקוחי עם ויזואליזציית workflows חיה, פורטלי לקוח, וניהול ברמת סוכנות.

---

## חלק ג׳ — PRD מפורט

### 1. Executive Summary

Lucy02 manages multiple client projects, each with its own agent swarm. No single pane of glass exists to see all clients, all agents, all workflows. The ACR solves this.

### 2. Target Users

| User | Role | Access |
|------|------|--------|
| Lucy02 Team | Internal operators | Full admin: all clients, config, alerts |
| Client Admin | Client tech lead | Read-only: their agents, workflows, costs |
| Client Viewer | Client stakeholders | Dashboard: high-level metrics only |

### 3. Tech Stack

| Component | Technology | Reason |
|-----------|-----------|--------|
| Frontend | React + TypeScript + Tailwind + Zustand | Fast iteration, real-time friendly |
| Flow Viz | React Flow (@xyflow/react) | Purpose-built for node graphs |
| Charts | Recharts | React-native, real-time support |
| Real-time | WebSocket (Socket.io) | Bi-directional, low latency |
| Backend | FastAPI (Python 3.11+) | Async, fast, auto-docs |
| Auth | JWT + RBAC | Multi-tenant with role-based access |
| Primary DB | PostgreSQL + RLS | Row-Level Security for tenant isolation |
| Time-series | TimescaleDB (PG extension) | Fast metric aggregation |
| Cache | Redis | Agent status, pub/sub, session |
| Queue | BullMQ (Redis) | Event ingestion, background jobs |
| Storage | S3 / MinIO | Trace archives, reports, log exports |
| Deploy | Docker Compose → Kubernetes | Mac Mini cluster or cloud |

### 4. Database Schema

See `db/migrations/001_initial.sql`

### 5. API Endpoints

See `api/routes/`

### 6. Development Phases

| Phase | Weeks | Goal |
|-------|-------|------|
| 1 — Foundation | 1-4 | DB + API + SDK + basic dashboard + WebSocket |
| 2 — Workflows | 5-8 | React Flow + live execution + replay + versions |
| 3 — Operations | 9-12 | Alerts + costs + activity feed + audit log |
| 4 — Portal | 13-16 | Branded client login + readonly + PDF reports |
| 5 — Scale | 17+ | Anomaly detection + remote control + SaaS |

### 7. Success Metrics

| Metric | Target |
|--------|--------|
| Agent failure detection | < 60 seconds |
| Client onboarding | < 30 minutes |
| Dashboard load | < 2 seconds |
| Data freshness | < 5 seconds |
| Cost tracking accuracy | > 99% |
| System uptime | > 99.9% |

### 8. Design Requirements

- Background: `#08080F`, cards: `rgba(255,255,255,0.02)`
- Accent: per-client `tenant.brand_color`, default `#00D4AA`
- Fonts: `JetBrains Mono` for data, `Inter` for UI
- All real-time via WebSocket — no polling
- Animations: pulse on running agents, flow particles on active edges

### 9. Project Structure

```
lucy02-acr/
├── CLAUDE.md
├── docker-compose.yml
├── api/
│   ├── main.py
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   └── websocket/
├── web/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── stores/
│   │   └── lib/
│   └── package.json
├── sdk/
│   ├── lucy02/
│   └── setup.py
├── db/
│   ├── migrations/
│   └── seed.sql
└── docs/
```

**התחל מ-Phase 1. אל תנסה לבנות הכל בבת אחת. השתמש ב-seed data.**
