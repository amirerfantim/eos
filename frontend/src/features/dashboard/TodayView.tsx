// The Today screen: greeting, day-progress ring, the habit list, and the add
// button. Owns the create/edit sheet and per-habit completion bursts.

import { AnimatePresence, Reorder, motion } from 'framer-motion'
import { CornerUpLeft, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Habit, HabitCreate } from '../../api/types'
import { ThemeToggle } from '../../components/ThemeToggle'
import { greeting, longDate, parseISO, todayISO } from '../../lib/date'
import { listContainer } from '../../lib/motion'
import { ProgressRing } from '../completions/ProgressRing'
import { AddHabitModal } from '../habits/AddHabitModal'
import { DateStrip } from './DateStrip'
import { EmptyState } from '../habits/EmptyState'
import { HabitCard } from '../habits/HabitCard'
import { HabitDetailView } from '../habits/HabitDetailView'
import {
  useCreateHabit,
  useDeleteHabit,
  useHabits,
  useReorderHabits,
  useSetCount,
  useUpdateHabit,
} from '../habits/queries'

export function TodayView() {
  // The day currently being viewed/edited. Defaults to today; the date strip
  // moves it into the past. Everything below reckons against this day.
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const isToday = selectedDate === todayISO()

  const { data: habits, isLoading, isError } = useHabits(selectedDate)
  const create = useCreateHabit()
  const update = useUpdateHabit()
  const remove = useDeleteHabit()
  const { preview, commit } = useSetCount(selectedDate)
  const reorder = useReorderHabits()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Habit | null>(null)
  const [detail, setDetail] = useState<Habit | null>(null)
  const [bursts, setBursts] = useState<Record<string, number>>({})

  // Delete is deferred: the card hides immediately and a toast offers Undo. The
  // real server delete only fires when the toast's timer expires.
  const [pendingDelete, setPendingDelete] = useState<Habit | null>(null)
  const deleteTimer = useRef<number | null>(null)

  const requestDelete = useCallback(
    (habit: Habit) => {
      // If a delete is already pending, commit it now before queuing the next.
      if (deleteTimer.current !== null) {
        clearTimeout(deleteTimer.current)
        setPendingDelete((prev) => {
          if (prev) remove.mutate(prev.id)
          return null
        })
      }
      setPendingDelete(habit)
      deleteTimer.current = window.setTimeout(() => {
        remove.mutate(habit.id)
        deleteTimer.current = null
        setPendingDelete(null)
      }, 4500)
    },
    [remove],
  )

  const undoDelete = useCallback(() => {
    if (deleteTimer.current !== null) clearTimeout(deleteTimer.current)
    deleteTimer.current = null
    setPendingDelete(null)
  }, [])

  // Don't let a queued delete fire after the view unmounts.
  useEffect(() => () => {
    if (deleteTimer.current !== null) clearTimeout(deleteTimer.current)
  }, [])

  // Keep the open detail view in sync with fresh habit data (streaks update).
  const detailHabit = detail ? (habits?.find((h) => h.id === detail.id) ?? null) : null

  // Drag-reorder is driven by a local id list so a drag reads instantly. It
  // resets to the server order only when the *set* of habits changes (add /
  // delete) — a plain streak refetch keeps the user's in-progress order.
  const [orderIds, setOrderIds] = useState<string[]>([])
  useEffect(() => {
    if (!habits) return
    const serverIds = [...habits].sort((a, b) => a.order - b.order).map((h) => h.id)
    setOrderIds((prev) => {
      const sameSet =
        prev.length === serverIds.length && prev.every((id) => serverIds.includes(id))
      return sameSet ? prev : serverIds
    })
  }, [habits])

  const orderedHabits = useMemo(
    () =>
      orderIds
        .map((id) => habits?.find((h) => h.id === id))
        .filter((h): h is Habit => Boolean(h))
        // Hide a habit that's mid-undo so it appears gone until the toast lapses.
        .filter((h) => h.id !== pendingDelete?.id),
    [orderIds, habits, pendingDelete],
  )

  const doneCount = orderedHabits.filter((h) => h.done_today).length
  const total = orderedHabits.length
  const progress = total > 0 ? doneCount / total : 0

  // Persist on drop; a ref keeps the callback reading the latest order.
  const orderRef = useRef<string[]>([])
  orderRef.current = orderIds
  const commitOrder = () => reorder.mutate(orderRef.current)

  // `habit` is the value from the interaction's start, so count_today is the
  // pre-interaction count; `count` is where it settled.
  const handleCommit = (habit: Habit, count: number) => {
    // Spark when this interaction tips the habit into "done" for the period.
    if (habit.count_today < habit.target && count >= habit.target) {
      setBursts((b) => ({ ...b, [habit.id]: (b[habit.id] ?? 0) + 1 }))
    }
    commit.mutate({ habit, count })
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
    <div className="mx-auto min-h-full w-full max-w-md px-5 pb-48 pt-8">
      {/* header */}
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl leading-tight tracking-tight text-balance">
            {isToday ? greeting() : parseISO(selectedDate).toLocaleDateString(undefined, { weekday: 'long' })}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="nums text-sm text-muted">{longDate(parseISO(selectedDate))}</span>
            <AnimatePresence>
              {!isToday && (
                <motion.button
                  key="jump"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  onClick={() => setSelectedDate(todayISO())}
                  className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold text-accent"
                  style={{ borderColor: 'var(--line)' }}
                >
                  <CornerUpLeft size={12} strokeWidth={2.5} />
                  Today
                </motion.button>
              )}
            </AnimatePresence>
          </div>
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
          <Reorder.Group
            as="div"
            axis="y"
            values={orderIds}
            onReorder={setOrderIds}
            variants={listContainer}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-3"
          >
            <AnimatePresence>
              {orderedHabits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  burst={bursts[habit.id] ?? 0}
                  onPreview={preview}
                  onCommit={handleCommit}
                  onEdit={openEdit}
                  onDelete={requestDelete}
                  onOpenDetail={setDetail}
                  onReorderCommit={commitOrder}
                />
              ))}
            </AnimatePresence>
          </Reorder.Group>
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
          className="accent-gradient fixed bottom-[108px] left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full px-6 py-3.5 font-semibold"
          style={{ color: 'var(--btn-ink)', boxShadow: '0 14px 34px -10px var(--accent)' }}
        >
          <Plus size={18} strokeWidth={2.5} />
          New habit
        </motion.button>
      )}

      {/* date timeline — docked at the bottom, travels the whole screen in time */}
      {total > 0 && (
        <div
          className="fixed inset-x-0 bottom-0 z-30"
          style={{
            borderTop: '1px solid var(--line)',
            background: 'color-mix(in srgb, var(--surface) 85%, transparent)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
          }}
        >
          <div className="mx-auto max-w-md px-2 pb-[max(8px,env(safe-area-inset-bottom))]">
            <DateStrip selected={selectedDate} onSelect={setSelectedDate} />
          </div>
        </div>
      )}

      <AddHabitModal
        open={modalOpen}
        editing={editing}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />

      <HabitDetailView
        habit={detailHabit}
        onClose={() => setDetail(null)}
        onEdit={(h) => {
          setDetail(null)
          openEdit(h)
        }}
        onDelete={(h) => {
          setDetail(null)
          requestDelete(h)
        }}
      />

      {/* undo toast — appears after a delete, restores the habit if tapped */}
      <AnimatePresence>
        {pendingDelete && (
          <motion.div
            key={pendingDelete.id}
            initial={{ y: 24, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="fixed bottom-[116px] left-1/2 z-50 flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col overflow-hidden rounded-2xl border"
            style={{ background: 'var(--surface)', borderColor: 'var(--line)', boxShadow: 'var(--shadow)' }}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <span
                className="grid h-8 w-8 flex-none place-items-center rounded-full"
                style={{ background: 'color-mix(in srgb, #fb7185 20%, var(--surface))', color: '#fb7185' }}
              >
                <Trash2 size={15} />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">
                Deleted <b className="font-semibold">{pendingDelete.name}</b>
              </span>
              <button
                onClick={undoDelete}
                className="flex flex-none items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-accent transition-colors hover:bg-line/60"
              >
                <RotateCcw size={14} />
                Undo
              </button>
            </div>
            {/* countdown bar — empties over the undo window */}
            <motion.span
              className="block h-0.5 accent-gradient"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 4.5, ease: 'linear' }}
            />
          </motion.div>
        )}
      </AnimatePresence>
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
