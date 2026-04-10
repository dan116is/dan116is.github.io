"""
Background service: monitors agent heartbeats and marks agents as error/stopped
when they go silent. Runs every 30 seconds.
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta

from sqlalchemy import select, update

from api.db import AsyncSessionLocal
from api.models.agent import Agent
from api.websocket.manager import ws_manager

logger = logging.getLogger(__name__)

# If no heartbeat in 2 minutes → error; 10 minutes → stopped
ERROR_THRESHOLD_MINUTES = 2
STOPPED_THRESHOLD_MINUTES = 10


class HeartbeatMonitor:
    async def run(self, interval: int = 30):
        logger.info("HeartbeatMonitor started")
        while True:
            try:
                await self._check_all()
            except Exception as e:
                logger.error(f"HeartbeatMonitor error: {e}")
            await asyncio.sleep(interval)

    async def _check_all(self):
        now = datetime.now(timezone.utc)
        error_cutoff = now - timedelta(minutes=ERROR_THRESHOLD_MINUTES)
        stopped_cutoff = now - timedelta(minutes=STOPPED_THRESHOLD_MINUTES)

        async with AsyncSessionLocal() as db:
            # Agents that should move to "error"
            result = await db.execute(
                select(Agent).where(
                    Agent.status == "running",
                    Agent.last_heartbeat < error_cutoff,
                )
            )
            stale_running = result.scalars().all()

            for agent in stale_running:
                new_status = "stopped" if agent.last_heartbeat < stopped_cutoff else "error"
                agent.status = new_status
                await ws_manager.broadcast_to_tenant(
                    str(agent.tenant_id),
                    {
                        "event": "agent_status_changed",
                        "agent_id": str(agent.id),
                        "agent_name": agent.name,
                        "status": new_status,
                        "last_heartbeat": agent.last_heartbeat.isoformat() if agent.last_heartbeat else None,
                    },
                )
                logger.warning(f"Agent {agent.name} ({agent.id}) → {new_status} (last hb: {agent.last_heartbeat})")

            if stale_running:
                await db.commit()
