"""HTTP routes for habit completions.

Nested under a habit: /habits/{habit_id}/completions/... The `date` path/query
params are typed as `datetime.date`, so FastAPI validates the YYYY-MM-DD format
automatically and returns 422 on malformed input.
"""

import datetime as dt

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.common.deps import SessionDep
from app.features.completions import service
from app.features.habits import service as habits_service

router = APIRouter(prefix="/habits/{habit_id}/completions", tags=["completions"])


class CompletionCount(BaseModel):
    """How many times the habit was done on the target day (0 clears the day)."""

    count: int = Field(ge=0, le=999)


async def _ensure_habit(session: SessionDep, habit_id: str) -> None:
    """Raise 404 if the habit doesn't exist."""
    if await habits_service.get_habit(session, habit_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Habit not found")


@router.get("", response_model=list[dt.date])
async def list_completions(
    habit_id: str,
    session: SessionDep,
    date_from: dt.date | None = Query(default=None, alias="from"),
    date_to: dt.date | None = Query(default=None, alias="to"),
) -> list[dt.date]:
    """List completed dates for a habit (for the contribution heatmap)."""
    await _ensure_habit(session, habit_id)
    return await service.list_dates(session, habit_id, date_from, date_to)


@router.put("/{day}", status_code=status.HTTP_204_NO_CONTENT)
async def set_completion(
    habit_id: str, day: dt.date, payload: CompletionCount, session: SessionDep
) -> None:
    """Set the habit's progress count for `day` (0 clears it). Idempotent."""
    await _ensure_habit(session, habit_id)
    await service.set_count(session, habit_id, day, payload.count)
