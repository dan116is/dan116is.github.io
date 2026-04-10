"""SDK ingestion endpoints — authenticated via API key header."""
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from api.db import AsyncSessionLocal
from api.models.trace import Trace
from api.models.agent import Agent
from sqlalchemy import select, text

router = APIRouter()

# In production this should validate against api_keys table
VALID_PREFIXES = ("lcy_",)


async def _validate_api_key(x_api_key: str | None) -> str:
    if not x_api_key or not any(x_api_key.startswith(p) for p in VALID_PREFIXES):
        raise HTTPException(status_code=401, detail="Invalid API key")
    return x_api_key


class TraceEvent(BaseModel):
    tenant_id: UUID
    agent_id: UUID
    workflow_execution_id: UUID | None = None
    parent_trace_id: UUID | None = None
    name: str
    status: str = "ok"
    input: dict | None = None
    output: dict | None = None
    started_at: datetime
    duration_ms: int | None = None
    model: str | None = None
    tokens_in: int = 0
    tokens_out: int = 0
    cached_tokens: int = 0
    cost: float = 0.0
    metadata: dict = {}


class MetricEvent(BaseModel):
    tenant_id: UUID
    agent_id: UUID
    metric_name: str
    value: float
    time: datetime
    tags: dict = {}


class IngestTracesRequest(BaseModel):
    traces: list[TraceEvent]


class IngestMetricsRequest(BaseModel):
    metrics: list[MetricEvent]


@router.post("/traces")
async def ingest_traces(body: IngestTracesRequest, x_api_key: str | None = Header(default=None)):
    await _validate_api_key(x_api_key)
    async with AsyncSessionLocal() as db:
        for t in body.traces:
            trace = Trace(**t.model_dump())
            db.add(trace)
        await db.commit()
    return {"ingested": len(body.traces)}


@router.post("/metrics")
async def ingest_metrics(body: IngestMetricsRequest, x_api_key: str | None = Header(default=None)):
    await _validate_api_key(x_api_key)
    async with AsyncSessionLocal() as db:
        for m in body.metrics:
            await db.execute(text("""
                INSERT INTO metrics (time, tenant_id, agent_id, metric_name, value, tags)
                VALUES (:time, :tenant_id, :agent_id, :metric_name, :value, :tags::jsonb)
            """), {
                "time": m.time,
                "tenant_id": str(m.tenant_id),
                "agent_id": str(m.agent_id),
                "metric_name": m.metric_name,
                "value": m.value,
                "tags": str(m.tags).replace("'", '"'),
            })
        await db.commit()
    return {"ingested": len(body.metrics)}


class EventRequest(BaseModel):
    tenant_id: UUID
    agent_id: UUID
    event_type: str
    payload: dict = {}
    timestamp: datetime


@router.post("/events")
async def ingest_events(body: EventRequest, x_api_key: str | None = Header(default=None)):
    await _validate_api_key(x_api_key)
    # Publish to WebSocket subscribers
    from api.websocket.manager import ws_manager
    await ws_manager.broadcast_to_tenant(
        str(body.tenant_id),
        {"event": body.event_type, "agent_id": str(body.agent_id), "payload": body.payload},
    )
    return {"ok": True}
