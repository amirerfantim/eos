// Preset palette + icons offered when creating/editing a habit.

export const PRESET_COLORS = [
  '#8b5cf6', '#38bdf8', '#34d399', '#fb7185', '#f59e0b',
  '#a78bfa', '#22d3ee', '#f472b6', '#4ade80', '#facc15',
  '#60a5fa', '#f97316',
]

export const PRESET_ICONS = [
  '💧', '📖', '🏃', '🧘', '🌙', '🥗', '💪', '🧠',
  '✍️', '🎯', '☀️', '🎧', '💤', '🧹', '💰', '🚿',
]

/** Human goal label, e.g. "8 glasses per day" / "3 × per week". */
export function formatGoal(target: number, period: 'day' | 'week', unit: string | null): string {
  const noun = unit?.trim() || '×'
  return `${target} ${noun} per ${period}`
}
