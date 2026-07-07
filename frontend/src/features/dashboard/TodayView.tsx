// The Today screen: greeting, day-progress ring, the habit list, and the add
// button. Owns the create/edit sheet and per-habit completion bursts.

import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { Habit, HabitCreate } from '../../api/types'
import { ThemeToggle } from '../../components/ThemeToggle'
import { greeting, longDate } from '../../lib/date'
import { listContainer } from '../../lib/motion'
import { ProgressRing } from '../completions/ProgressRing'
import { AddHabitModal } from '../habits/AddHabitModal'
import { EmptyState } from '../habits/EmptyState'
import { HabitCard } from '../habits/HabitCard'
import {
  useCreateHabit,
  useDeleteHabit,
  useHabits,
  useToggleCompletion,
  useUpdateHabit,
} from '../habits/queries'

export function TodayView() {
  const { data: habits, isLoading, isError } = useHabits()
  const create = useCreateHabit()
  const update = useUpdateHabit()
  const remove = useDeleteHabit()
  const toggle = useToggleCompletion()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Habit | null>(null)
  const [bursts, setBursts] = useState<Record<string, number>>({})

  const doneCount = habits?.filter((h) => h.done_today).length ?? 0
  const total = habits?.length ?? 0
  const progress = total > 0 ? doneCount / total : 0

  const sorted = useMemo(
    () => (habits ? [...habits].sort((a, b) => a.order - b.order) : []),
    [habits],
  )

  const handleToggle = (habit: Habit) => {
    if (!habit.done_today) {
      // becoming done — trigger the spark burst
      setBursts((b) => ({ ...b, [habit.id]: (b[habit.id] ?? 0) + 1 }))
    }
    toggle.mutate(habit)
  }

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (habit: Habit) => {
    setEditing(habit)
    setModalOpen(true)
  }

  const handleSubmit = (data: HabitCreate) => {
    if (editing) update.mutate({ id: editing.id, data })
    else create.mutate(data)
    setModalOpen(false)
  }

  return (
    <div className="mx-auto min-h-full w-full max-w-md px-5 pb-32 pt-8">
      {/* header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl leading-tight tracking-tight text-balance">
            {greeting()}
          </h1>
          <div className="nums mt-1 text-sm text-muted">{longDate()}</div>
        </div>
        <div className="flex items-center gap-3">
          {total > 0 && <ProgressRing value={progress} />}
          <ThemeToggle />
        </div>
      </header>

      {/* day summary */}
      {total > 0 && (
        <div className="mt-6 flex items-center gap-3 text-sm text-muted">
          <span className="nums">
            <b className="text-ink">{doneCount}</b> of <b className="text-ink">{total}</b> lit today
          </span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--line)' }}>
            <motion.span
              className="block h-full rounded-full accent-gradient"
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
            />
          </span>
        </div>
      )}

      {/* list */}
      <main className="mt-6">
        {isLoading && <SkeletonList />}
        {isError && (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted" style={{ borderColor: 'var(--line)' }}>
            Couldn’t reach the server. Is the backend running?
          </div>
        )}
        {!isLoading && !isError && total === 0 && <EmptyState onAdd={openCreate} />}
        {total > 0 && (
          <motion.div
            variants={listContainer}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-3"
          >
            <AnimatePresence>
              {sorted.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  burst={bursts[habit.id] ?? 0}
                  onToggle={handleToggle}
                  onEdit={openEdit}
                  onDelete={(h) => remove.mutate(h.id)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* FAB */}
      {total > 0 && (
        <motion.button
          onClick={openCreate}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.96 }}
          className="accent-gradient fixed bottom-7 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full px-6 py-3.5 font-semibold"
          style={{ color: 'var(--btn-ink)', boxShadow: '0 14px 34px -10px var(--accent)' }}
        >
          <Plus size={18} strokeWidth={2.5} />
          New habit
        </motion.button>
      )}

      <AddHabitModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

function SkeletonList() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-[74px] animate-pulse rounded-[20px]"
          style={{ background: 'var(--surface-2)' }}
        />
      ))}
    </div>
  )
}
