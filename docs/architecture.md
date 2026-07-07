# Architecture

## Overview
Eos is a full-stack habit tracker split into two independent services plus a database, run together with Docker Compose. The frontend is a React PWA; the backend is a FastAPI JSON API; PostgreSQL stores the data.

```
Browser (PWA)  ──HTTP──▶  FastAPI backend  ──async SQL──▶  PostgreSQL
   React/Vite               /api/v1                 habits, completions
```

## Why each piece
| Layer | Tech | Why |
|-------|------|-----|
| UI framework | **React + Vite + TS** | Framer Motion is React-native; Vite = fast dev + best PWA tooling; TS = safety at scale. |
| Styling | **Tailwind CSS** | Fast, consistent, responsive utility styling. |
| Animation | **Framer Motion** | Top priority — springs, layout, gesture, enter/exit animations with minimal code. |
| Server state | **TanStack Query** | Caching + optimistic updates → UI reacts instantly, syncs in background. |
| PWA | **vite-plugin-pwa** | Installable + offline app-shell, auto service worker/manifest. |
| API | **FastAPI** | Async, auto OpenAPI docs, clean Python. |
| ORM | **SQLModel** | SQLAlchemy 2.0 + Pydantic unified; models double as schemas; low boilerplate. |
| Migrations | **Alembic** | Versioned, reversible DB schema changes; runs on container start. |
| DB | **PostgreSQL** | Relational fit (habit → many completions), indexed range/streak queries, cloud-ready. |
| Runtime | **Docker Compose** | One command runs all services; identical local → cloud. |

## Scale principle
Each domain is a self-contained **feature module**:
- Backend: `app/features/<domain>/{router,service,schemas}.py` — router (HTTP) → service (logic) → models (data).
- Frontend: `src/features/<domain>/` — components + query hooks.

Adding a feature = adding one module on each side. No shared files to untangle.

## Data model
- **Habit**: `id, name, color, icon, order, created_at`.
- **Completion**: `id, habit_id → Habit, date ('YYYY-MM-DD')`, unique per `(habit_id, date)`, indexed on `habit_id`.
- **Streak**: computed in backend (`features/habits/stats.py`) by walking consecutive `date`s back from today. `best_streak` = longest consecutive run ever.

## Request flow (mark habit done)
1. User taps card → React optimistically flips to "done" + animates (Framer Motion).
2. TanStack Query sends `PUT /api/v1/habits/{id}/completions/{date}`.
3. FastAPI router → completions service → insert row (idempotent) in Postgres.
4. Query invalidates/refetches → confirmed state (streak recomputed server-side).

## Migrations flow
`alembic revision --autogenerate` compares SQLModel metadata to DB → writes a migration file. Container entrypoint runs `alembic upgrade head` before uvicorn, so the DB schema is always current on boot.
