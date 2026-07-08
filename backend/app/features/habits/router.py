"""HTTP routes for habits.

Every habit is returned as `HabitWithStats` (habit fields + computed streak
info) so the UI has everything it needs in one call.
"""

import datetime as dt

from fastapi import APIRouter, HTTPException, Query, status

from app.common.deps import SessionDep
from app.common.time import today_in
from app.features.habits import service, stats
from app.features.habits.schemas import (
    DaySummary,
    HabitCreate,
    HabitReorder,
    HabitUpdate,
    HabitWithStats,
)
from app.features.settings import service as settings_service
from app.models import Habit

router = APIRouter(prefix="/habits", tags=["habits"])


def _with_stats(
    habit: Habit, counts: dict[dt.date, int], today: dt.date
) -> HabitWithStats:
    """Combine a habit row with its computed streak/progress stats."""
    done_today, count_today, current, best = stats.compute_stats(
        counts, today, habit.target, habit.period
    )
    return HabitWithStats(
        **habit.model_dump(),
        done_today=done_today,
        count_today=count_today,
        current_streak=current,
        best_streak=best,
    )


async def _today(session: SessionDep) -> dt.date:
    """Resolve 'today' in the user's configured timezone."""
    app_settings = await settings_service.get_or_create(session)
    return today_in(app_settings.timezone)


@router.get("", response_model=list[HabitWithStats])
async def list_habits(
    session: SessionDep,
    on: dt.date | None = Query(
        default=None,
        description="Reckon stats as of this day (YYYY-MM-DD). Defaults to today.",
    ),
) -> list[HabitWithStats]:
    """List all habits with their stats, reckoned as of `on` (default today).

    Passing `on` lets the client time-travel: `count_today`/`done_today` and the
    streaks are all computed relative to that day, so the same habit list powers
    any date the user scrolls to.
    """
    reference = on or await _today(session)
    habits = await service.list_habits(session)
    grouped = await service.all_done_counts(session)
    return [_with_stats(h, grouped.get(h.id, {}), reference) for h in habits]


# Newest-first so the tightest window loads first; capped to keep it cheap.
_MAX_SUMMARY_DAYS = 400


@router.get("/summary", response_model=list[DaySummary])
async def day_summaries(
    session: SessionDep,
    from_: dt.date = Query(alias="from", description="First day (inclusive)."),
    to: dt.date = Query(description="Last day (inclusive)."),
) -> list[DaySummary]:
    """Per-day completion tally over [from, to] for the date-timeline rings.

    Computed in memory from a single completions query, so a whole window costs
    one round-trip regardless of how many days it spans.
    """
    if to < from_:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="`to` precedes `from`")
    if (to - from_).days + 1 > _MAX_SUMMARY_DAYS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"Range too wide (max {_MAX_SUMMARY_DAYS} days)",
        )

    habits = await service.list_habits(session)
    grouped = await service.all_done_counts(session)
    total = len(habits)

    out: list[DaySummary] = []
    day = from_
    while day <= to:
        done = sum(
            1
            for h in habits
            if stats.compute_stats(grouped.get(h.id, {}), day, h.target, h.period)[0]
        )
        out.append(DaySummary(date=day, done=done, total=total))
        day += dt.timedelta(days=1)
    return out


@router.post("", response_model=HabitWithStats, status_code=status.HTTP_201_CREATED)
async def create_habit(payload: HabitCreate, session: SessionDep) -> HabitWithStats:
    """Create a new habit (starts with no completions)."""
    today = await _today(session)
    habit = await service.create_habit(session, payload)
    return _with_stats(habit, {}, today)


@router.put("/reorder", response_model=list[HabitWithStats])
async def reorder_habits(
    payload: HabitReorder, session: SessionDep
) -> list[HabitWithStats]:
    """Persist a new display order, then return the full list in that order.

    Declared before ``/{habit_id}`` so the literal ``reorder`` path wins.
    """
    await service.reorder_habits(session, payload)
    return await list_habits(session)


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
    grouped = await service.all_done_counts(session)
    return _with_stats(updated, grouped.get(habit_id, {}), today)


@router.delete("/{habit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_habit(habit_id: str, session: SessionDep) -> None:
    """Delete a habit and all its completion history."""
    habit = await service.get_habit(session, habit_id)
    if habit is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Habit not found")
    await service.delete_habit(session, habit)
