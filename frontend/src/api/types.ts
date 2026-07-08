// Shared API types. Mirror the backend schemas (see docs/api.md). The full
// OpenAPI-generated types live in ./generated.ts; these are the hand-picked
// shapes the UI works with directly.

export type GoalPeriod = 'day' | 'week'

export interface Habit {
  id: string
  name: string
  color: string
  icon: string
  order: number
  created_at: string
  /** Goal: do it `target` times per `period`. `unit` labels the count. */
  target: number
  period: GoalPeriod
  unit: string | null
  done_today: boolean // current period's target met
  count_today: number // progress within the current period
  current_streak: number
  best_streak: number
}

export interface HabitCreate {
  name: string
  color: string
  icon: string
  target: number
  period: GoalPeriod
  unit: string | null
}

export interface HabitUpdate {
  name?: string
  color?: string
  icon?: string
  target?: number
  period?: GoalPeriod
  unit?: string | null
  order?: number
}

export interface AppSettings {
  timezone: string
}
