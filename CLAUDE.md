# Eos — Project Guide

Habit tracker: website + installable PWA. Show up daily, keep your light alive.
Theme: **dawn / ember glow** (sunrise gradients, glowing cards, growing-light streaks).

## Conventions
- **Commits: NEVER mention Claude, AI, or co-authors.** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`). Subject ≤ 50 chars, imperative.
- Frontend and backend are **separate**. Feature-modular: a new domain = a new `features/<x>` folder on both ends, no cross-cutting edits.
- Async everywhere on backend.

## Design
Theme: **Graphite Mono** — minimal/premium, near-black graphite ground, electric-violet accent, dark default, wow motion. Full tokens + motion spec → `docs/design.md`.

## Stack (why → `docs/architecture.md`)
- **Frontend**: React + Vite + TS, Tailwind, Framer Motion, TanStack Query, vite-plugin-pwa.
- **Backend**: FastAPI, SQLModel + Alembic, PostgreSQL. Async (asyncpg).
- **Infra**: Docker Compose — `db`, `backend`, `frontend`.

## Commands
- Dev up: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build`
- API docs (Swagger): http://localhost:8000/docs
- New migration: `docker compose run --rm backend alembic revision --autogenerate -m "msg"`
- Migrations apply automatically on backend start (`alembic upgrade head`).

## Layout
- `backend/app/{core,models,features,common}` — config/db, tables, domain modules, shared deps.
- `frontend/src/{features,components,views,api,lib}` — (added in frontend phase).
- Docs: `docs/architecture.md` (stack + why), `docs/api.md` (endpoints).

## Status
**v1 done + verified in browser.** Full stack runs in Docker:
- Backend: habits/completions/settings, streaks, health/ready, Alembic migrations.
- Frontend: Today view — create/edit/delete habits, tap-to-complete (optimistic + spark/ring animation), streaks, day-progress ring, dark/light theme, PWA. Graphite Mono design.
Verified: create → complete → streak → theme → persistence all work against the live API.
Next candidates: habit detail + contribution heatmap, reorder, reminders, cloud deploy. Current truth = git log + `docs/api.md`.

## Frontend notes
- Feature-modular under `src/features/{habits,completions,dashboard,settings}`; shared `src/lib` (theme, motion, date), `src/api` (typed client + OpenAPI-generated types).
- Regenerate API types after backend changes: `pnpm --dir frontend exec openapi-typescript http://localhost:8000/openapi.json -o src/api/generated.ts`.
- Modal uses a portal to `document.body`. Theme persisted in `localStorage` (`eos-theme`), dark default.
