"""API schemas for the settings feature."""

from sqlmodel import SQLModel


class SettingsRead(SQLModel):
    """Settings returned to the client."""

    timezone: str


class SettingsUpdate(SQLModel):
    """Partial settings update. Only provided fields are changed."""

    timezone: str | None = None
