"""Business logic for habit completions (progress toward a day's goal)."""

import datetime as dt

from sqlalchemy import and_, delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Completion


async def set_count(
    session: AsyncSession, habit_id: str, day: dt.date, count: int
) -> int:
    """Set how many times a habit was done on `day` (absolute, idempotent).

    count <= 0 removes the row entirely (a day with no progress). Returns the
    stored count (0 if the row was removed). Relies on the (habit_id, date)
    unique constraint to stay a single row per day under concurrent writes.
    """
    if count <= 0:
        await session.execute(
            delete(Completion).where(
                and_(Completion.habit_id == habit_id, Completion.date == day)
            )
        )
        await session.commit()
        return 0

    existing = await session.scalar(
        select(Completion).where(
            and_(Completion.habit_id == habit_id, Completion.date == day)
        )
    )
    if existing is not None:
        existing.count = count
        session.add(existing)
        await session.commit()
        return count

    session.add(Completion(habit_id=habit_id, date=day, count=count))
    try:
        await session.commit()
    except IntegrityError:
        # A concurrent request inserted first — apply our count on top.
        await session.rollback()
        row = await session.scalar(
            select(Completion).where(
                and_(Completion.habit_id == habit_id, Completion.date == day)
            )
        )
        if row is not None:
            row.count = count
            session.add(row)
            await session.commit()
    return count


async def list_dates(
    session: AsyncSession,
    habit_id: str,
    date_from: dt.date | None = None,
    date_to: dt.date | None = None,
) -> list[dt.date]:
    """Return dates a habit had any progress (for the contribution heatmap)."""
    query = select(Completion.date).where(Completion.habit_id == habit_id)
    if date_from is not None:
        query = query.where(Completion.date >= date_from)
    if date_to is not None:
        query = query.where(Completion.date <= date_to)
    query = query.order_by(Completion.date)
    result = await session.execute(query)
    return list(result.scalars().all())
