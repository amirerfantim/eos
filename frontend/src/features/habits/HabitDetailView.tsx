// Full-screen habit detail: streak stats + a contribution heatmap you can tap
// to backfill past days. Slides up over the app.

import { AnimatePresence, motion } from 'framer-motion'
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Flame,
  Pencil,
  Trash2,
  Trophy,
} from 'lucide-react'
import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import type { Habit } from '../../api/types'
import { addDays, isoDate, todayISO } from '../../lib/date'
import { listContainer, listItem, overlay } from '../../lib/motion'
import { Heatmap } from '../completions/Heatmap'
import { useCompletions, useSetCompletion } from '../completions/queries'

interface Props {
  habit: Habit | null
  onClose: () => void
  onEdit: (habit: Habit) => void
  onDelete: (habit: Habit) => void
}

export function HabitDetailView({ habit, onClose, onEdit, onDelete }: Props) {
  useEffect(() => {
    if (!habit) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [habit, onClose])

  return createPortal(
    <AnimatePresence>{habit && <Sheet key={habit.id} habit={habit} onClose={onClose} onEdit={onEdit} onDelete={onDelete} />}</AnimatePresence>,
    document.body,
  )
}

function Sheet({ habit, onClose, onEdit, onDelete }: { habit: Habit } & Omit<Props, 'habit'>) {
  const today = new Date()
  const from = isoDate(addDays(today, -364))
  const to = todayISO()

  const { data: dates = [] } = useCompletions(habit.id, from, to)
  const setCompletion = useSetCompletion(habit.id, from, to, habit.target)
  const doneSet = new Set(dates)

  const total = dates.length
  const monthPrefix = to.slice(0, 7)
  const thisMonth = dates.filter((d) => d.startsWith(monthPrefix)).length

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex justify-center overflow-y-auto"
      variants={overlay}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 30, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative z-10 my-6 h-fit w-full max-w-md rounded-[28px] border p-6"
        style={{ background: 'var(--surface)', borderColor: 'var(--line)', boxShadow: 'var(--shadow)' }}
      >
        {/* header */}
        <div className="flex items-center gap-3">
          <button
            aria-label="Back"
            onClick={onClose}
            className="grid h-9 w-9 flex-none place-items-center rounded-full text-muted hover:bg-line/60"
          >
            <ChevronLeft size={20} />
          </button>
          <div
            className="grid h-11 w-11 flex-none place-items-center rounded-[13px] text-xl"
            style={{
              background: `color-mix(in srgb, ${habit.color} 20%, var(--surface))`,
              boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${habit.color} 32%, transparent)`,
            }}
          >
            {habit.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-xl tracking-tight">{habit.name}</div>
          </div>
          <button
            aria-label="Edit habit"
            onClick={() => onEdit(habit)}
            className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-line/60"
          >
            <Pencil size={17} />
          </button>
          <button
            aria-label="Delete habit"
            onClick={() => onDelete(habit)}
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-line/60"
            style={{ color: '#fb7185' }}
          >
            <Trash2 size={17} />
          </button>
        </div>

        {/* stats */}
        <motion.div variants={listContainer} initial="hidden" animate="show" className="mt-6 grid grid-cols-2 gap-3">
          <Stat icon={<Flame size={16} style={{ color: habit.color }} />} label="Current streak" value={`${habit.current_streak}`} unit={habit.current_streak === 1 ? 'day' : 'days'} />
          <Stat icon={<Trophy size={16} style={{ color: habit.color }} />} label="Best streak" value={`${habit.best_streak}`} unit={habit.best_streak === 1 ? 'day' : 'days'} />
          <Stat icon={<CheckCircle2 size={16} style={{ color: habit.color }} />} label="Total done" value={`${total}`} unit={total === 1 ? 'day' : 'days'} />
          <Stat icon={<CalendarDays size={16} style={{ color: habit.color }} />} label="This month" value={`${thisMonth}`} unit={thisMonth === 1 ? 'day' : 'days'} />
        </motion.div>

        {/* heatmap */}
        <div className="mt-7">
          <div className="nums mb-3 text-[0.66rem] uppercase tracking-[0.16em] text-muted">Activity</div>
          <Heatmap
            doneSet={doneSet}
            today={today}
            color={habit.color}
            onToggle={(date, done) => setCompletion.mutate({ date, done })}
          />
        </div>
      </motion.div>
    </motion.div>
  )
}

function Stat({ icon, label, value, unit }: { icon: React.ReactNode; label: string; value: string; unit: string }) {
  return (
    <motion.div
      variants={listItem}
      className="rounded-2xl border p-4"
      style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }}
    >
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-[0.72rem]">{label}</span>
      </div>
      <div className="nums mt-1.5 flex items-baseline gap-1">
        <span className="text-2xl font-semibold text-ink">{value}</span>
        <span className="text-[0.72rem] text-muted">{unit}</span>
      </div>
    </motion.div>
  )
}
