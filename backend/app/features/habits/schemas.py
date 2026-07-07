"""API schemas for the habits feature.

Separate from the `Habit` table model so the wire format can evolve
independently of storage (e.g. computed stats fields that aren't columns).
"""

import datetime as dt

from pydantic import Field
from sqlmodel import SQLModel


class HabitBase(SQLModel):
    """Fields common to create and update."""

    name: str = Field(min_length=1, max_length=100)
    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")  # hex color
    icon: str = Field(min_length=1, max_length=16)  # emoji


class HabitCreate(HabitBase):
    """Payload to create a habit."""


class HabitUpdate(SQLModel):
    """Partial update — every field optional; only provided ones change."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
    icon: str | None = Field(default=None, min_length=1, max_length=16)
    order: int | None = None


class HabitWithStats(HabitBase):
    """A habit enriched with computed progress stats for the UI."""

    id: str
    order: int
    created_at: dt.datetime
    done_today: bool
    current_streak: int
    best_streak: int
