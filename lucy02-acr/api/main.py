import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.middleware.tenant import TenantMiddleware
from api.routes import auth, tenants, agents, workflows, alerts, costs, ingest, users, audit
from api.websocket.manager import ws_router
from api.db import engine, Base
from api.services.alert_evaluator import AlertEvaluator
from api.services.heartbeat_monitor import HeartbeatMonitor


@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Start background services
    loop = asyncio.get_event_loop()
    loop.create_task(AlertEvaluator().run())
    loop.create_task(HeartbeatMonitor().run())

    yield
    # shutdown
    await engine.dispose()


app = FastAPI(
    title="Lucy02 Agent Control Room",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TenantMiddleware)

# REST routes
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(tenants.router, prefix="/api/tenants", tags=["tenants"])
app.include_router(agents.router, prefix="/api", tags=["agents"])
app.include_router(workflows.router, prefix="/api", tags=["workflows"])
app.include_router(alerts.router, prefix="/api", tags=["alerts"])
app.include_router(costs.router, prefix="/api", tags=["costs"])
app.include_router(ingest.router, prefix="/api/ingest", tags=["ingest"])
app.include_router(audit.router, prefix="/api", tags=["audit"])

# WebSocket routes
app.include_router(ws_router, prefix="/api/ws", tags=["websocket"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "lucy02-acr-api"}
