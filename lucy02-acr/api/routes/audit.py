from uuid import UUID

from fastapi import APIRouter, Query
from sqlalchemy import select

from api.models.audit import AuditLog
from api.services.deps import DB, OperatorUser

router = APIRouter()


@router.get("/tenants/{tenant_id}/audit-log")
async def get_audit_log(
    tenant_id: UUID,
    db: DB,
    user: OperatorUser,
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
):
    result = await db.execute(
        select(AuditLog)
        .where(AuditLog.tenant_id == tenant_id)
        .order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    return [_log_out(l) for l in result.scalars().all()]


@router.get("/audit-log")
async def get_global_audit_log(
    db: DB,
    user: OperatorUser,
    limit: int = Query(default=100, le=500),
):
    result = await db.execute(
        select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    )
    return [_log_out(l) for l in result.scalars().all()]


def _log_out(l: AuditLog) -> dict:
    return {
        "id": str(l.id),
        "user_id": str(l.user_id) if l.user_id else None,
        "tenant_id": str(l.tenant_id) if l.tenant_id else None,
        "action": l.action,
        "resource_type": l.resource_type,
        "resource_id": str(l.resource_id) if l.resource_id else None,
        "details": l.details,
        "ip_address": str(l.ip_address) if l.ip_address else None,
        "created_at": l.created_at.isoformat(),
    }
