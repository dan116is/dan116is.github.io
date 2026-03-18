# 🏭 AI Factory — מפעל AI אוטונומי

מערכת שמקבלת בריף עסקי ובונה מוצר AI שלם מקצה לקצה — אוטומטית.

---

## מה זה AI Factory?

AI Factory היא מערכת אוטונומית שמקבלת בריף עסקי ומייצרת מוצר תוכנה מלא באמצעות נחיל סוכני AI. במקום צוות מפתחים אנושי, המפעל מריץ סוכנים מתמחים שעובדים במקביל — PM, Architect, Dev Swarm, QA, DevOps — ומוציאים מוצר מוכן לייצור.

---

## איך זה עובד

```
בריף עסקי
    ↓
PM Agent        → ניתוח requirements, user stories, המלצת טכנולוגיה
    ↓
Architect Agent → DB schema, API endpoints, component tree, file structure
    ↓
Dev Swarm       → כתיבת קוד במקביל (סוכן לכל מודול)
    ↓
QA Agent        → בדיקות security, logic, performance, completeness
    ↓
DevOps Agent    → Docker, CI/CD, deployment
    ↓
מוצר מוכן
```

---

## מבנה הפרויקט

```
ai-factory/
├── run.py                  # Entry point (server / demo / build-from-file)
├── src/
│   ├── __init__.py
│   ├── brief_schema.py     # Pydantic Brief model + validation + example
│   ├── orchestrator.py     # Pipeline brain — manages agent chain
│   └── server.py           # FastAPI API server
├── templates/              # Project boilerplates
└── agents/                 # Agent configurations
```

---

## Tech Stack

| שכבה | טכנולוגיה |
|------|-----------|
| Backend | Python + FastAPI |
| Queue/Messaging | Redis Streams |
| Workers | Celery + Docker containers |
| LLM | Claude API (Anthropic) — `claude-sonnet-4-20250514` |
| Frontend Dashboard | React + Next.js + WebSocket (streaming) |
| Storage | PostgreSQL |
| Billing | Stripe |
| Hosting | Vercel / AWS / Railway |

---

## API Endpoints

| Method | Endpoint | תיאור |
|--------|----------|-------|
| `POST` | `/build/start` | הגשת בריף + התחלת Build |
| `GET` | `/build/{id}/status` | סטטוס Build + לוגים |
| `GET` | `/build/{id}/artifacts` | artifacts שנוצרו |
| `WS` | `/build/{id}/stream` | שידור לוגים בזמן אמת |
| `GET` | `/builds` | רשימת כל ה-Builds |
| `GET` | `/agents` | רשימת סוכנים זמינים |
| `GET` | `/brief/example` | דוגמת בריף |
| `GET` | `/brief/schema` | JSON Schema של הבריף |

---

## סוכני AI במפעל

| סוכן | תפקיד |
|------|--------|
| **PM Agent** | מתרגם בריף ל-specs, requirements, user stories |
| **Architect Agent** | מתכנן DB schema, API endpoints, file structure |
| **Dev Swarm** | נחיל מפתחים — סוכן לכל מודול (backend, frontend, auth, payments, AI, integrations) |
| **Design Agent** | UI/UX |
| **QA Swarm** | בדיקות — unit, integration, e2e, security |
| **DevOps Agent** | Docker, CI/CD, monitoring |
| **Docs Agent** | תיעוד אוטומטי |
| **Iteration Agent** | שיפור מתמשך לאחר deployment |

---

## התקנה והרצה

### דרישות מקדימות

```bash
Python 3.11+
Redis
PostgreSQL
Docker (אופציונלי)
```

### התקנה

```bash
git clone <repo-url>
cd ai-factory
pip install -r requirements.txt

# הגדרת משתני סביבה
cp .env.example .env
# ערוך את .env עם:
# ANTHROPIC_API_KEY=your_key
# DATABASE_URL=postgresql://...
# REDIS_URL=redis://localhost:6379
```

### הרצת השרת

```bash
python run.py server
```

### הרצת Demo

```bash
python run.py demo
```

### Build מקובץ

```bash
python run.py build-from-file brief.json
```

---

## דוגמת בריף

```json
{
  "name": "TaskMaster Pro",
  "description": "אפליקציית ניהול משימות לצוותים עם AI",
  "features": [
    "ניהול משימות ופרויקטים",
    "AI שמציע תעדופים",
    "אינטגרציה עם Slack",
    "דשבורד analytics"
  ],
  "target_audience": "צוותי פיתוח בסטארטאפים",
  "product_type": "SaaS Web App",
  "budget": "medium",
  "timeline_weeks": 4
}
```

---

## מודל הכנסות

| מסלול | מחיר |
|-------|------|
| Build חד-פעמי | $5K–$50K (לפי מורכבות) |
| Maintenance | $999/חודש (AI ממשיך לתחזק) |
| Revenue Share | 15% (במקום תשלום מראש) |
| Enterprise License | $250K+ (מפעל פנימי) |

---

## עקרונות פיתוח

- **AI-first** — 80%+ מהקוד נכתב על ידי AI agents
- **Ship fast** — MVP תוך שבועות, לא חודשים
- **Template-based** — boilerplates לכל סוג מוצר
- **Swarm architecture** — סוכנים עובדים במקביל לביצועים מקסימליים

---

## קישורים

- [Anthropic Claude API](https://docs.anthropic.com)
- [FastAPI Docs](https://fastapi.tiangolo.com)
- [Redis Streams](https://redis.io/docs/manual/data-types/streams/)
