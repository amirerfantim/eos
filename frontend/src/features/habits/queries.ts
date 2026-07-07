// React Query hooks for habits. The completion toggle is optimistic so the UI
// (check, streak, day ring) reacts instantly; the server response then
// reconciles the exact streak.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

/** Toggle today's completion for a habit, optimistically. */
export function useToggleCompletion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (habit: Habit) => {
      const date = todayISO()
      return habit.done_today
        ? api.unmarkCompletion(habit.id, date)
        : api.markCompletion(habit.id, date)
    },
    onMutate: async (habit) => {
      await qc.cancelQueries({ queryKey: habitKeys.all })
      const prev = qc.getQueryData<Habit[]>(habitKeys.all)
      qc.setQueryData<Habit[]>(habitKeys.all, (old) =>
        old?.map((h) => {
          if (h.id !== habit.id) return h
          const nowDone = !h.done_today
          return {
            ...h,
            done_today: nowDone,
            current_streak: Math.max(0, h.current_streak + (nowDone ? 1 : -1)),
            best_streak: nowDone
              ? Math.max(h.best_streak, h.current_streak + 1)
              : h.best_streak,
          }
        }) ?? [],
      )
      return { prev }
    },
    onError: (_e, _habit, ctx) => {
      if (ctx?.prev) qc.setQueryData(habitKeys.all, ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: habitKeys.all }),
  })
}
