from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from venkat_pilot.api.chat import router as chat_router
from venkat_pilot.api.screenshot import router as screenshot_router
from venkat_pilot.api.synthesize import router as synthesize_router
from venkat_pilot.settings import get_settings

settings = get_settings()

app = FastAPI(
    title="venkat_pilot API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url=None,
)

# CORS — allow the Chrome extension and local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_origin_regex=r"chrome-extension://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Auth middleware ───────────────────────────────────────────────────────────

@app.middleware("http")
async def verify_api_key(request: Request, call_next: object) -> Response:
    # Skip auth for health check and docs
    if request.url.path in ("/api/health", "/api/docs", "/openapi.json"):
        return await call_next(request)  # type: ignore[operator]

    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return Response(content="Unauthorized", status_code=401)

    token = auth.removeprefix("Bearer ").strip()
    if token != settings.venkat_pilot_api_key:
        return Response(content="Forbidden", status_code=403)

    return await call_next(request)  # type: ignore[operator]


# ── Routes ────────────────────────────────────────────────────────────────────

app.include_router(chat_router, prefix="/api")
app.include_router(synthesize_router, prefix="/api")
app.include_router(screenshot_router, prefix="/api")


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "venkat_pilot"}
