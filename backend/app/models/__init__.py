"""SQLModel table definitions (the database schema).

All table models live here so that:
- Alembic can import one module to discover the full `SQLModel.metadata`.
- Cross-model relationships (Habit ↔ Completion) resolve without circular imports.

API request/response shapes live separately in each feature's `schemas.py`.
"""

import datetime as dt
from uuid import uuid4

from sqlmodel import Field, Relationship, SQLModel, UniqueConstraint


def _uuid() -> str:
    """Generate a random 32-char hex UUID used as a primary key."""
    return uuid4().hex


class Habit(SQLModel, table=True):
    """A habit the user wants to perform (usually daily)."""

    id: str = Field(default_factory=_uuid, primary_key=True)
    name: str
    color: str  # hex string, e.g. "#f59e0b" — drives the card's glow/gradient
    icon: str  # emoji, e.g. "💧"
    order: int = Field(default=0, index=True)  # manual sort position
    created_at: dt.datetime = Field(default_factory=dt.datetime.utcnow)

    # Goal: complete the habit `target` times per `period`. target=1/day is the
    # classic binary "done today". `unit` is a display label for the count
    # (e.g. "glasses", "minutes"); None renders as "times".
    target: int = Field(default=1)
    period: str = Field(default="day")  # "day" | "week"
    unit: str | None = Field(default=None)

    # Deleting a habit removes its completion history (cascade).
    completions: list["Completion"] = Relationship(
        back_populates="habit",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class Completion(SQLModel, table=True):
    """A single day on which a habit was completed.

    One row per (habit, day). Presence of a row == "done that day". The unique
    constraint makes marking idempotent and prevents duplicates.
    """

    __table_args__ = (UniqueConstraint("habit_id", "date", name="uq_completion_habit_date"),)

    id: str = Field(default_factory=_uuid, primary_key=True)
    habit_id: str = Field(foreign_key="habit.id", index=True)
    date: dt.date = Field(index=True)  # the local calendar day it was completed
    count: int = Field(default=1)  # times done that day (progress toward target)

    habit: Habit = Relationship(back_populates="completions")


class Settings(SQLModel, table=True):
    """Singleton application settings.

    For the single-user local build there is exactly one row (id="default").
    When multi-user auth arrives, `timezone` moves onto a per-user row instead.
    """

    id: str = Field(default="default", primary_key=True)
    # IANA timezone name (e.g. "Asia/Tehran"). Used to compute "today" so that
    # streaks flip at the user's local midnight, not UTC.
    timezone: str = Field(default="UTC")
