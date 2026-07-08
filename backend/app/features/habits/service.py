"""Business logic for habits.

The list endpoint enriches each habit with streak stats. To avoid an N+1 query,
`all_done_dates` loads every completion in a single query and groups them in
memory, keyed by habit id.
"""

import datetime as dt
from collections import defaultdict

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.habits.schemas import HabitCreate, HabitReorder, HabitUpdate
from app.models import Completion, Habit


async def list_habits(session: AsyncSession) -> list[Habit]:
    """Return all habits in display order."""
    result = await session.execute(
        select(Habit).order_by(Habit.order, Habit.created_at)
    )
    return list(result.scalars().all())


async def get_habit(session: AsyncSession, habit_id: str) -> Habit | None:
    """Return one habit by id, or None if it doesn't exist."""
    return await session.get(Habit, habit_id)


async def all_done_dates(session: AsyncSession) -> dict[str, set[dt.date]]:
    """Load every completion once, grouped as {habit_id: {dates...}}.

    Single query — keeps the habit-list endpoint O(1) queries regardless of how
    many habits exist.
    """
    result = await session.execute(select(Completion.habit_id, Completion.date))
    grouped: dict[str, set[dt.date]] = defaultdict(set)
    for habit_id, date in result.all():
        grouped[habit_id].add(date)
    return grouped


async def create_habit(session: AsyncSession, data: HabitCreate) -> Habit:
    """Create a habit, appending it after existing ones (max order + 1)."""
    max_order = await session.scalar(select(func.max(Habit.order)))
    habit = Habit(**data.model_dump(), order=(max_order or 0) + 1)
    session.add(habit)
    await session.commit()
    await session.refresh(habit)
    return habit


async def update_habit(
    session: AsyncSession, habit: Habit, data: HabitUpdate
) -> Habit:
    """Apply a partial update to an existing habit."""
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(habit, field, value)
    session.add(habit)
    await session.commit()
    await session.refresh(habit)
    return habit


async def reorder_habits(session: AsyncSession, data: HabitReorder) -> None:
    """Persist a new display order: each habit's `order` becomes its list index.

    Ids not found are ignored; habits absent from the list keep their old order
    (they simply sort after the reordered ones on the next fetch).
    """
    result = await session.execute(select(Habit).where(Habit.id.in_(data.ids)))
    by_id = {h.id: h for h in result.scalars().all()}
    for index, habit_id in enumerate(data.ids):
        habit = by_id.get(habit_id)
        if habit is not None:
            habit.order = index
    await session.commit()


async def delete_habit(session: AsyncSession, habit: Habit) -> None:
    """Delete a habit (its completions cascade away)."""
    await session.delete(habit)
    await session.commit()
