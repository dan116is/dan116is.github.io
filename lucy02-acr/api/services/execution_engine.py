"""
Workflow Execution Engine.
Processes a WorkflowExecution step-by-step, updating DB and broadcasting
WebSocket events after each step so the frontend animates in real-time.
"""
import asyncio
import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select

from api.db import AsyncSessionLocal
from api.models.workflow import WorkflowExecution, WorkflowStep, Workflow
from api.models.agent import Agent
from api.websocket.manager import ws_manager

logger = logging.getLogger(__name__)


class ExecutionEngine:
    """
    Simulates running a workflow execution.
    In production, each step would invoke the actual agent via its API/SDK.
    Here we simulate with configurable delays so the UI can show live updates.
    """

    async def run(self, execution_id: UUID, simulate: bool = True):
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(WorkflowExecution).where(WorkflowExecution.id == execution_id)
            )
            execution = result.scalar_one_or_none()
            if not execution:
                logger.error(f"Execution {execution_id} not found")
                return

            wf_result = await db.execute(
                select(Workflow).where(Workflow.id == execution.workflow_id)
            )
            workflow = wf_result.scalar_one_or_none()

            steps_result = await db.execute(
                select(WorkflowStep)
                .where(WorkflowStep.execution_id == execution_id)
                .order_by(WorkflowStep.step_order)
            )
            steps = steps_result.scalars().all()

        tenant_id = str(execution.tenant_id)
        exec_channel = f"exec:{execution_id}"

        # Broadcast execution start
        await ws_manager.broadcast_to_tenant(tenant_id, {
            "event": "execution_started",
            "execution_id": str(execution_id),
            "workflow_name": workflow.name if workflow else "Unknown",
        })

        all_ok = True
        for step in steps:
            await self._run_step(step, execution_id, tenant_id, exec_channel, simulate)
            # Check if step failed — stop pipeline on failure
            async with AsyncSessionLocal() as db:
                refreshed = await db.get(WorkflowStep, step.id)
                if refreshed and refreshed.status == "failed":
                    all_ok = False
                    break

        # Mark execution complete/failed
        final_status = "completed" if all_ok else "failed"
        async with AsyncSessionLocal() as db:
            exec_obj = await db.get(WorkflowExecution, execution_id)
            if exec_obj:
                exec_obj.status = final_status
                exec_obj.completed_at = datetime.now(timezone.utc)
                await db.commit()

        await ws_manager.broadcast_to_tenant(tenant_id, {
            "event": "execution_finished",
            "execution_id": str(execution_id),
            "status": final_status,
        })
        await ws_manager.broadcast_to_tenant(exec_channel, {
            "event": "execution_finished",
            "execution_id": str(execution_id),
            "status": final_status,
        })

        logger.info(f"Execution {execution_id} → {final_status}")

    async def _run_step(
        self,
        step: WorkflowStep,
        execution_id: UUID,
        tenant_id: str,
        exec_channel: str,
        simulate: bool,
    ):
        started_at = datetime.now(timezone.utc)

        # Mark step as running
        async with AsyncSessionLocal() as db:
            s = await db.get(WorkflowStep, step.id)
            if s:
                s.status = "running"
                s.started_at = started_at
                await db.commit()

        await ws_manager.broadcast_to_tenant(tenant_id, {
            "event": "step_started",
            "execution_id": str(execution_id),
            "step_id": str(step.id),
            "step_name": step.step_name,
        })
        await ws_manager.broadcast_to_tenant(exec_channel, {
            "event": "step_started",
            "step_id": str(step.id),
            "step_name": step.step_name,
        })

        # Simulate agent work
        if simulate:
            delay = 1.5 + (hash(str(step.id)) % 30) / 10  # 1.5 – 4.5s
            await asyncio.sleep(delay)

        completed_at = datetime.now(timezone.utc)
        duration_ms = int((completed_at - started_at).total_seconds() * 1000)

        # Simulated output + token counts
        tokens_in = 400 + (hash(str(step.id) + "in") % 600)
        tokens_out = 200 + (hash(str(step.id) + "out") % 400)
        cost = round((tokens_in * 3.0 + tokens_out * 15.0) / 1_000_000, 6)

        async with AsyncSessionLocal() as db:
            s = await db.get(WorkflowStep, step.id)
            if s:
                s.status = "completed"
                s.completed_at = completed_at
                s.duration_ms = duration_ms
                s.tokens_in = tokens_in
                s.tokens_out = tokens_out
                s.cost = cost
                s.output_payload = {"result": f"Step '{step.step_name}' completed", "tokens": tokens_in + tokens_out}
                await db.commit()

        await ws_manager.broadcast_to_tenant(tenant_id, {
            "event": "step_completed",
            "execution_id": str(execution_id),
            "step_id": str(step.id),
            "step_name": step.step_name,
            "duration_ms": duration_ms,
            "tokens_in": tokens_in,
            "tokens_out": tokens_out,
            "cost": cost,
        })
        await ws_manager.broadcast_to_tenant(exec_channel, {
            "event": "step_completed",
            "step_id": str(step.id),
            "step_name": step.step_name,
            "duration_ms": duration_ms,
        })
