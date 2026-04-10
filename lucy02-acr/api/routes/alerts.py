from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from api.models.alert import Alert, AlertRule
from api.services.deps import DB, CurrentUser, OperatorUser

router = APIRouter()


class AlertRuleCreate(BaseModel):
    name: str
    metric: str
    operator: str
    threshold: float
    notification_channels: list = []
    cooldown_minutes: int = 15


@router.get("/tenants/{tenant_id}/alerts")
async def list_alerts(tenant_id: UUID, db: DB, user: CurrentUser, status: str | None = None):
    _check_access(user, tenant_id)
    q = select(Alert).where(Alert.tenant_id == tenant_id)
    if status:
        q = q.where(Alert.status == status)
    q = q.order_by(Alert.created_at.desc()).limit(100)
    result = await db.execute(q)
    return [_alert_out(a) for a in result.scalars().all()]


@router.post("/tenants/{tenant_id}/alert-rules", status_code=201)
async def create_alert_rule(tenant_id: UUID, body: AlertRuleCreate, db: DB, user: OperatorUser):
    rule = AlertRule(tenant_id=tenant_id, **body.model_dump())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return {"id": str(rule.id), "name": rule.name, "metric": rule.metric}


@router.patch("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: UUID, db: DB, user: CurrentUser):
    alert = await _get_alert_or_404(alert_id, db)
    _check_access(user, alert.tenant_id)
    alert.status = "acknowledged"
    alert.acknowledged_at = datetime.now(timezone.utc)
    alert.acknowledged_by = user.id
    await db.commit()
    return _alert_out(alert)


@router.patch("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: UUID, db: DB, user: CurrentUser):
    alert = await _get_alert_or_404(alert_id, db)
    _check_access(user, alert.tenant_id)
    alert.status = "resolved"
    alert.resolved_at = datetime.now(timezone.utc)
    await db.commit()
    return _alert_out(alert)


async def _get_alert_or_404(alert_id: UUID, db):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


def _check_access(user, tenant_id: UUID):
    if user.is_operator:
        return
    if user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")


def _alert_out(a: Alert) -> dict:
    return {
        "id": str(a.id),
        "tenant_id": str(a.tenant_id),
        "severity": a.severity,
        "message": a.message,
        "status": a.status,
        "affected_agent_id": str(a.affected_agent_id) if a.affected_agent_id else None,
        "created_at": a.created_at.isoformat(),
        "acknowledged_at": a.acknowledged_at.isoformat() if a.acknowledged_at else None,
        "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None,
    }
