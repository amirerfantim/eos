// A single habit row. Tap toggles today; long-press the grip handle lifts it
// to reorder; swipe left reveals an action drawer (Detail / Edit / Delete).
// The visible surface is a foreground layer that slides on the x-axis over
// the actions behind it.
//
// Reorder is handle-only (not long-press-anywhere) because touch-action is
// fixed for a touch at the moment it starts — on iOS Safari there is no way
// to hand a vertical touch that began as "maybe a drag" back to native
// scroll, or vice versa, mid-gesture. Restricting the drag trigger to a
// small always-none-touch-action handle keeps the rest of the card free for
// native, no-JS-in-the-way scrolling.

import { Reorder, animate, motion, useDragControls, useMotionValue, useTransform } from 'framer-motion'
import { BarChart3, Flame, GripVertical, History, Minus, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import type { Habit } from '../../api/types'
import { dateOnly } from '../../lib/date'
import { reorderItem } from '../../lib/motion'
import { HabitCheck } from './HabitCheck'
import { LiquidProgress } from './LiquidProgress'

interface Props {
  habit: Habit
  /** the day this card is being shown for ('YYYY-MM-DD') */
  selectedDate: string
  burst: number
  /** Instantly reflect a new count in the UI (cache-only, no request). */
  onPreview: (habitId: string, count: number) => void
  /** Persist the final count once an interaction ends. */
  onCommit: (habit: Habit, count: number) => void
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
  selectedDate,
  burst,
  onPreview,
  onCommit,
  onEdit,
  onDelete,
  onOpenDetail,
  onReorderCommit,
}: Props) {
  // Counted goals (target > 1) show a liquid fill + stepper; target = 1 keeps
  // the classic binary check that toggles done/undone.
  const counted = habit.target > 1
  const atMax = habit.count_today >= habit.target
  // Shown as a ghost on days before the habit began, so it can still be
  // backfilled — logging progress here moves the habit's start date back to
  // `selectedDate` (see completions.set_count) and it becomes a normal card.
  const notStarted = dateOnly(habit.created_at) > selectedDate

  // Running count during an interaction (a tap, or a long-press auto-repeat).
  // Re-synced to the live value at the start of each gesture; ticks advance it
  // locally so a rapid hold counts up correctly without waiting on the server.
  const pending = useRef(habit.count_today)
  const step = useCallback(
    (dir: number) => {
      const next = Math.min(habit.target, Math.max(0, pending.current + dir))
      if (next === pending.current) return false // hit a bound — stop repeating
      pending.current = next
      onPreview(habit.id, next)
      return true
    },
    [habit.id, habit.target, onPreview],
  )
  const commitPending = useCallback(() => onCommit(habit, pending.current), [habit, onCommit])
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

  // The card body only ever does two things: swipe horizontally to reveal the
  // drawer, and tap to complete. Native vertical scroll is left entirely to
  // the browser (touch-action: pan-y, unset by JS) — see the grip handle
  // below for how reorder-drag is triggered instead.
  const controls = useDragControls()
  const pressStart = useRef<{ x: number; y: number } | null>(null)
  const swipeBase = useRef(0) // `x` value when the gesture began
  const swiping = useRef(false)
  const lastDragEnd = useRef(0)

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Buttons (icon, actions, check, drag handle) own their own gestures.
      if ((e.target as HTMLElement).closest('button')) return
      pressStart.current = { x: e.clientX, y: e.clientY }
      swipeBase.current = x.get()
      swiping.current = false
    },
    [x],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const start = pressStart.current
      if (!start) return
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      if (!swiping.current) {
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
          swiping.current = true // horizontal intent → begin swipe
        } else {
          return // vertical (or undecided) — leave it to native scroll
        }
      }
      // Drive the foreground, resisting past the open/closed limits (rubber-band).
      let nx = swipeBase.current + dx
      if (nx > 0) nx *= 0.2
      else if (nx < OPEN_X) nx = OPEN_X + (nx - OPEN_X) * 0.2
      x.set(nx)
    },
    [x],
  )

  const endGesture = useCallback(() => {
    if (swiping.current) {
      swiping.current = false
      lastDragEnd.current = Date.now()
      x.get() < OPEN_X * 0.4 ? openDrawer() : closeDrawer()
    }
    pressStart.current = null // origin no longer needed once the gesture ends
  }, [x, openDrawer, closeDrawer])

  // The drag handle: the only place a long-press lifts the card for reorder.
  // Its touch-action is 'none' from render (not toggled at runtime), so the
  // browser never has a scroll-vs-drag decision to make for a touch that
  // starts here — the ambiguity that broke things when it lived on the whole
  // card. Runs for mouse and touch alike, so the gesture is consistent
  // across devices.
  const handlePressTimer = useRef<number | null>(null)
  const handlePressStart = useRef<{ x: number; y: number } | null>(null)

  const onHandlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      handlePressStart.current = { x: e.clientX, y: e.clientY }
      const ev = e.nativeEvent
      handlePressTimer.current = window.setTimeout(() => {
        handlePressTimer.current = null
        navigator.vibrate?.(15)
        controls.start(ev)
      }, LONG_PRESS_MS)
    },
    [controls],
  )

  const onHandlePointerMove = useCallback((e: React.PointerEvent) => {
    const start = handlePressStart.current
    if (!start || handlePressTimer.current === null) return
    // A shaky tap shouldn't accidentally lift the card — only a still hold does.
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_CANCEL_PX) {
      clearTimeout(handlePressTimer.current)
      handlePressTimer.current = null
    }
  }, [])

  const endHandlePress = useCallback(() => {
    if (handlePressTimer.current !== null) {
      clearTimeout(handlePressTimer.current)
      handlePressTimer.current = null
    }
    handlePressStart.current = null
  }, [])

  // A gesture ends with a synthetic click; swallow the toggle right after one.
  const wasDrag = () => Date.now() - lastDragEnd.current < 250

  // A body tap adds one toward the goal (or toggles a binary habit).
  const bump = () => {
    if (counted) {
      pending.current = habit.count_today
      if (step(1)) commitPending()
    } else {
      const next = habit.done_today ? 0 : 1
      onPreview(habit.id, next)
      onCommit(habit, next)
    }
  }

  // Begin a stepper press: resync to the live count, then hand ticks to StepBtn.
  const beginStep = (dir: number) => {
    pending.current = habit.count_today
    return step(dir)
  }

  const handleSurfaceClick = () => {
    if (wasDrag()) return
    if (open) {
      closeDrawer() // first tap on an open card just closes the drawer
      return
    }
    if (counted && atMax) return // full — use the − to go back down
    bump()
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
          borderColor: notStarted
            ? 'color-mix(in srgb, var(--ink-muted) 45%, transparent)'
            : habit.done_today
              ? `color-mix(in srgb, ${habit.color} 55%, var(--line))`
              : 'var(--line)',
          borderStyle: notStarted ? 'dashed' : 'solid',
          // Native vertical scroll always — reorder-drag is triggered only
          // from the dedicated grip handle, never from the card body.
          touchAction: 'pan-y',
        }}
        animate={{ opacity: notStarted ? 0.62 : 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative z-10 flex select-none items-center gap-3.5 overflow-hidden rounded-[20px] border p-3.5 transition-[border-color,background-color]"
        onClick={handleSurfaceClick}
        role="button"
        aria-pressed={habit.done_today}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            bump()
          }
        }}
      >
        {/* liquid fill — rises bottom→top toward the goal (counted habits only) */}
        {counted && habit.count_today > 0 && (
          <>
            <LiquidProgress
              pct={habit.count_today / habit.target}
              color={habit.color}
              done={habit.done_today}
            />
            {/* legibility scrim — darkens under the text zones (left + right) so
                the icon/name/number read cleanly, while the water stays bright in
                the middle. Sits between the water (z-0) and the content (z-10). */}
            <div
              className="pointer-events-none absolute inset-0 z-[1]"
              style={{
                background:
                  'linear-gradient(90deg, rgba(9,9,11,0.58) 0%, rgba(9,9,11,0.14) 24%, rgba(9,9,11,0.10) 60%, rgba(9,9,11,0.62) 100%)',
              }}
            />
          </>
        )}

        {/* grip handle — the only place a long-press lifts the card to reorder
            (see the top-of-file comment for why it's not the whole card) */}
        <button
          aria-label={`Reorder ${habit.name}`}
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={endHandlePress}
          onPointerCancel={endHandlePress}
          onPointerLeave={endHandlePress}
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
          className="relative z-10 -ml-1 flex h-11 w-6 flex-none touch-none select-none items-center justify-center text-muted transition-colors hover:text-ink"
          style={{ cursor: dragging ? 'grabbing' : 'grab' }}
        >
          <GripVertical size={16} />
        </button>

        {/* icon chip — shortcut to details; pulses gently when not-yet-started to
            invite a tap that backfills it into this day */}
        <div className="relative z-10 h-11 w-11 flex-none">
          {notStarted && (
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-[13px]"
              style={{ background: habit.color, filter: 'blur(7px)' }}
              animate={{ opacity: [0.15, 0.5, 0.15], scale: [1, 1.15, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <button
            aria-label={`${habit.name} details`}
            onClick={(e) => {
              e.stopPropagation()
              onOpenDetail(habit)
            }}
            className="relative grid h-11 w-11 place-items-center rounded-[13px] text-xl transition-transform hover:scale-105"
            style={{
              background: `color-mix(in srgb, ${habit.color} 20%, var(--surface))`,
              boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${habit.color} 32%, transparent)`,
            }}
          >
            {habit.icon}
          </button>
        </div>

        {/* name + streak */}
        <div
          className="relative z-10 min-w-0 flex-1"
          style={counted ? { textShadow: '0 1px 3px rgba(0,0,0,0.6)' } : undefined}
        >
          <div className="truncate font-semibold tracking-tight">{habit.name}</div>
          <div className="nums mt-0.5 flex items-center gap-1.5 text-[0.78rem] text-muted">
            {notStarted ? (
              <>
                <History size={13} />
                <span className="truncate">tap to start here</span>
              </>
            ) : habit.current_streak > 0 ? (
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

        {/* completion control */}
        {counted ? (
          <div onClick={(e) => e.stopPropagation()} className="relative z-10 flex flex-none items-center gap-1.5">
            <StepBtn
              aria-label="One less"
              disabled={habit.count_today <= 0}
              color={habit.color}
              onStep={(first) => (first ? beginStep(-1) : step(-1))}
              onRelease={commitPending}
            >
              <Minus size={15} />
            </StepBtn>
            <div
              className="nums min-w-[3.2rem] text-center text-sm font-semibold tabular-nums"
              style={{
                color: habit.done_today ? habit.color : 'var(--ink)',
                textShadow: '0 1px 3px rgba(0,0,0,0.6)',
              }}
            >
              {habit.count_today}
              <span className="text-muted">/{habit.target}</span>
            </div>
            <StepBtn
              aria-label="One more"
              disabled={atMax}
              color={habit.color}
              filled
              onStep={(first) => (first ? beginStep(1) : step(1))}
              onRelease={commitPending}
            >
              <Plus size={15} />
            </StepBtn>
          </div>
        ) : (
          <div onClick={(e) => e.stopPropagation()} className="relative z-10 flex-none">
            <button
              aria-label={habit.done_today ? 'Mark not done' : 'Mark done'}
              onClick={bump}
            >
              <HabitCheck done={habit.done_today} burst={burst} color={habit.color} />
            </button>
          </div>
        )}
      </motion.div>
    </Reorder.Item>
  )
}

// Hold-to-repeat timing: first repeat after a short pause, then accelerating.
const HOLD_START_MS = 300
const HOLD_MIN_MS = 55
const HOLD_ACCEL = 0.8

/** A round +/− stepper. A tap steps once; pressing and holding auto-repeats,
 *  speeding up — so a goal of 20 is a hold, not twenty taps. */
function StepBtn({
  children,
  color,
  filled,
  disabled,
  onStep,
  onRelease,
  'aria-label': ariaLabel,
}: {
  children: React.ReactNode
  color: string
  filled?: boolean
  disabled?: boolean
  /** Apply one step; `first` marks the initial press. Returns false at a bound. */
  onStep: (first: boolean) => boolean
  /** Called once when the press ends — persist the settled value. */
  onRelease: () => void
  'aria-label': string
}) {
  const timer = useRef<number | undefined>(undefined)
  const delay = useRef(HOLD_START_MS)
  const active = useRef(false)

  const stop = useCallback(() => {
    if (timer.current !== undefined) {
      clearTimeout(timer.current)
      timer.current = undefined
    }
    if (active.current) {
      active.current = false
      onRelease()
    }
  }, [onRelease])

  const begin = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation() // don't trip the card's long-press/swipe handlers
      if (disabled) return
      active.current = true
      delay.current = HOLD_START_MS
      if (!onStep(true)) return // already at a bound; release still commits
      const tick = () => {
        if (!onStep(false)) {
          if (timer.current !== undefined) clearTimeout(timer.current)
          timer.current = undefined
          return
        }
        delay.current = Math.max(HOLD_MIN_MS, delay.current * HOLD_ACCEL)
        timer.current = window.setTimeout(tick, delay.current)
      }
      timer.current = window.setTimeout(tick, delay.current)
    },
    [disabled, onStep],
  )

  return (
    <motion.button
      aria-label={ariaLabel}
      disabled={disabled}
      onPointerDown={begin}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      whileTap={{ scale: 0.86 }}
      className="grid h-8 w-8 touch-none select-none place-items-center rounded-full transition-opacity disabled:opacity-30"
      style={{
        color: filled ? 'var(--btn-ink)' : color,
        background: filled ? color : `color-mix(in srgb, ${color} 16%, var(--surface))`,
        boxShadow: filled ? `0 6px 16px -6px ${color}` : `inset 0 0 0 1px color-mix(in srgb, ${color} 34%, transparent)`,
      }}
    >
      {children}
    </motion.button>
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
