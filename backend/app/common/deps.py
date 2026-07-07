"""Shared FastAPI dependencies.

`SessionDep` is an annotated type alias so routers can declare a DB session with
`session: SessionDep` instead of repeating `Depends(get_session)` everywhere.
"""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session

SessionDep = Annotated[AsyncSession, Depends(get_session)]
