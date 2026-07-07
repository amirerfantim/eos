"""HTTP routes for application settings."""

from fastapi import APIRouter

from app.common.deps import SessionDep
from app.features.settings import service
from app.features.settings.schemas import SettingsRead, SettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=SettingsRead)
async def read_settings(session: SessionDep) -> SettingsRead:
    """Get current settings (creates defaults on first access)."""
    settings = await service.get_or_create(session)
    return SettingsRead(timezone=settings.timezone)


@router.patch("", response_model=SettingsRead)
async def update_settings(payload: SettingsUpdate, session: SessionDep) -> SettingsRead:
    """Update settings. The frontend sends the browser's detected timezone here."""
    settings = await service.update(session, timezone=payload.timezone)
    return SettingsRead(timezone=settings.timezone)
