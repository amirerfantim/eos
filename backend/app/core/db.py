"""Database engine and async session management.

Exposes a single async SQLAlchemy engine plus a `get_session` dependency that
FastAPI uses to hand a fresh `AsyncSession` to each request and close it after.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

# One engine per process, backed by a connection pool. `future=True` opts into
# SQLAlchemy 2.0 semantics.
engine = create_async_engine(settings.database_url, echo=False, future=True)

# Session factory. `expire_on_commit=False` keeps ORM objects usable after
# commit (so we can serialize them in the response without a re-query).
AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Yield a request-scoped async session, guaranteed to close afterwards."""
    async with AsyncSessionLocal() as session:
        yield session
