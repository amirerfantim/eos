// A single habit row: icon, name, streak, and the completion check. Tap the row
// to toggle today; the kebab menu edits or deletes.

import { AnimatePresence, motion } from 'framer-motion'
import { Flame, MoreHorizontal, Pencil, Sparkles, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Habit } from '../../api/types'
import { listItem } from '../../lib/motion'
import { HabitCheck } from './HabitCheck'

interface Props {
  habit: Habit
  burst: number
  onToggle: (habit: Habit) => void
  onEdit: (habit: Habit) => void
  onDelete: (habit: Habit) => void
}

export function HabitCard({ habit, burst, onToggle, onEdit, onDelete }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <motion.div
      variants={listItem}
      layout
      className="relative flex cursor-pointer items-center gap-3.5 rounded-[20px] border p-3.5 transition-colors"
      style={{
        background: 'var(--surface-2)',
        borderColor: habit.done_today
          ? 'color-mix(in srgb, var(--accent) 45%, var(--line))'
          : 'var(--line)',
        boxShadow: habit.done_today ? '0 14px 34px -18px var(--accent)' : 'none',
      }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onToggle(habit)}
      role="button"
      aria-pressed={habit.done_today}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle(habit)
        }
      }}
    >
      {/* icon chip */}
      <div
        className="grid h-11 w-11 flex-none place-items-center rounded-[13px] text-xl"
        style={{
          background: `color-mix(in srgb, ${habit.color} 20%, var(--surface))`,
          boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${habit.color} 32%, transparent)`,
        }}
      >
        {habit.icon}
      </div>

      {/* name + streak */}
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold tracking-tight">{habit.name}</div>
        <div className="nums mt-0.5 flex items-center gap-1.5 text-[0.78rem] text-muted">
          {habit.current_streak > 0 ? (
            <>
              <Flame size={13} className="text-accent" />
              <span>
                {habit.current_streak} day{habit.current_streak === 1 ? '' : 's'}
              </span>
              {habit.best_streak > habit.current_streak && (
                <span className="opacity-60">· best {habit.best_streak}</span>
              )}
            </>
          ) : (
            <>
              <Sparkles size={13} />
              <span>start today</span>
            </>
          )}
        </div>
      </div>

      {/* kebab */}
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        <button
          aria-label="Habit options"
          className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-line/60"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <MoreHorizontal size={18} />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <>
              <button
                aria-hidden
                tabIndex={-1}
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setMenuOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.14 }}
                className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-xl border py-1 shadow-xl"
                style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
              >
                <MenuItem
                  icon={<Pencil size={15} />}
                  label="Edit"
                  onClick={() => {
                    setMenuOpen(false)
                    onEdit(habit)
                  }}
                />
                <MenuItem
                  icon={<Trash2 size={15} />}
                  label="Delete"
                  danger
                  onClick={() => {
                    setMenuOpen(false)
                    onDelete(habit)
                  }}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* check */}
      <div onClick={(e) => e.stopPropagation()} className="flex-none">
        <button
          aria-label={habit.done_today ? 'Mark not done' : 'Mark done'}
          onClick={() => onToggle(habit)}
        >
          <HabitCheck done={habit.done_today} burst={burst} />
        </button>
      </div>
    </motion.div>
  )
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-line/50"
      style={danger ? { color: '#fb7185' } : undefined}
    >
      {icon}
      {label}
    </button>
  )
}
