// A single habit row. Tap toggles today; long-press lifts it to reorder; swipe
// left reveals an action drawer (Detail / Edit / Delete). The visible surface is
// a foreground layer that slides on the x-axis over the actions behind it.

import { Reorder, animate, motion, useDragControls, useMotionValue, useTransform } from 'framer-motion'
import { BarChart3, Flame, Pencil, Sparkles, Trash2 } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import type { Habit } from '../../api/types'
import { reorderItem } from '../../lib/motion'
import { HabitCheck } from './HabitCheck'

interface Props {
  habit: Habit
  burst: number
  onToggle: (habit: Habit) => void
  onEdit: (habit: Habit) => void
  onDelete: (habit: Habit) => void
  onOpenDetail: (habit: Habit) => void
  /** Persist the current order once a drag settles. */
  onReorderCommit: () => void
}

// How long to hold before a card lifts for dragging, and how far a finger may
// drift in that window before we treat the gesture as a scroll/swipe instead.
const LONG_PRESS_MS = 220
const MOVE_CANCEL_PX = 10

// Swipe drawer geometry. Three actions, each ~58px wide.
const ACTION_W = 58
const DRAWER_W = ACTION_W * 3
const OPEN_X = -DRAWER_W
const snap = { type: 'spring', stiffness: 520, damping: 42 } as const

export function HabitCard({
  habit,
  burst,
  onToggle,
  onEdit,
  onDelete,
  onOpenDetail,
  onReorderCommit,
}: Props) {
  // Lifted-while-dragging glow. Driven by React state (not framer's whileDrag)
  // so a reorder re-render can't leave the box-shadow motion value stuck on.
  const [dragging, setDragging] = useState(false)

  // Swipe-to-reveal drawer. `x` is the gesture offset (0 closed → OPEN_X open).
  // The card surface stays put (so its icon/name never clip); instead the drawer
  // slides in from the right edge, derived from `x`.
  const x = useMotionValue(0)
  const drawerX = useTransform(x, (v) => Math.min(DRAWER_W, Math.max(0, DRAWER_W + v)))
  const [open, setOpen] = useState(false)
  const openDrawer = useCallback(() => {
    setOpen(true)
    animate(x, OPEN_X, snap)
    navigator.vibrate?.(8)
  }, [x])
  const closeDrawer = useCallback(() => {
    setOpen(false)
    animate(x, 0, snap)
  }, [x])

  // Gestures share one set of pointer handlers on the container:
  //  • hold still ~220ms  → lift for reorder (framer dragControls)
  //  • move horizontally  → swipe the foreground (we drive `x` by hand, because
  //    a nested framer `drag` gets swallowed by the Reorder drag context)
  //  • tap                → toggle complete
  const controls = useDragControls()
  const pressTimer = useRef<number | null>(null)
  const pressStart = useRef<{ x: number; y: number } | null>(null)
  const swipeBase = useRef(0) // `x` value when the gesture began
  const swiping = useRef(false)
  const reorderLifted = useRef(false)
  const lastDragEnd = useRef(0)

  // Cancels only the long-press timer. It must NOT clear `pressStart`, because an
  // in-progress swipe keeps reading it to compute the drag delta.
  const cancelPress = useCallback(() => {
    if (pressTimer.current !== null) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Buttons (icon, actions, check) own their own gestures — don't hijack.
      if ((e.target as HTMLElement).closest('button')) return
      pressStart.current = { x: e.clientX, y: e.clientY }
      swipeBase.current = x.get()
      swiping.current = false
      reorderLifted.current = false
      const ev = e.nativeEvent
      pressTimer.current = window.setTimeout(() => {
        pressTimer.current = null
        reorderLifted.current = true
        navigator.vibrate?.(15)
        controls.start(ev)
      }, LONG_PRESS_MS)
    },
    [controls, x],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const start = pressStart.current
      if (!start || reorderLifted.current) return
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      if (!swiping.current) {
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
          swiping.current = true // horizontal intent → begin swipe
          cancelPress()
        } else if (Math.abs(dy) > MOVE_CANCEL_PX) {
          cancelPress() // vertical drift with no hold → abandon
          return
        } else {
          return
        }
      }
      // Drive the foreground, resisting past the open/closed limits (rubber-band).
      let nx = swipeBase.current + dx
      if (nx > 0) nx *= 0.2
      else if (nx < OPEN_X) nx = OPEN_X + (nx - OPEN_X) * 0.2
      x.set(nx)
    },
    [cancelPress, x],
  )

  const endGesture = useCallback(() => {
    if (swiping.current) {
      swiping.current = false
      lastDragEnd.current = Date.now()
      x.get() < OPEN_X * 0.4 ? openDrawer() : closeDrawer()
    }
    reorderLifted.current = false
    pressStart.current = null // origin no longer needed once the gesture ends
    cancelPress()
  }, [cancelPress, x, openDrawer, closeDrawer])

  // A gesture ends with a synthetic click; swallow the toggle right after one.
  const wasDrag = () => Date.now() - lastDragEnd.current < 250

  const handleSurfaceClick = () => {
    if (wasDrag()) return
    if (open) {
      closeDrawer() // first tap on an open card just closes the drawer
      return
    }
    onToggle(habit)
  }

  return (
    <Reorder.Item
      value={habit.id}
      dragListener={false}
      dragControls={controls}
      variants={reorderItem}
      className="relative select-none overflow-hidden rounded-[20px]"
      style={{
        // Glow lives on the (non-sliding) container so it tracks the whole card:
        // colored lift-glow while reordering, a softer one when done.
        boxShadow: dragging
          ? `0 22px 44px -12px ${habit.color}`
          : habit.done_today
            ? `0 14px 34px -18px ${habit.color}`
            : 'none',
        transition: 'box-shadow 0.2s',
      }}
      whileDrag={{ scale: 1.03 }}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => {
        setDragging(false)
        reorderLifted.current = false
        lastDragEnd.current = Date.now()
        onReorderCommit()
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onPointerLeave={endGesture}
    >
      {/* action drawer — slides in from the right edge over the card */}
      <motion.div
        className="absolute inset-y-0 right-0 z-20 flex items-stretch rounded-r-[20px]"
        style={{
          width: DRAWER_W,
          x: drawerX,
          background: 'var(--surface-2)',
          boxShadow: '-10px 0 24px -10px rgba(0,0,0,0.55)',
        }}
      >
        <Action
          icon={<BarChart3 size={18} />}
          label="Detail"
          tint={habit.color}
          open={open}
          index={0}
          onClick={() => {
            closeDrawer()
            onOpenDetail(habit)
          }}
        />
        <Action
          icon={<Pencil size={18} />}
          label="Edit"
          tint="#38bdf8"
          open={open}
          index={1}
          onClick={() => {
            closeDrawer()
            onEdit(habit)
          }}
        />
        <Action
          icon={<Trash2 size={18} />}
          label="Delete"
          tint="#fb7185"
          open={open}
          index={2}
          onClick={() => onDelete(habit)}
        />
      </motion.div>

      {/* foreground surface — stays put; the drawer slides over its right edge */}
      <motion.div
        style={{
          cursor: dragging ? 'grabbing' : 'grab',
          background: 'var(--surface-2)',
          borderColor: habit.done_today
            ? `color-mix(in srgb, ${habit.color} 55%, var(--line))`
            : 'var(--line)',
        }}
        className="relative z-10 flex touch-none select-none items-center gap-3.5 rounded-[20px] border p-3.5 transition-[border-color,background-color]"
        onClick={handleSurfaceClick}
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
        {/* icon chip — shortcut to details */}
        <button
          aria-label={`${habit.name} details`}
          onClick={(e) => {
            e.stopPropagation()
            onOpenDetail(habit)
          }}
          className="grid h-11 w-11 flex-none place-items-center rounded-[13px] text-xl transition-transform hover:scale-105"
          style={{
            background: `color-mix(in srgb, ${habit.color} 20%, var(--surface))`,
            boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${habit.color} 32%, transparent)`,
          }}
        >
          {habit.icon}
        </button>

        {/* name + streak */}
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold tracking-tight">{habit.name}</div>
          <div className="nums mt-0.5 flex items-center gap-1.5 text-[0.78rem] text-muted">
            {habit.current_streak > 0 ? (
              <>
                <Flame size={13} style={{ color: habit.color }} />
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

        {/* check */}
        <div onClick={(e) => e.stopPropagation()} className="flex-none">
          <button
            aria-label={habit.done_today ? 'Mark not done' : 'Mark done'}
            onClick={() => onToggle(habit)}
          >
            <HabitCheck done={habit.done_today} burst={burst} color={habit.color} />
          </button>
        </div>
      </motion.div>
    </Reorder.Item>
  )
}

/** One button in the swipe drawer: a tinted icon chip that snaps in when open. */
function Action({
  icon,
  label,
  tint,
  onClick,
  open,
  index,
}: {
  icon: React.ReactNode
  label: string
  tint: string
  onClick: () => void
  open: boolean
  index: number
}) {
  return (
    <motion.button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="flex flex-1 flex-col items-center justify-center gap-1"
      style={{ color: tint }}
      initial={false}
      animate={open ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.4 }}
      transition={{ type: 'spring', stiffness: 520, damping: 26, delay: open ? index * 0.05 : 0 }}
      whileTap={{ scale: 0.88 }}
    >
      <span
        className="grid h-9 w-9 place-items-center rounded-full"
        style={{
          background: `color-mix(in srgb, ${tint} 22%, var(--surface))`,
          boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${tint} 40%, transparent)`,
        }}
      >
        {icon}
      </span>
      <span className="text-[0.6rem] font-medium tracking-wide">{label}</span>
    </motion.button>
  )
}
