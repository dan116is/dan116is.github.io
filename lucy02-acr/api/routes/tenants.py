from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func

from api.models.tenant import Tenant
from api.models.agent import Agent
from api.models.workflow import WorkflowExecution
from api.models.alert import Alert
from api.services.deps import DB, CurrentUser, OperatorUser

router = APIRouter()


class TenantCreate(BaseModel):
    name: str
    slug: str
    industry: str | None = None
    logo_url: str | None = None
    brand_color: str = "#00D4AA"
    settings: dict = {}


class TenantUpdate(BaseModel):
    name: str | None = None
    industry: str | None = None
    logo_url: str | None = None
    brand_color: str | None = None
    settings: dict | None = None
    is_active: bool | None = None


@router.get("")
async def list_tenants(db: DB, user: OperatorUser):
    result = await db.execute(select(Tenant).order_by(Tenant.name))
    tenants = result.scalars().all()
    return [_tenant_summary(t) for t in tenants]


@router.post("", status_code=201)
async def create_tenant(body: TenantCreate, db: DB, user: OperatorUser):
    existing = await db.execute(select(Tenant).where(Tenant.slug == body.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Slug already exists")
    tenant = Tenant(**body.model_dump())
    db.add(tenant)
    await db.commit()
    await db.refresh(tenant)
    return _tenant_summary(tenant)


@router.get("/{tenant_id}")
async def get_tenant(tenant_id: UUID, db: DB, user: CurrentUser):
    tenant = await _get_tenant_or_404(tenant_id, db)
    _check_access(user, tenant_id)
    return _tenant_summary(tenant)


@router.put("/{tenant_id}")
async def update_tenant(tenant_id: UUID, body: TenantUpdate, db: DB, user: OperatorUser):
    tenant = await _get_tenant_or_404(tenant_id, db)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(tenant, field, value)
    await db.commit()
    await db.refresh(tenant)
    return _tenant_summary(tenant)


@router.get("/{tenant_id}/dashboard")
async def get_tenant_dashboard(tenant_id: UUID, db: DB, user: CurrentUser):
    _check_access(user, tenant_id)
    tenant = await _get_tenant_or_404(tenant_id, db)

    agents_result = await db.execute(
        select(Agent.status, func.count(Agent.id)).where(Agent.tenant_id == tenant_id).group_by(Agent.status)
    )
    agent_counts = dict(agents_result.all())

    active_executions = await db.execute(
        select(func.count(WorkflowExecution.id)).where(
            WorkflowExecution.tenant_id == tenant_id,
            WorkflowExecution.status == "running"
        )
    )

    active_alerts = await db.execute(
        select(func.count(Alert.id)).where(
            Alert.tenant_id == tenant_id,
            Alert.status == "active"
        )
    )

    return {
        "tenant": _tenant_summary(tenant),
        "agents": {
            "total": sum(agent_counts.values()),
            "by_status": agent_counts,
        },
        "workflows": {
            "active_executions": active_executions.scalar() or 0,
        },
        "alerts": {
            "active": active_alerts.scalar() or 0,
        },
    }


async def _get_tenant_or_404(tenant_id: UUID, db: DB):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


def _check_access(user, tenant_id: UUID):
    if user.is_operator:
        return
    if user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")


def _tenant_summary(t: Tenant) -> dict:
    return {
        "id": str(t.id),
        "name": t.name,
        "slug": t.slug,
        "industry": t.industry,
        "logo_url": t.logo_url,
        "brand_color": t.brand_color,
        "settings": t.settings,
        "is_active": t.is_active,
        "created_at": t.created_at.isoformat(),
    }
