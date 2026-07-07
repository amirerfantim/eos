"""FastAPI application entry point.

Wires together configuration, CORS, the versioned feature routers, and health
probes. Database schema is managed by Alembic (applied on container start), not
created here — so this stays stateless and cloud/orchestrator friendly.
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.core.db import engine
from app.features.completions.router import router as completions_router
from app.features.habits.router import router as habits_router
from app.features.settings.router import router as settings_router

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    summary="Habit tracking API for Eos.",
)

# Allow the browser frontend (Vite dev server / deployed origin) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount each feature module's router under the versioned API prefix.
for router in (habits_router, completions_router, settings_router):
    app.include_router(router, prefix=settings.api_v1_prefix)


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    """Liveness probe — process is up. Cheap, no dependencies."""
    return {"status": "ok"}


@app.get("/ready", tags=["meta"])
async def ready() -> dict[str, str]:
    """Readiness probe — verifies the database is reachable.

    Orchestrators (k8s, etc.) use this to decide when to route traffic.
    """
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as exc:  # noqa: BLE001 — report any DB failure as not-ready
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, detail="database unavailable"
        ) from exc
    return {"status": "ready"}
