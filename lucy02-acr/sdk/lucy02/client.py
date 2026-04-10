"""
Lucy02 Agent SDK
Usage:
    from lucy02 import AgentSDK
    sdk = AgentSDK(api_key='lcy_...', client_id='...', agent_id='...')
"""
import asyncio
import functools
import threading
import time
import traceback
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Callable

import httpx

from lucy02.trace import TraceContext, SpanContext


class AgentSDK:
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
        self._buffer: list[dict] = []
        self._metrics_buffer: list[dict] = []
        self._flush_lock = threading.Lock()

        # Start heartbeat thread
        self._heartbeat_thread = threading.Thread(
            target=self._heartbeat_loop,
            args=(heartbeat_interval,),
            daemon=True,
        )
        self._heartbeat_thread.start()

    # ─── Trace ────────────────────────────────────────────────────────────────

    @contextmanager
    def trace(self, name: str, metadata: dict | None = None):
        """Context manager for a top-level workflow trace."""
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
            self._queue_trace(ctx._to_dict())

    def traced(self, name: str | None = None):
        """Decorator for tracing a function call."""
        def decorator(fn: Callable):
            @functools.wraps(fn)
            def wrapper(*args, **kwargs):
                trace_name = name or fn.__qualname__
                with self.trace(trace_name):
                    return fn(*args, **kwargs)
            return wrapper
        return decorator

    # ─── Metrics ──────────────────────────────────────────────────────────────

    def metric(self, name: str, value: float, tags: dict | None = None):
        """Emit a custom metric."""
        self._metrics_buffer.append({
            "tenant_id": self.client_id,
            "agent_id": self.agent_id,
            "metric_name": name,
            "value": value,
            "time": datetime.now(timezone.utc).isoformat(),
            "tags": tags or {},
        })
        if len(self._metrics_buffer) >= 100:
            self._flush_metrics()

    # ─── Logging ──────────────────────────────────────────────────────────────

    def log(self, level: str, message: str, extra: dict | None = None):
        """Structured log entry."""
        self._send_event({
            "event_type": "log",
            "level": level,
            "message": message,
            "extra": extra or {},
        })

    def error(self, exc: Exception, context: dict | None = None):
        """Report an exception with full stack trace."""
        self._send_event({
            "event_type": "error",
            "error_type": type(exc).__name__,
            "message": str(exc),
            "stacktrace": traceback.format_exc(),
            "context": context or {},
        })

    # ─── Heartbeat ────────────────────────────────────────────────────────────

    def heartbeat(self, status: str = "running"):
        """Manual heartbeat. Auto-sent every 30s."""
        try:
            with httpx.Client(timeout=5) as client:
                client.post(
                    f"{self.base_url}/api/agents/{self.agent_id}/heartbeat",
                    json={"status": status},
                    headers=self._headers,
                )
        except Exception:
            pass  # Heartbeat failures are non-fatal

    # ─── Framework instrumentation ────────────────────────────────────────────

    def instrument_openai(self):
        """Monkey-patch OpenAI client to auto-emit traces."""
        try:
            import openai
            original_create = openai.ChatCompletion.create

            @functools.wraps(original_create)
            def patched_create(*args, **kwargs):
                start = time.perf_counter()
                resp = original_create(*args, **kwargs)
                duration_ms = int((time.perf_counter() - start) * 1000)
                usage = getattr(resp, "usage", None)
                model = kwargs.get("model", "unknown")
                self._queue_trace({
                    "tenant_id": self.client_id,
                    "agent_id": self.agent_id,
                    "name": f"openai/{model}",
                    "status": "ok",
                    "started_at": datetime.now(timezone.utc).isoformat(),
                    "duration_ms": duration_ms,
                    "model": model,
                    "tokens_in": usage.prompt_tokens if usage else 0,
                    "tokens_out": usage.completion_tokens if usage else 0,
                    "metadata": {"provider": "openai"},
                })
                return resp

            openai.ChatCompletion.create = patched_create
        except ImportError:
            pass

    def instrument_anthropic(self):
        """Monkey-patch Anthropic client to auto-emit traces."""
        try:
            import anthropic
            original_create = anthropic.Anthropic.messages.create.__func__

            @functools.wraps(original_create)
            def patched_create(self_anthropic, *args, **kwargs):
                start = time.perf_counter()
                resp = original_create(self_anthropic, *args, **kwargs)
                duration_ms = int((time.perf_counter() - start) * 1000)
                usage = getattr(resp, "usage", None)
                self._queue_trace({
                    "tenant_id": self.client_id,
                    "agent_id": self.agent_id,
                    "name": f"anthropic/{kwargs.get('model', 'unknown')}",
                    "status": "ok",
                    "started_at": datetime.now(timezone.utc).isoformat(),
                    "duration_ms": duration_ms,
                    "model": kwargs.get("model", "unknown"),
                    "tokens_in": usage.input_tokens if usage else 0,
                    "tokens_out": usage.output_tokens if usage else 0,
                    "metadata": {"provider": "anthropic"},
                })
                return resp

            anthropic.Anthropic.messages.create = patched_create
        except ImportError:
            pass

    # ─── Internal ─────────────────────────────────────────────────────────────

    def _queue_trace(self, trace_dict: dict):
        with self._flush_lock:
            self._buffer.append(trace_dict)
        if len(self._buffer) >= 50:
            threading.Thread(target=self._flush_traces, daemon=True).start()

    def _flush_traces(self):
        with self._flush_lock:
            if not self._buffer:
                return
            batch = self._buffer[:]
            self._buffer.clear()
        try:
            with httpx.Client(timeout=10) as client:
                client.post(
                    f"{self.base_url}/api/ingest/traces",
                    json={"traces": batch},
                    headers=self._headers,
                )
        except Exception:
            pass

    def _flush_metrics(self):
        with self._flush_lock:
            if not self._metrics_buffer:
                return
            batch = self._metrics_buffer[:]
            self._metrics_buffer.clear()
        try:
            with httpx.Client(timeout=10) as client:
                client.post(
                    f"{self.base_url}/api/ingest/metrics",
                    json={"metrics": batch},
                    headers=self._headers,
                )
        except Exception:
            pass

    def _send_event(self, payload: dict):
        payload.update({
            "tenant_id": self.client_id,
            "agent_id": self.agent_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        try:
            with httpx.Client(timeout=5) as client:
                client.post(
                    f"{self.base_url}/api/ingest/events",
                    json=payload,
                    headers=self._headers,
                )
        except Exception:
            pass

    def _heartbeat_loop(self, interval: int):
        while True:
            time.sleep(interval)
            self.heartbeat()

    def __del__(self):
        """Flush buffers on shutdown."""
        self._flush_traces()
        self._flush_metrics()
