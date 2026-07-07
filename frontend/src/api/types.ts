// Shared API types. Mirror the backend schemas (see docs/api.md). The full
// OpenAPI-generated types live in ./generated.ts; these are the hand-picked
// shapes the UI works with directly.

export interface Habit {
  id: string
  name: string
  color: string
  icon: string
  order: number
  created_at: string
  done_today: boolean
  current_streak: number
  best_streak: number
}

export interface HabitCreate {
  name: string
  color: string
  icon: string
}

export interface HabitUpdate {
  name?: string
  color?: string
  icon?: string
  order?: number
}

export interface AppSettings {
  timezone: string
}
