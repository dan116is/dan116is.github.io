import time
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from lucy02.client import AgentSDK


class TraceContext:
    """Top-level trace for a workflow execution."""

    def __init__(self, sdk: "AgentSDK", name: str, tenant_id: str, agent_id: str, metadata: dict):
        self.sdk = sdk
        self.name = name
        self.tenant_id = tenant_id
        self.agent_id = agent_id
        self.metadata = metadata
        self.id = str(uuid.uuid4())
        self._start_time = time.perf_counter()
        self._started_at = datetime.now(timezone.utc)
        self._status = "ok"
        self._error: str | None = None
        self._output: Any = None
        self._spans: list[dict] = []
        self._tokens_in = 0
        self._tokens_out = 0

    @contextmanager
    def span(self, name: str, input_data: Any = None):
        """Create a child span within this trace."""
        span = SpanContext(
            trace_id=self.id,
            name=name,
            input_data=input_data,
            parent=self,
        )
        try:
            yield span
            span._finish(status="ok")
        except Exception as e:
            span._finish(status="error", error=str(e))
            raise
        finally:
            self._spans.append(span._to_dict())
            self._tokens_in += span._tokens_in
            self._tokens_out += span._tokens_out

    def set_output(self, output: Any):
        self._output = output

    def _finish(self, status: str, error: str | None = None):
        self._status = status
        self._error = error
        self._duration_ms = int((time.perf_counter() - self._start_time) * 1000)

    def _to_dict(self) -> dict:
        return {
            "tenant_id": self.tenant_id,
            "agent_id": self.agent_id,
            "name": self.name,
            "status": self._status,
            "started_at": self._started_at.isoformat(),
            "duration_ms": getattr(self, "_duration_ms", None),
            "tokens_in": self._tokens_in,
            "tokens_out": self._tokens_out,
            "metadata": {**self.metadata, "spans": self._spans},
        }


class SpanContext:
    """Child span within a trace."""

    def __init__(self, trace_id: str, name: str, input_data: Any, parent: TraceContext):
        self._trace_id = trace_id
        self._name = name
        self._input = input_data
        self._parent = parent
        self._output: Any = None
        self._start_time = time.perf_counter()
        self._started_at = datetime.now(timezone.utc)
        self._status = "ok"
        self._error: str | None = None
        self._logs: list[dict] = []
        self._tokens_in = 0
        self._tokens_out = 0
        self._model: str | None = None
        self._cost: float = 0.0

    def set_output(self, output: Any):
        self._output = output

    def set_tokens(self, tokens_in: int, tokens_out: int, model: str | None = None):
        self._tokens_in = tokens_in
        self._tokens_out = tokens_out
        self._model = model

    def set_cost(self, cost: float):
        self._cost = cost

    def log(self, level: str, message: str, extra: dict | None = None):
        self._logs.append({
            "level": level,
            "message": message,
            "extra": extra or {},
            "time": datetime.now(timezone.utc).isoformat(),
        })

    def _finish(self, status: str, error: str | None = None):
        self._status = status
        self._error = error
        self._duration_ms = int((time.perf_counter() - self._start_time) * 1000)

    def _to_dict(self) -> dict:
        return {
            "name": self._name,
            "status": self._status,
            "started_at": self._started_at.isoformat(),
            "duration_ms": getattr(self, "_duration_ms", None),
            "tokens_in": self._tokens_in,
            "tokens_out": self._tokens_out,
            "model": self._model,
            "cost": self._cost,
            "logs": self._logs,
            "error": self._error,
        }
