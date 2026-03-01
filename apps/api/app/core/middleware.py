from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class TenantMiddleware(BaseHTTPMiddleware):
    """Resolve tenant from request header or subdomain."""

    async def dispatch(self, request: Request, call_next):
        # Try X-Tenant-ID header first (API clients)
        tenant_id = request.headers.get("X-Tenant-ID")

        # Fallback: extract from subdomain
        if not tenant_id:
            host = request.headers.get("host", "")
            parts = host.split(".")
            if len(parts) >= 3:
                tenant_id = parts[0]

        # Store on request state for downstream access
        request.state.tenant_id = tenant_id

        response = await call_next(request)
        return response
