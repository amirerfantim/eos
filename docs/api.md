# API Reference

Base URL: `http://localhost:8000/api/v1`
Interactive docs: `http://localhost:8000/docs`

## Health
`GET /health` → `{ "status": "ok" }`

## Habits

### `GET /habits`
List all habits, each enriched with stats.
```json
[
  {
    "id": "a1b2...",
    "name": "Drink water",
    "color": "#f59e0b",
    "icon": "💧",
    "order": 0,
    "created_at": "2026-07-07T08:00:00",
    "done_today": true,
    "current_streak": 5,
    "best_streak": 12
  }
]
```

### `POST /habits`
Create a habit.
```json
// body
{ "name": "Read", "color": "#6366f1", "icon": "📖" }
```
→ `201` with `HabitWithStats`.

### `PATCH /habits/{id}`
Partial update. Any of: `name`, `color`, `icon`, `order`.
→ `200` with `HabitWithStats`. `404` if not found.

### `DELETE /habits/{id}`
→ `204`. Cascades to its completions. `404` if not found.

## Completions

### `PUT /habits/{id}/completions/{date}`
Mark done for a day. **Idempotent** — repeat calls are no-ops. `date` = `YYYY-MM-DD`.
→ `204`. `404` if habit missing. `400` if date malformed.

### `DELETE /habits/{id}/completions/{date}`
Unmark a day.
→ `204`.

### `GET /habits/{id}/completions?from=YYYY-MM-DD&to=YYYY-MM-DD`
Completed dates in range (for the heatmap). `from`/`to` optional.
→ `200` `["2026-07-01", "2026-07-03", ...]`
