// React Query hooks for habits. The completion stepper is optimistic so the UI
// (fill, streak, day ring) reacts instantly; the server response then
// reconciles the exact streak.
//
// Habit lists are keyed by the *day being viewed* (`['habits', 'YYYY-MM-DD']`),
// so the date timeline can travel back in time: each day is its own cache
// entry, all under the `['habits']` prefix. Mutations that change the habit set
// (delete, reorder) therefore update every cached day, not just today's.

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { useCallback } from 'react'
import { api } from '../../api/client'
import type { DaySummary, Habit, HabitCreate, HabitUpdate } from '../../api/types'
import { todayISO } from '../../lib/date'

export const habitKeys = {
  all: ['habits'] as const,
  on: (day: string) => ['habits', day] as const,
}

/** List habits with stats reckoned as of `on` (defaults to today). */
export function useHabits(on?: string) {
  const day = on ?? todayISO()
  return useQuery({
    queryKey: habitKeys.on(day),
    queryFn: () => api.listHabits(on),
  })
}

/** Per-day completion tallies for the date strip rings. */
export function useDaySummaries(from: string, to: string) {
  return useQuery({
    queryKey: ['day-summary', from, to] as const,
    queryFn: () => api.listDaySummaries(from, to),
  })
}

export function useCreateHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: HabitCreate) => api.createHabit(data),
    onSuccess: () => invalidateHabits(qc),
  })
}

export function useUpdateHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: HabitUpdate }) => api.updateHabit(id, data),
    onSuccess: () => {
      invalidateHabits(qc)
      // A start-date change (or any edit) can shift which days a habit counts
      // toward — and can delete completions outright (see habits.service
      // .update_habit) — so the date-strip rings and the habit's own heatmap
      // both need a fresh pull too.
      qc.invalidateQueries({ queryKey: ['day-summary'] })
      qc.invalidateQueries({ queryKey: ['completions'] })
    },
  })
}

export function useDeleteHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteHabit(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: habitKeys.all })
      // Snapshot + drop the habit from every cached day.
      const prev = qc.getQueriesData<Habit[]>({ queryKey: habitKeys.all })
      qc.setQueriesData<Habit[]>({ queryKey: habitKeys.all }, (old) =>
        old?.filter((h) => h.id !== id) ?? old,
      )
      return { prev }
    },
    onError: (_e, _id, ctx) => restore(qc, ctx?.prev),
    onSettled: () => invalidateHabits(qc),
  })
}

/** Persist a new habit order (drag-reorder), optimistically across all days. */
export function useReorderHabits() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => api.reorderHabits(ids),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: habitKeys.all })
      const prev = qc.getQueriesData<Habit[]>({ queryKey: habitKeys.all })
      const rank = new Map(ids.map((id, i) => [id, i]))
      qc.setQueriesData<Habit[]>({ queryKey: habitKeys.all }, (old) => {
        if (!old) return old
        return old
          .map((h) => (rank.has(h.id) ? { ...h, order: rank.get(h.id)! } : h))
          .sort((a, b) => a.order - b.order)
      })
      return { prev }
    },
    onError: (_e, _ids, ctx) => restore(qc, ctx?.prev),
    onSettled: () => invalidateHabits(qc),
  })
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** Set a habit's progress count for the day `on` (used by the +/- stepper).
 *
 * Returns `preview` (instant, cache-only) and `commit` (persists to the server).
 * The stepper calls `preview` on every tick — including while long-pressing —
 * so the UI counts smoothly, then `commit`s the final value once on release.
 * This avoids firing (and racing) a request per tick during a rapid hold.
 */
export function useSetCount(on: string) {
  const qc = useQueryClient()

  const preview = useCallback(
    (habitId: string, count: number) => {
      qc.setQueryData<Habit[]>(habitKeys.on(on), (old) =>
        old?.map((h) => {
          if (h.id !== habitId) return h
          const next = clamp(count, 0, h.target)
          const wasMet = h.done_today
          const nowMet = next >= h.target
          let current = h.current_streak
          let best = h.best_streak
          if (!wasMet && nowMet) {
            current += 1
            best = Math.max(best, current)
          } else if (wasMet && !nowMet) {
            current = Math.max(0, current - 1)
          }
          return { ...h, count_today: next, done_today: nowMet, current_streak: current, best_streak: best }
        }) ?? [],
      )
    },
    [qc, on],
  )

  const commit = useMutation({
    mutationFn: ({ habit, count }: { habit: Habit; count: number }) =>
      api.setCompletion(habit.id, on, clamp(count, 0, habit.target)),
    onMutate: async () => {
      // The preview already updated the cache; just stop an in-flight refetch
      // from clobbering it before the write lands.
      await qc.cancelQueries({ queryKey: habitKeys.on(on) })
    },
    onSettled: () => {
      invalidateHabits(qc)
      // Heatmap + strip rings read their own caches — refresh them too.
      qc.invalidateQueries({ queryKey: ['completions'] })
      qc.invalidateQueries({ queryKey: ['day-summary'] })
    },
  })

  return { preview, commit }
}

// --- shared helpers ---------------------------------------------------------

/** Invalidate every day's habit cache (prefix match on `['habits']`). */
function invalidateHabits(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: habitKeys.all })
}

/** Roll back an optimistic multi-day update from a getQueriesData snapshot. */
function restore(qc: QueryClient, prev?: [readonly unknown[], Habit[] | undefined][]) {
  prev?.forEach(([key, data]) => qc.setQueryData(key, data))
}

export type { DaySummary }
