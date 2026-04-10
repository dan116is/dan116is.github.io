from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class TenantMiddleware(BaseHTTPMiddleware):
    """
    Extracts tenant context from JWT claims and makes it available
    via request.state. The actual RLS setting happens in db session middleware.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        request.state.tenant_id = None
        request.state.is_super_admin = False
        return await call_next(request)
