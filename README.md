# Eos ☀️

> *EE-oss* — Greek goddess of dawn, who rises every single day. A habit tracker about showing up daily and keeping your light alive.

Eos is a modern, responsive habit tracker with beautiful animations, available as a website and an installable PWA. Theme: **dawn / ember glow** — warm sunrise gradients, glowing habit cards, streaks that grow like light.

## Stack

**Frontend** — React + Vite + TypeScript, Tailwind CSS, Framer Motion (animations), TanStack Query (server state + optimistic updates), vite-plugin-pwa (installable + offline).

**Backend** — FastAPI (Python), SQLModel + Alembic (ORM + migrations), PostgreSQL.

**Infra** — Docker Compose runs frontend, backend, and database together on localhost.

## Getting started (local)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

- Frontend → http://localhost:5173
- Backend API docs → http://localhost:8000/docs

## Project layout

```
eos/
  frontend/   React PWA
  backend/    FastAPI service
  docker-compose.yml
```

## Roadmap

- **v1** (current): create/edit/delete habits, mark done daily, streaks, day-progress ring, contribution heatmap, dark/light theme, PWA.
- **Later**: reminders/notifications, cloud deploy + domain, offline sync, auth, custom schedules, stats.
