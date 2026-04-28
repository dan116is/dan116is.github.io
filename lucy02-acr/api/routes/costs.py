from uuid import UUID

from fastapi import APIRouter, Query
from sqlalchemy import select, func, text

from api.models.trace import Trace
from api.models.agent import Agent
from api.services.deps import DB, CurrentUser

router = APIRouter()

# Cost per 1M tokens (approximate, update per provider pricing)
MODEL_COSTS = {
    "gpt-4o":              {"in": 2.50, "out": 10.00},
    "claude-opus-4-6":     {"in": 15.00, "out": 75.00},
    "claude-sonnet-4-6":   {"in": 3.00, "out": 15.00},
    "claude-haiku-4-5":    {"in": 0.80, "out": 4.00},
}


@router.get("/tenants/{tenant_id}/costs")
async def get_costs(
    tenant_id: UUID,
    db: DB,
    user: CurrentUser,
    period: str = Query(default="month", regex="^(day|week|month)$"),
):
    _check_access(user, tenant_id)

    interval_map = {"day": "1 day", "week": "7 days", "month": "30 days"}
    interval = interval_map[period]

    result = await db.execute(text("""
        SELECT
            DATE_TRUNC('day', started_at) AS day,
            SUM(cost) AS total_cost,
            SUM(tokens_in) AS tokens_in,
            SUM(tokens_out) AS tokens_out,
            COUNT(*) AS trace_count
        FROM traces
        WHERE tenant_id = :tenant_id
          AND started_at >= NOW() - INTERVAL :interval
        GROUP BY day
        ORDER BY day DESC
    """), {"tenant_id": str(tenant_id), "interval": interval})

    rows = result.fetchall()
    total = sum(r.total_cost or 0 for r in rows)

    return {
        "period": period,
        "total_cost": round(total, 4),
        "daily": [
            {
                "date": r.day.date().isoformat(),
                "cost": round(r.total_cost or 0, 4),
                "tokens_in": r.tokens_in or 0,
                "tokens_out": r.tokens_out or 0,
                "traces": r.trace_count,
            }
            for r in rows
        ],
    }


@router.get("/tenants/{tenant_id}/costs/agents")
async def get_costs_by_agent(tenant_id: UUID, db: DB, user: CurrentUser):
    _check_access(user, tenant_id)

    result = await db.execute(text("""
        SELECT
            t.agent_id,
            a.name AS agent_name,
            SUM(t.cost) AS total_cost,
            SUM(t.tokens_in) AS tokens_in,
            SUM(t.tokens_out) AS tokens_out,
            COUNT(*) AS trace_count
        FROM traces t
        JOIN agents a ON a.id = t.agent_id
        WHERE t.tenant_id = :tenant_id
          AND t.started_at >= NOW() - INTERVAL '30 days'
        GROUP BY t.agent_id, a.name
        ORDER BY total_cost DESC
    """), {"tenant_id": str(tenant_id)})

    rows = result.fetchall()
    return [
        {
            "agent_id": str(r.agent_id),
            "agent_name": r.agent_name,
            "cost": round(r.total_cost or 0, 4),
            "tokens_in": r.tokens_in or 0,
            "tokens_out": r.tokens_out or 0,
            "traces": r.trace_count,
        }
        for r in rows
    ]


@router.get("/tenants/{tenant_id}/costs/forecast")
async def get_cost_forecast(tenant_id: UUID, db: DB, user: CurrentUser):
    _check_access(user, tenant_id)

    result = await db.execute(text("""
        SELECT AVG(daily_cost) AS avg_daily
        FROM (
            SELECT DATE_TRUNC('day', started_at) AS day, SUM(cost) AS daily_cost
            FROM traces
            WHERE tenant_id = :tenant_id AND started_at >= NOW() - INTERVAL '7 days'
            GROUP BY day
        ) sub
    """), {"tenant_id": str(tenant_id)})

    avg_daily = result.scalar() or 0
    return {
        "avg_daily_cost": round(avg_daily, 4),
        "forecast_30d": round(avg_daily * 30, 2),
        "forecast_90d": round(avg_daily * 90, 2),
    }


def _check_access(user, tenant_id: UUID):
    if user.is_operator:
        return
    if user.tenant_id != tenant_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Access denied")
