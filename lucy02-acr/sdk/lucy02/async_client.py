"""
Async version of AgentSDK — for use inside async agent frameworks.
"""
import asyncio
import functools
import time
import traceback
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Callable

import httpx

from lucy02.trace import TraceContext, SpanContext


class AsyncAgentSDK:
    def __init__(
        self,
        api_key: str,
        client_id: str,
        agent_id: str,
        base_url: str = "https://acr.lucy02.ai",
        heartbeat_interval: int = 30,
    ):
        if not api_key.startswith("lcy_"):
            raise ValueError("API key must start with 'lcy_'")

        self.api_key = api_key
        self.client_id = client_id
        self.agent_id = agent_id
        self.base_url = base_url.rstrip("/")
        self._headers = {"X-API-Key": api_key, "Content-Type": "application/json"}
        self._trace_buffer: list[dict] = []
        self._metrics_buffer: list[dict] = []
        self._http = httpx.AsyncClient(timeout=10)
        self._heartbeat_task: asyncio.Task | None = None

    async def start(self):
        """Call after creating the SDK to begin heartbeat."""
        self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())

    async def stop(self):
        """Flush buffers and cancel heartbeat on shutdown."""
        if self._heartbeat_task:
            self._heartbeat_task.cancel()
        await self._flush_traces()
        await self._flush_metrics()
        await self._http.aclose()

    # ─── Context managers ─────────────────────────────────────────────────────

    @asynccontextmanager
    async def trace(self, name: str, metadata: dict | None = None):
        ctx = TraceContext(
            sdk=self,
            name=name,
            tenant_id=self.client_id,
            agent_id=self.agent_id,
            metadata=metadata or {},
        )
        try:
            yield ctx
            ctx._finish(status="ok")
        except Exception as e:
            ctx._finish(status="error", error=str(e))
            raise
        finally:
            self._trace_buffer.append(ctx._to_dict())
            if len(self._trace_buffer) >= 25:
                asyncio.create_task(self._flush_traces())

    @asynccontextmanager
    async def span(self, trace_ctx: TraceContext, name: str, input_data: Any = None):
        span = SpanContext(
            trace_id=trace_ctx.id,
            name=name,
            input_data=input_data,
            parent=trace_ctx,
        )
        try:
            yield span
            span._finish(status="ok")
        except Exception as e:
            span._finish(status="error", error=str(e))
            raise
        finally:
            trace_ctx._spans.append(span._to_dict())

    # ─── Metrics & logging ────────────────────────────────────────────────────

    async def metric(self, name: str, value: float, tags: dict | None = None):
        self._metrics_buffer.append({
            "tenant_id": self.client_id,
            "agent_id": self.agent_id,
            "metric_name": name,
            "value": value,
            "time": datetime.now(timezone.utc).isoformat(),
            "tags": tags or {},
        })
        if len(self._metrics_buffer) >= 100:
            asyncio.create_task(self._flush_metrics())

    async def log(self, level: str, message: str, extra: dict | None = None):
        await self._send_event({
            "event_type": "log",
            "level": level,
            "message": message,
            "extra": extra or {},
        })

    async def error(self, exc: Exception, context: dict | None = None):
        await self._send_event({
            "event_type": "error",
            "error_type": type(exc).__name__,
            "message": str(exc),
            "stacktrace": traceback.format_exc(),
            "context": context or {},
        })

    # ─── LangChain instrumentation ────────────────────────────────────────────

    def get_langchain_callback(self):
        """Returns a LangChain callback handler that auto-traces LLM calls."""
        try:
            from langchain.callbacks.base import BaseCallbackHandler

            sdk = self

            class Lucy02CallbackHandler(BaseCallbackHandler):
                def __init__(self):
                    self._start_times: dict[str, float] = {}

                def on_llm_start(self, serialized, prompts, **kwargs):
                    run_id = str(kwargs.get("run_id", uuid.uuid4()))
                    self._start_times[run_id] = time.perf_counter()

                def on_llm_end(self, response, **kwargs):
                    run_id = str(kwargs.get("run_id", ""))
                    start = self._start_times.pop(run_id, time.perf_counter())
                    duration_ms = int((time.perf_counter() - start) * 1000)

                    usage = getattr(response, "llm_output", {}) or {}
                    token_usage = usage.get("token_usage", {})

                    sdk._trace_buffer.append({
                        "tenant_id": sdk.client_id,
                        "agent_id": sdk.agent_id,
                        "name": f"langchain/{serialized.get('name', 'llm')}",
                        "status": "ok",
                        "started_at": datetime.now(timezone.utc).isoformat(),
                        "duration_ms": duration_ms,
                        "model": serialized.get("name"),
                        "tokens_in": token_usage.get("prompt_tokens", 0),
                        "tokens_out": token_usage.get("completion_tokens", 0),
                        "metadata": {"provider": "langchain"},
                    })

                def on_llm_error(self, error, **kwargs):
                    asyncio.create_task(sdk.error(error if isinstance(error, Exception) else Exception(str(error))))

            return Lucy02CallbackHandler()
        except ImportError:
            raise ImportError("langchain is required: pip install lucy02-sdk[langchain]")

    # ─── Internal ─────────────────────────────────────────────────────────────

    async def _heartbeat_loop(self):
        while True:
            await asyncio.sleep(30)
            try:
                await self._http.post(
                    f"{self.base_url}/api/agents/{self.agent_id}/heartbeat",
                    json={"status": "running"},
                    headers=self._headers,
                )
            except Exception:
                pass

    async def _flush_traces(self):
        if not self._trace_buffer:
            return
        batch = self._trace_buffer[:]
        self._trace_buffer.clear()
        try:
            await self._http.post(
                f"{self.base_url}/api/ingest/traces",
                json={"traces": batch},
                headers=self._headers,
            )
        except Exception:
            pass

    async def _flush_metrics(self):
        if not self._metrics_buffer:
            return
        batch = self._metrics_buffer[:]
        self._metrics_buffer.clear()
        try:
            await self._http.post(
                f"{self.base_url}/api/ingest/metrics",
                json={"metrics": batch},
                headers=self._headers,
            )
        except Exception:
            pass

    async def _send_event(self, payload: dict):
        payload.update({
            "tenant_id": self.client_id,
            "agent_id": self.agent_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        try:
            await self._http.post(
                f"{self.base_url}/api/ingest/events",
                json=payload,
                headers=self._headers,
            )
        except Exception:
            pass

    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, *_):
        await self.stop()
