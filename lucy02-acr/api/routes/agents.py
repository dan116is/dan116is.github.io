from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, text

from api.models.agent import Agent
from api.models.trace import Trace
from api.services.deps import DB, CurrentUser, OperatorUser

router = APIRouter()


class AgentCreate(BaseModel):
    name: str
    role: str
    model_name: str | None = None
    model_provider: str | None = None
    config: dict = {}
    version: str | None = None


class HeartbeatRequest(BaseModel):
    status: str = "running"
    metadata: dict = {}


@router.get("/tenants/{tenant_id}/agents")
async def list_agents(tenant_id: UUID, db: DB, user: CurrentUser):
    _check_access(user, tenant_id)
    result = await db.execute(
        select(Agent).where(Agent.tenant_id == tenant_id).order_by(Agent.name)
    )
    return [_agent_out(a) for a in result.scalars().all()]


@router.post("/tenants/{tenant_id}/agents", status_code=201)
async def create_agent(tenant_id: UUID, body: AgentCreate, db: DB, user: OperatorUser):
    agent = Agent(tenant_id=tenant_id, **body.model_dump())
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return _agent_out(agent)


@router.get("/agents/{agent_id}")
async def get_agent(agent_id: UUID, db: DB, user: CurrentUser):
    agent = await _get_agent_or_404(agent_id, db)
    _check_access(user, agent.tenant_id)

    traces_result = await db.execute(
        select(Trace)
        .where(Trace.agent_id == agent_id)
        .order_by(Trace.started_at.desc())
        .limit(50)
    )
    traces = traces_result.scalars().all()

    return {
        **_agent_out(agent),
        "recent_traces": [_trace_out(t) for t in traces],
    }


@router.get("/agents/{agent_id}/metrics")
async def get_agent_metrics(
    agent_id: UUID,
    db: DB,
    user: CurrentUser,
    range: str = Query(default="24h", regex="^(1h|24h|7d)$"),
):
    agent = await _get_agent_or_404(agent_id, db)
    _check_access(user, agent.tenant_id)

    interval_map = {"1h": "1 hour", "24h": "24 hours", "7d": "7 days"}
    bucket_map = {"1h": "5 minutes", "24h": "1 hour", "7d": "6 hours"}

    result = await db.execute(text("""
        SELECT
            time_bucket(:bucket, time) AS bucket,
            metric_name,
            AVG(value) AS avg_value,
            MAX(value) AS max_value
        FROM metrics
        WHERE agent_id = :agent_id
          AND time >= NOW() - INTERVAL :interval
        GROUP BY bucket, metric_name
        ORDER BY bucket DESC
    """), {"bucket": bucket_map[range], "interval": interval_map[range], "agent_id": str(agent_id)})

    rows = result.fetchall()
    metrics: dict[str, list] = {}
    for row in rows:
        name = row.metric_name
        if name not in metrics:
            metrics[name] = []
        metrics[name].append({"time": row.bucket.isoformat(), "avg": row.avg_value, "max": row.max_value})

    return {"agent_id": str(agent_id), "range": range, "metrics": metrics}


@router.post("/agents/{agent_id}/heartbeat")
async def heartbeat(agent_id: UUID, body: HeartbeatRequest, db: DB):
    """SDK endpoint — no auth required (uses API key header in production)."""
    agent = await _get_agent_or_404(agent_id, db)
    agent.status = body.status
    agent.last_heartbeat = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True}


async def _get_agent_or_404(agent_id: UUID, db):
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


def _check_access(user, tenant_id: UUID):
    if user.is_operator:
        return
    if user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")


def _agent_out(a: Agent) -> dict:
    return {
        "id": str(a.id),
        "tenant_id": str(a.tenant_id),
        "name": a.name,
        "role": a.role,
        "model_name": a.model_name,
        "model_provider": a.model_provider,
        "status": a.status,
        "last_heartbeat": a.last_heartbeat.isoformat() if a.last_heartbeat else None,
        "config": a.config,
        "version": a.version,
        "created_at": a.created_at.isoformat(),
    }


def _trace_out(t: Trace) -> dict:
    return {
        "id": str(t.id),
        "name": t.name,
        "status": t.status,
        "started_at": t.started_at.isoformat(),
        "duration_ms": t.duration_ms,
        "model": t.model,
        "tokens_in": t.tokens_in,
        "tokens_out": t.tokens_out,
        "cost": float(t.cost),
    }
