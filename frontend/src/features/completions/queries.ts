// React Query hooks for a habit's completion history (detail view + heatmap).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { habitKeys } from '../habits/queries'

export const completionKeys = {
  range: (habitId: string, from: string, to: string) =>
    ['completions', habitId, from, to] as const,
}

/** Completed dates (as 'YYYY-MM-DD' strings) for a habit within [from, to]. */
export function useCompletions(habitId: string, from: string, to: string) {
  return useQuery({
    queryKey: completionKeys.range(habitId, from, to),
    queryFn: () => api.listCompletions(habitId, from, to),
  })
}

/** Toggle a specific day's completion (heatmap backfill), optimistic. */
export function useSetCompletion(habitId: string, from: string, to: string) {
  const qc = useQueryClient()
  const key = completionKeys.range(habitId, from, to)
  return useMutation({
    mutationFn: ({ date, done }: { date: string; done: boolean }) =>
      done ? api.markCompletion(habitId, date) : api.unmarkCompletion(habitId, date),
    onMutate: async ({ date, done }) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<string[]>(key)
      qc.setQueryData<string[]>(key, (old) => {
        const set = new Set(old ?? [])
        if (done) set.add(date)
        else set.delete(date)
        return [...set].sort()
      })
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key })
      qc.invalidateQueries({ queryKey: habitKeys.all }) // streak may change
    },
  })
}
