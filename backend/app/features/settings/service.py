"""Business logic for application settings.

Settings are a single row (id="default"). `get_or_create` guarantees it exists
so callers never have to handle a missing row.
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Settings

DEFAULT_ID = "default"


async def get_or_create(session: AsyncSession) -> Settings:
    """Return the singleton settings row, creating it with defaults if absent."""
    settings = await session.get(Settings, DEFAULT_ID)
    if settings is None:
        settings = Settings(id=DEFAULT_ID)
        session.add(settings)
        await session.commit()
        await session.refresh(settings)
    return settings


async def update(session: AsyncSession, *, timezone: str | None) -> Settings:
    """Apply a partial update to the singleton settings row."""
    settings = await get_or_create(session)
    if timezone is not None:
        settings.timezone = timezone
    session.add(settings)
    await session.commit()
    await session.refresh(settings)
    return settings
