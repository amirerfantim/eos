"""HTTP routes for habits.

Every habit is returned as `HabitWithStats` (habit fields + computed streak
info) so the UI has everything it needs in one call.
"""

import datetime as dt

from fastapi import APIRouter, HTTPException, status

from app.common.deps import SessionDep
from app.common.time import today_in
from app.features.habits import service, stats
from app.features.habits.schemas import HabitCreate, HabitUpdate, HabitWithStats
from app.features.settings import service as settings_service
from app.models import Habit

router = APIRouter(prefix="/habits", tags=["habits"])


def _with_stats(
    habit: Habit, done_dates: set[dt.date], today: dt.date
) -> HabitWithStats:
    """Combine a habit row with its computed streak stats."""
    done_today, current, best = stats.compute_stats(done_dates, today)
    return HabitWithStats(
        **habit.model_dump(),
        done_today=done_today,
        current_streak=current,
        best_streak=best,
    )


async def _today(session: SessionDep) -> dt.date:
    """Resolve 'today' in the user's configured timezone."""
    app_settings = await settings_service.get_or_create(session)
    return today_in(app_settings.timezone)


@router.get("", response_model=list[HabitWithStats])
async def list_habits(session: SessionDep) -> list[HabitWithStats]:
    """List all habits with their current stats (single query for completions)."""
    today = await _today(session)
    habits = await service.list_habits(session)
    grouped = await service.all_done_dates(session)
    return [_with_stats(h, grouped.get(h.id, set()), today) for h in habits]


@router.post("", response_model=HabitWithStats, status_code=status.HTTP_201_CREATED)
async def create_habit(payload: HabitCreate, session: SessionDep) -> HabitWithStats:
    """Create a new habit (starts with no completions)."""
    today = await _today(session)
    habit = await service.create_habit(session, payload)
    return _with_stats(habit, set(), today)


@router.patch("/{habit_id}", response_model=HabitWithStats)
async def update_habit(
    habit_id: str, payload: HabitUpdate, session: SessionDep
) -> HabitWithStats:
    """Update a habit's editable fields."""
    habit = await service.get_habit(session, habit_id)
    if habit is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Habit not found")
    today = await _today(session)
    updated = await service.update_habit(session, habit, payload)
    grouped = await service.all_done_dates(session)
    return _with_stats(updated, grouped.get(habit_id, set()), today)


@router.delete("/{habit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_habit(habit_id: str, session: SessionDep) -> None:
    """Delete a habit and all its completion history."""
    habit = await service.get_habit(session, habit_id)
    if habit is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Habit not found")
    await service.delete_habit(session, habit)
