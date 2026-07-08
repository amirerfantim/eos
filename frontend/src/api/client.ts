// Thin typed fetch wrapper around the Eos REST API.
// Base URL comes from VITE_API_URL; in dev it defaults to '/api/v1', which the
// Vite dev server proxies to the backend (see vite.config.ts).

import type { AppSettings, Habit, HabitCreate, HabitUpdate } from './types'

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
    const detail = await res.text().catch(() => res.statusText)
    throw new ApiError(res.status, detail || res.statusText)
  }
  // 204 No Content
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  listHabits: () => request<Habit[]>('/habits'),

  createHabit: (data: HabitCreate) =>
    request<Habit>('/habits', { method: 'POST', body: JSON.stringify(data) }),

  updateHabit: (id: string, data: HabitUpdate) =>
    request<Habit>(`/habits/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteHabit: (id: string) =>
    request<void>(`/habits/${id}`, { method: 'DELETE' }),

  reorderHabits: (ids: string[]) =>
    request<Habit[]>('/habits/reorder', { method: 'PUT', body: JSON.stringify({ ids }) }),

  markCompletion: (habitId: string, date: string) =>
    request<void>(`/habits/${habitId}/completions/${date}`, { method: 'PUT' }),

  unmarkCompletion: (habitId: string, date: string) =>
    request<void>(`/habits/${habitId}/completions/${date}`, { method: 'DELETE' }),

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
