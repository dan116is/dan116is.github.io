"""
Middleware that writes an audit log entry for every mutating API request.
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from api.db import AsyncSessionLocal
from api.models.audit import AuditLog


MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

# Skip logging for these path prefixes
SKIP_PATHS = {"/api/health", "/api/ingest", "/api/agents/", "/api/auth/refresh"}


class AuditLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        if request.method not in MUTATING_METHODS:
            return response
        if any(request.url.path.startswith(p) for p in SKIP_PATHS):
            return response
        if response.status_code >= 400:
            return response

        # Best-effort: extract user/tenant from state (set by auth dependency)
        user_id = getattr(request.state, "user_id", None)
        tenant_id = getattr(request.state, "tenant_id", None)
        client_ip = request.client.host if request.client else None

        try:
            async with AsyncSessionLocal() as db:
                log = AuditLog(
                    user_id=user_id,
                    tenant_id=tenant_id,
                    action=f"{request.method} {request.url.path}",
                    ip_address=client_ip,
                    details={"status_code": response.status_code},
                )
                db.add(log)
                await db.commit()
        except Exception:
            pass  # Audit failures must never break the request

        return response
