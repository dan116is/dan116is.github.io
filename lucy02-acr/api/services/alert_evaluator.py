"""
Background service: evaluates alert rules against live metrics.
Run via: asyncio.create_task(AlertEvaluator().run())
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta

from sqlalchemy import select, text

from api.db import AsyncSessionLocal
from api.models.alert import Alert, AlertRule
from api.models.agent import Agent
from api.websocket.manager import ws_manager

logger = logging.getLogger(__name__)

OPERATORS = {
    "gt": lambda v, t: v > t,
    "lt": lambda v, t: v < t,
    "gte": lambda v, t: v >= t,
    "lte": lambda v, t: v <= t,
    "eq": lambda v, t: v == t,
}


class AlertEvaluator:
    """Evaluates all active alert rules every 60 seconds."""

    async def run(self, interval: int = 60):
        logger.info("AlertEvaluator started")
        while True:
            try:
                await self._evaluate_all()
            except Exception as e:
                logger.error(f"AlertEvaluator error: {e}")
            await asyncio.sleep(interval)

    async def _evaluate_all(self):
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(AlertRule).where(AlertRule.is_active == True)
            )
            rules = result.scalars().all()

            for rule in rules:
                try:
                    await self._evaluate_rule(db, rule)
                except Exception as e:
                    logger.warning(f"Rule {rule.id} evaluation failed: {e}")

    async def _evaluate_rule(self, db, rule: AlertRule):
        value = await self._get_metric_value(db, rule)
        if value is None:
            return

        op = OPERATORS.get(rule.operator)
        if not op:
            return

        if not op(value, rule.threshold):
            return  # OK — no alert needed

        # Check cooldown: don't re-fire if recent active alert for this rule
        recent = await db.execute(
            select(Alert).where(
                Alert.rule_id == rule.id,
                Alert.status.in_(["active", "acknowledged"]),
                Alert.created_at >= datetime.now(timezone.utc) - timedelta(minutes=rule.cooldown_minutes),
            )
        )
        if recent.scalar_one_or_none():
            return  # Still in cooldown

        # Determine severity based on how much the threshold is exceeded
        severity = self._classify_severity(rule.metric, value, rule.threshold)

        alert = Alert(
            tenant_id=rule.tenant_id,
            rule_id=rule.id,
            severity=severity,
            message=self._format_message(rule, value),
            status="active",
        )
        db.add(alert)
        await db.commit()

        # Push to WebSocket
        await ws_manager.broadcast_to_tenant(
            str(rule.tenant_id),
            {
                "event": "alert_fired",
                "alert_id": str(alert.id),
                "severity": severity,
                "message": alert.message,
                "rule": rule.name,
            },
        )

        logger.info(f"Alert fired: [{severity}] {alert.message} (tenant={rule.tenant_id})")

    async def _get_metric_value(self, db, rule: AlertRule) -> float | None:
        metric = rule.metric

        if metric == "agent_down_minutes":
            # Find agents with no heartbeat > threshold minutes
            cutoff = datetime.now(timezone.utc) - timedelta(minutes=rule.threshold)
            result = await db.execute(
                select(Agent).where(
                    Agent.tenant_id == rule.tenant_id,
                    Agent.status != "stopped",
                    Agent.last_heartbeat < cutoff,
                )
            )
            down_agents = result.scalars().all()
            return float(len(down_agents)) if down_agents else 0.0

        elif metric in ("error_rate", "latency_p95", "token_rate", "cost_daily"):
            result = await db.execute(text("""
                SELECT AVG(value) FROM metrics
                WHERE tenant_id = :tenant_id
                  AND metric_name = :metric
                  AND time >= NOW() - INTERVAL '5 minutes'
            """), {"tenant_id": str(rule.tenant_id), "metric": metric})
            val = result.scalar()
            return float(val) if val is not None else None

        return None

    def _classify_severity(self, metric: str, value: float, threshold: float) -> str:
        ratio = value / threshold if threshold else float("inf")
        if ratio >= 3.0:
            return "critical"
        if ratio >= 1.5:
            return "warning"
        return "info"

    def _format_message(self, rule: AlertRule, value: float) -> str:
        return f"[{rule.name}] {rule.metric} = {value:.2f} (threshold: {rule.operator} {rule.threshold})"
