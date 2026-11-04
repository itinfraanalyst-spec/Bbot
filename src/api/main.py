from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from src.core.rate_limit import limiter
from src.api.routes import router
from src.auth.routes import router as auth_router
from src.api.custom_bots import router as custom_bots_router
from src.api.public_bots import router as public_bots_router
from src.visual_studio.routes import router as visual_studio_router
from src.auth.db import init_users_table
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.responses import JSONResponse
from urllib.parse import urlsplit
from src.config import settings
import ipaddress
import os
from pathlib import Path

init_users_table()

# Startup-time single-worker enforcement
import logging
logger = logging.getLogger(__name__)

# If not explicitly confirmed, warn loudly. We could refuse to start, but to avoid 
# instantly breaking existing deployments, we log an impossible-to-miss warning.
if os.environ.get("SINGLE_WORKER_CONFIRMED", "").lower() != "true":
    logger.critical("=" * 80)
    logger.critical("CRITICAL SECURITY WARNING: SINGLE_WORKER_CONFIRMED is not set to 'true'!")
    logger.critical("The rate limiter in this application stores state in-memory.")
    logger.critical("If you are running this application with multiple workers (e.g., Gunicorn/Uvicorn with >1 worker),")
    logger.critical("the rate limit will be bypassed by attackers distributing requests across workers.")
    logger.critical("To suppress this warning, ensure you are running exactly 1 worker and set SINGLE_WORKER_CONFIRMED=true")
    logger.critical("=" * 80)

app = FastAPI(title="TRPW bbot API")

app.state.limiter = limiter
async def custom_rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    response = _rate_limit_exceeded_handler(request, exc)
    
    # We must explicitly set CORS headers because this handler bypasses the standard
    # CORSMiddleware flow when OriginPolicyMiddleware is outermost.
    origin = request.headers.get("origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        
    return response

app.add_exception_handler(RateLimitExceeded, custom_rate_limit_exceeded_handler)

def normalize_origin(value: str) -> str | None:
    parsed = urlsplit(value.strip())
    if parsed.scheme.lower() not in {"http", "https"} or not parsed.hostname:
        return None
    try:
        port = parsed.port
    except ValueError:
        return None
    hostname = parsed.hostname.lower()
    if ":" in hostname and not hostname.startswith("["):
        hostname = f"[{hostname}]"
    default_port = 80 if parsed.scheme.lower() == "http" else 443
    port_suffix = "" if port in (None, default_port) else f":{port}"
    return f"{parsed.scheme.lower()}://{hostname}{port_suffix}"

def configured_origins() -> set[str]:
    origins = set()
    for origin in (settings.ALLOWED_ORIGINS or "").split(","):
        origin_clean = origin.strip()
        if origin_clean == "*":
            origins.add("*")
        elif (normalized := normalize_origin(origin_clean)) is not None:
            origins.add(normalized)
    return origins

def get_dynamic_allowed_origins(public_key: str) -> set[str]:
    from src.database.connection import get_connection
    import json
    with get_connection() as conn:
        row = conn.execute("SELECT allowed_origins FROM custom_bot_integrations WHERE public_key = ? AND enabled = TRUE", (public_key,)).fetchone()
        if not row:
            return set()
        try:
            origins = json.loads(row["allowed_origins"] or "[]")
            result = set()
            for origin in origins:
                if origin.strip() == "*":
                    result.add("*")
                elif (norm := normalize_origin(origin)) is not None:
                    result.add(norm)
            return result
        except:
            return set()

class OriginPolicyMiddleware:
    def __init__(self, app, allowed_origins: set[str]):
        self.app = app
        self.allowed_origins = allowed_origins

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http" and scope["method"] in {"POST", "PATCH", "PUT", "DELETE"}:
            headers = {key.lower(): value for key, value in scope.get("headers", [])}
            origin = headers.get(b"origin")
            referer = headers.get(b"referer")
            cookie_header = headers.get(b"cookie", b"")
            has_auth_cookie = any(
                part.strip().startswith(b"access_token=")
                for part in cookie_header.split(b";")
            )
            candidate = None
            if origin is not None:
                candidate = normalize_origin(origin.decode("latin-1"))
            elif referer is not None:
                referer_url = urlsplit(referer.decode("latin-1"))
                candidate = normalize_origin(f"{referer_url.scheme}://{referer_url.netloc}")
            
            origins_allowed = configured_origins()
            allow_all = "*" in origins_allowed
            if not allow_all and (origin is not None or referer is not None) and candidate not in origins_allowed:
                # Check dynamic origins if this is a public bot endpoint
                path = scope.get("path", "")
                is_allowed_dynamically = False
                if path.startswith("/api/public/bots/"):
                    is_allowed_dynamically = True
                
                if not is_allowed_dynamically:
                    response = JSONResponse(status_code=403, content={"detail": "Origin not allowed"})
                    await response(scope, receive, send)
                    return
            if has_auth_cookie and origin is None and referer is None and scope.get("path") != "/auth/logout":
                response = JSONResponse(status_code=403, content={"detail": "Origin required for cookie-authenticated request"})
                await response(scope, receive, send)
                return

        # Wrap the send callable to intercept the response headers and fix CORS
        async def custom_send(message):
            if message["type"] == "http.response.start":
                # Find if origin is in headers
                req_headers = {key.lower(): value for key, value in scope.get("headers", [])}
                req_origin = req_headers.get(b"origin")
                
                if req_origin:
                    # Convert headers list to a mutable dict for easier manipulation
                    res_headers = []
                    has_acao = False
                    for k, v in message.get("headers", []):
                        if k.lower() == b"access-control-allow-origin":
                            res_headers.append((b"access-control-allow-origin", req_origin))
                            has_acao = True
                        else:
                            res_headers.append((k, v))
                    if not has_acao:
                        res_headers.append((b"access-control-allow-origin", req_origin))
                        res_headers.append((b"access-control-allow-credentials", b"true"))
                    message["headers"] = res_headers

            await send(message)

        await self.app(scope, receive, custom_send)

class MaxUploadSizeMiddleware:
    def __init__(self, app, max_upload_size: int):
        self.app = app
        self.max_upload_size = max_upload_size

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("path") != "/api/documents":
            return await self.app(scope, receive, send)
            
        headers = {key.lower(): value for key, value in scope.get("headers", [])}
        content_length = headers.get(b"content-length")
        
        if content_length:
            try:
                if int(content_length) > self.max_upload_size:
                    response = JSONResponse(status_code=413, content={"detail": "Payload too large"})
                    await response(scope, receive, send)
                    return
            except ValueError:
                response = JSONResponse(status_code=400, content={"detail": "Invalid Content-Length"})
                await response(scope, receive, send)
                return
        
        bytes_received = 0
        async def receive_with_size_limit():
            nonlocal bytes_received
            message = await receive()
            if message["type"] == "http.request":
                bytes_received += len(message.get("body", b""))
                if bytes_received > self.max_upload_size:
                    raise RuntimeError("Upload exceeds maximum size limit")
            return message
            
        try:
            await self.app(scope, receive_with_size_limit, send)
        except RuntimeError as e:
            if str(e) == "Upload exceeds maximum size limit":
                response = JSONResponse(status_code=413, content={"detail": "Payload too large"})
                # Send the response directly; we can't easily recover the request lifecycle here
                await response(scope, receive, send)
                return
            raise

logger.info(
    "Startup security mode=%s cookie_secure=%s allowed_origins=%d",
    settings.ENVIRONMENT,
    settings.COOKIE_SECURE,
    len(configured_origins()),
)
if settings.ENVIRONMENT != "production":
    try:
        non_loopback_host = not ipaddress.ip_address(settings.API_HOST).is_loopback
    except ValueError:
        non_loopback_host = settings.API_HOST.lower() not in {"localhost"}
    if non_loopback_host:
        logger.warning("Non-production server is bound to non-loopback host %s", settings.API_HOST)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Relaxed here, strictly enforced in OriginPolicyMiddleware
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(OriginPolicyMiddleware, allowed_origins=configured_origins())
app.add_middleware(MaxUploadSizeMiddleware, max_upload_size=(settings.MAX_PDF_SIZE_MB * 1024 * 1024) + (2 * 1024 * 1024))

app.include_router(router, prefix="/api")
app.include_router(auth_router, prefix="/auth")
app.include_router(custom_bots_router, prefix="/api")
app.include_router(public_bots_router, prefix="/api")
app.include_router(visual_studio_router, prefix="/api/visual-studio")

# Serve SPA frontend
client_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "client", "dist"))
if not os.path.exists(client_path):
    logger.warning(f"Client build directory not found at {client_path}. Run 'npm run build' in client/.")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    if full_path.startswith("api/") or full_path.startswith("auth/"):
        raise HTTPException(status_code=404, detail="API route not found")
        
    client_root = Path(client_path).resolve()
    file_path = (client_root / full_path).resolve()
    try:
        file_path.relative_to(client_root)
    except ValueError:
        raise HTTPException(status_code=404, detail="File not found")

    if file_path.is_file():
        return FileResponse(file_path)

    # Missing static assets should 404, not fallback to index.html
    if full_path.startswith("assets/"):
        raise HTTPException(status_code=404, detail="Static asset chunk not found")
    
    index_path = os.path.join(client_path, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path, headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
    return {"error": "Frontend not built. Run 'npm run build' in client/ directory."}

if __name__ == "__main__":
    import uvicorn
    from src.config import settings
    uvicorn.run(app, host=settings.API_HOST, port=settings.API_PORT)
