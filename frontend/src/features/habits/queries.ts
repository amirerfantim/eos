// React Query hooks for habits. The completion toggle is optimistic so the UI
// (check, streak, day ring) reacts instantly; the server response then
// reconciles the exact streak.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { api } from '../../api/client'
import type { Habit, HabitCreate, HabitUpdate } from '../../api/types'
import { todayISO } from '../../lib/date'

export const habitKeys = {
  all: ['habits'] as const,
}

export function useHabits() {
  return useQuery({ queryKey: habitKeys.all, queryFn: api.listHabits })
}

export function useCreateHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: HabitCreate) => api.createHabit(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: habitKeys.all }),
  })
}

export function useUpdateHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: HabitUpdate }) => api.updateHabit(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: habitKeys.all }),
  })
}

export function useDeleteHabit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteHabit(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: habitKeys.all })
      const prev = qc.getQueryData<Habit[]>(habitKeys.all)
      qc.setQueryData<Habit[]>(habitKeys.all, (old) => old?.filter((h) => h.id !== id) ?? [])
      return { prev }
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(habitKeys.all, ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: habitKeys.all }),
  })
}

/** Persist a new habit order (drag-reorder), optimistically. */
export function useReorderHabits() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => api.reorderHabits(ids),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: habitKeys.all })
      const prev = qc.getQueryData<Habit[]>(habitKeys.all)
      qc.setQueryData<Habit[]>(habitKeys.all, (old) => {
        if (!old) return old
        const byId = new Map(old.map((h) => [h.id, h]))
        return ids
          .map((id, i) => {
            const h = byId.get(id)
            return h ? { ...h, order: i } : null
          })
          .filter((h): h is Habit => h !== null)
      })
      return { prev }
    },
    onError: (_e, _ids, ctx) => {
      if (ctx?.prev) qc.setQueryData(habitKeys.all, ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: habitKeys.all }),
  })
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

/** Set today's absolute progress count for a habit (used by the +/- stepper).
 *
 * Returns `preview` (instant, cache-only) and `commit` (persists to the server).
 * The stepper calls `preview` on every tick — including while long-pressing —
 * so the UI counts up smoothly, then `commit`s the final value once on release.
 * This avoids firing (and racing) a request per tick during a rapid hold.
 */
export function useSetCount() {
  const qc = useQueryClient()

  const preview = useCallback(
    (habitId: string, count: number) => {
      qc.setQueryData<Habit[]>(habitKeys.all, (old) =>
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
    [qc],
  )

  const commit = useMutation({
    mutationFn: ({ habit, count }: { habit: Habit; count: number }) =>
      api.setCompletion(habit.id, todayISO(), clamp(count, 0, habit.target)),
    onMutate: async () => {
      // The preview already updated the cache; just stop an in-flight refetch
      // from clobbering it before the write lands.
      await qc.cancelQueries({ queryKey: habitKeys.all })
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: habitKeys.all })
      // Heatmap reads its own completions cache — refresh today's square too.
      qc.invalidateQueries({ queryKey: ['completions'] })
    },
  })

  return { preview, commit }
}
