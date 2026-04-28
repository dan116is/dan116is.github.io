# Lucy02 Agent Control Room — Setup

## Quick Start

```bash
# Clone and start
git clone <repo>
cd lucy02-acr
docker-compose up -d

# Access
# Dashboard:  http://localhost:3000
# API docs:   http://localhost:8000/api/docs
```

Default credentials (seed data):
- `admin@lucy02.ai` / `admin123`
- `ops@lucy02.ai` / `admin123`

## SDK Usage

```bash
pip install ./sdk
```

```python
from lucy02 import AgentSDK

sdk = AgentSDK(
    api_key="lcy_your_key",
    client_id="tenant-uuid",
    agent_id="agent-uuid",
    base_url="http://localhost:8000",
)

with sdk.trace("my-workflow") as workflow:
    with workflow.span("step-1") as step:
        result = do_work()
        step.set_output(result)
        step.set_tokens(tokens_in=500, tokens_out=200, model="claude-sonnet-4-6")

sdk.metric("queue_depth", 42)
sdk.log("info", "Processing complete")
```

## Project Structure

```
lucy02-acr/
├── api/          FastAPI backend
├── web/          React frontend
├── sdk/          Python agent SDK
├── db/           Migrations + seed data
└── docs/         Documentation
```

## Development

```bash
# API only
cd api && pip install -r requirements.txt
uvicorn api.main:app --reload

# Web only
cd web && npm install && npm run dev
```

## Phase Roadmap

| Phase | Focus | Status |
|-------|-------|--------|
| 1 — Foundation | DB, API, SDK, basic dashboard | ✅ Done |
| 2 — Workflows | React Flow viz, live execution | 🔄 Next |
| 3 — Operations | Alerts, costs, audit | ⏳ Planned |
| 4 — Portal | Client branded portal | ⏳ Planned |
| 5 — Scale | Anomaly detection, remote control | ⏳ Planned |
