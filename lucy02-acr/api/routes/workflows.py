from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from api.models.workflow import Workflow, WorkflowExecution, WorkflowStep
from api.services.deps import DB, CurrentUser, OperatorUser
from api.websocket.manager import ws_manager

router = APIRouter()


class WorkflowCreate(BaseModel):
    name: str
    description: str | None = None
    definition: dict = {"steps": [], "edges": [], "trigger": {}}


class WorkflowExecuteRequest(BaseModel):
    trigger_payload: dict = {}


@router.get("/tenants/{tenant_id}/workflows")
async def list_workflows(tenant_id: UUID, db: DB, user: CurrentUser):
    _check_access(user, tenant_id)
    result = await db.execute(
        select(Workflow).where(Workflow.tenant_id == tenant_id, Workflow.is_active == True).order_by(Workflow.name)
    )
    return [_workflow_out(w) for w in result.scalars().all()]


@router.post("/tenants/{tenant_id}/workflows", status_code=201)
async def create_workflow(tenant_id: UUID, body: WorkflowCreate, db: DB, user: OperatorUser):
    wf = Workflow(tenant_id=tenant_id, created_by=user.id, **body.model_dump())
    db.add(wf)
    await db.commit()
    await db.refresh(wf)
    return _workflow_out(wf)


@router.get("/workflows/{workflow_id}")
async def get_workflow(workflow_id: UUID, db: DB, user: CurrentUser):
    wf = await _get_workflow_or_404(workflow_id, db)
    _check_access(user, wf.tenant_id)
    return _workflow_out(wf)


@router.get("/workflows/{workflow_id}/executions")
async def list_executions(workflow_id: UUID, db: DB, user: CurrentUser, limit: int = 20):
    wf = await _get_workflow_or_404(workflow_id, db)
    _check_access(user, wf.tenant_id)
    result = await db.execute(
        select(WorkflowExecution)
        .where(WorkflowExecution.workflow_id == workflow_id)
        .order_by(WorkflowExecution.started_at.desc())
        .limit(limit)
    )
    return [_execution_out(e) for e in result.scalars().all()]


@router.post("/workflows/{workflow_id}/execute", status_code=201)
async def execute_workflow(workflow_id: UUID, body: WorkflowExecuteRequest, db: DB, user: CurrentUser):
    wf = await _get_workflow_or_404(workflow_id, db)
    _check_access(user, wf.tenant_id)

    execution = WorkflowExecution(
        workflow_id=workflow_id,
        tenant_id=wf.tenant_id,
        status="running",
        started_at=datetime.now(timezone.utc),
        trigger_type="manual",
        trigger_payload=body.trigger_payload,
    )
    db.add(execution)

    # Create pending steps from definition
    for i, step_def in enumerate(wf.definition.get("steps", [])):
        step = WorkflowStep(
            execution_id=execution.id,
            tenant_id=wf.tenant_id,
            step_name=step_def.get("name", f"Step {i+1}"),
            step_order=i,
            agent_id=step_def.get("agent_id"),
            status="pending",
        )
        db.add(step)

    await db.commit()
    await db.refresh(execution)

    # Run execution engine in background
    import asyncio
    from api.services.execution_engine import ExecutionEngine
    asyncio.get_event_loop().create_task(
        ExecutionEngine().run(execution.id, simulate=True)
    )

    return _execution_out(execution)


@router.get("/executions/{execution_id}")
async def get_execution(execution_id: UUID, db: DB, user: CurrentUser):
    result = await db.execute(select(WorkflowExecution).where(WorkflowExecution.id == execution_id))
    execution = result.scalar_one_or_none()
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    _check_access(user, execution.tenant_id)

    steps_result = await db.execute(
        select(WorkflowStep)
        .where(WorkflowStep.execution_id == execution_id)
        .order_by(WorkflowStep.step_order)
    )
    steps = steps_result.scalars().all()

    return {**_execution_out(execution), "steps": [_step_out(s) for s in steps]}


async def _get_workflow_or_404(workflow_id: UUID, db):
    result = await db.execute(select(Workflow).where(Workflow.id == workflow_id))
    wf = result.scalar_one_or_none()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return wf


def _check_access(user, tenant_id: UUID):
    if user.is_operator:
        return
    if user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")


def _workflow_out(w: Workflow) -> dict:
    return {
        "id": str(w.id),
        "tenant_id": str(w.tenant_id),
        "name": w.name,
        "description": w.description,
        "version": w.version,
        "definition": w.definition,
        "is_active": w.is_active,
        "created_at": w.created_at.isoformat(),
    }


def _execution_out(e: WorkflowExecution) -> dict:
    return {
        "id": str(e.id),
        "workflow_id": str(e.workflow_id),
        "status": e.status,
        "started_at": e.started_at.isoformat() if e.started_at else None,
        "completed_at": e.completed_at.isoformat() if e.completed_at else None,
        "trigger_type": e.trigger_type,
        "error": e.error,
    }


def _step_out(s: WorkflowStep) -> dict:
    return {
        "id": str(s.id),
        "step_name": s.step_name,
        "step_order": s.step_order,
        "agent_id": str(s.agent_id) if s.agent_id else None,
        "status": s.status,
        "started_at": s.started_at.isoformat() if s.started_at else None,
        "completed_at": s.completed_at.isoformat() if s.completed_at else None,
        "duration_ms": s.duration_ms,
        "tokens_in": s.tokens_in,
        "tokens_out": s.tokens_out,
        "cost": float(s.cost),
        "error": s.error,
        "output_payload": s.output_payload,
    }
