// Thin typed fetch wrapper around the Eos REST API.
// Base URL comes from VITE_API_URL; in dev it defaults to '/api/v1', which the
// Vite dev server proxies to the backend (see vite.config.ts).

import type { AppSettings, DaySummary, Habit, HabitCreate, HabitUpdate } from './types'

const BASE = import.meta.env.VITE_API_URL ?? '/api/v1'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    let message = body || res.statusText
    // FastAPI error responses are `{"detail": "..."}` — surface that text, not
    // the raw JSON, so a form can show it directly to the user.
    try {
      const parsed = JSON.parse(body) as { detail?: unknown }
      if (typeof parsed.detail === 'string') message = parsed.detail
    } catch {
      // not JSON — fall back to the raw body/status text above
    }
    throw new ApiError(res.status, message)
  }
  // 204 No Content
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  /** List habits with stats. `on` (YYYY-MM-DD) time-travels to a past day. */
  listHabits: (on?: string) =>
    request<Habit[]>(`/habits${on ? `?on=${on}` : ''}`),

  /** Per-day completion tallies over [from, to] — powers the date strip rings. */
  listDaySummaries: (from: string, to: string) =>
    request<DaySummary[]>(`/habits/summary?from=${from}&to=${to}`),

  createHabit: (data: HabitCreate) =>
    request<Habit>('/habits', { method: 'POST', body: JSON.stringify(data) }),

  updateHabit: (id: string, data: HabitUpdate) =>
    request<Habit>(`/habits/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteHabit: (id: string) =>
    request<void>(`/habits/${id}`, { method: 'DELETE' }),

  reorderHabits: (ids: string[]) =>
    request<Habit[]>('/habits/reorder', { method: 'PUT', body: JSON.stringify({ ids }) }),

  /** Set a day's progress count (0 clears the day). */
  setCompletion: (habitId: string, date: string, count: number) =>
    request<void>(`/habits/${habitId}/completions/${date}`, {
      method: 'PUT',
      body: JSON.stringify({ count }),
    }),

  listCompletions: (habitId: string, from?: string, to?: string) => {
    const q = new URLSearchParams()
    if (from) q.set('from', from)
    if (to) q.set('to', to)
    const qs = q.toString()
    return request<string[]>(`/habits/${habitId}/completions${qs ? `?${qs}` : ''}`)
  },

  getSettings: () => request<AppSettings>('/settings'),

  updateSettings: (data: Partial<AppSettings>) =>
    request<AppSettings>('/settings', { method: 'PATCH', body: JSON.stringify(data) }),
}
