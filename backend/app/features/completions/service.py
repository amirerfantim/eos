"""Business logic for habit completions (marking days done/undone)."""

import datetime as dt

from sqlalchemy import and_, delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Completion


async def mark(session: AsyncSession, habit_id: str, day: dt.date) -> None:
    """Mark a habit done for a day. Idempotent — repeat calls are no-ops.

    Relies on the (habit_id, date) unique constraint: if a concurrent request
    inserts first, the IntegrityError is swallowed so the end state is the same.
    """
    session.add(Completion(habit_id=habit_id, date=day))
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()  # already marked — that's fine


async def unmark(session: AsyncSession, habit_id: str, day: dt.date) -> None:
    """Remove a habit's completion for a day. No-op if it wasn't marked."""
    await session.execute(
        delete(Completion).where(
            and_(Completion.habit_id == habit_id, Completion.date == day)
        )
    )
    await session.commit()


async def list_dates(
    session: AsyncSession,
    habit_id: str,
    date_from: dt.date | None = None,
    date_to: dt.date | None = None,
) -> list[dt.date]:
    """Return completed dates for a habit, optionally bounded by [from, to]."""
    query = select(Completion.date).where(Completion.habit_id == habit_id)
    if date_from is not None:
        query = query.where(Completion.date >= date_from)
    if date_to is not None:
        query = query.where(Completion.date <= date_to)
    query = query.order_by(Completion.date)
    result = await session.execute(query)
    return list(result.scalars().all())
