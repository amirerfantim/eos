// The date timeline docked under the Today list. Each day is a mini progress
// ring showing how many habits were met that day; tapping one travels the whole
// screen to that day. The strip scrolls infinitely into the past — older weeks
// load lazily as you scroll left — and never shows the future.

import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { addDays, isoDate, parseISO, todayISO } from '../../lib/date'
import { useDaySummaries } from '../habits/queries'

const WEEK = 7
const INITIAL_WEEKS = 4 // days visible before any lazy load
const LOAD_STEP_WEEKS = 4 // how many more weeks each lazy load pulls in
const LOAD_THRESHOLD_PX = 56 // scroll-left distance that triggers a load

interface Props {
  /** currently viewed day, 'YYYY-MM-DD' */
  selected: string
  onSelect: (iso: string) => void
}

export function DateStrip({ selected, onSelect }: Props) {
  const today = todayISO()
  const reduce = useReducedMotion()

  // Earliest day rendered; grows (further into the past) as the user scrolls.
  const [start, setStart] = useState(() => isoDate(addDays(parseISO(today), -(INITIAL_WEEKS * WEEK - 1))))

  const days = useMemo(() => {
    const out: string[] = []
    let d = parseISO(start)
    const end = parseISO(today)
    while (d <= end) {
      out.push(isoDate(d))
      d = addDays(d, 1)
    }
    return out
  }, [start, today])

  const { data: summaries } = useDaySummaries(start, today)
  const byDate = useMemo(() => {
    const m = new Map<string, { done: number; total: number }>()
    summaries?.forEach((s) => m.set(s.date, { done: s.done, total: s.total }))
    return m
  }, [summaries])

  const scRef = useRef<HTMLDivElement>(null)
  // When we prepend older days, keep the viewport visually still by restoring
  // the distance-from-right after the new content lands.
  const anchorFromRight = useRef<number | null>(null)

  // Start pinned to today (right edge).
  useEffect(() => {
    const el = scRef.current
    if (el) el.scrollLeft = el.scrollWidth
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useLayoutEffect(() => {
    const el = scRef.current
    if (el && anchorFromRight.current != null) {
      el.scrollLeft = el.scrollWidth - anchorFromRight.current
      anchorFromRight.current = null
    }
  }, [start])

  const onScroll = () => {
    const el = scRef.current
    if (!el) return
    if (el.scrollLeft < LOAD_THRESHOLD_PX && anchorFromRight.current == null) {
      anchorFromRight.current = el.scrollWidth - el.scrollLeft
      setStart((s) => isoDate(addDays(parseISO(s), -(LOAD_STEP_WEEKS * WEEK))))
    }
  }

  return (
    <div
      ref={scRef}
      onScroll={onScroll}
      className="no-scrollbar flex items-end gap-1.5 overflow-x-auto px-[42%] py-2"
      style={{ scrollSnapType: 'x proximity' }}
      role="tablist"
      aria-label="Pick a day"
    >
      {/* One gradient shared by every ring (self-contained, unique id). */}
      <svg width="0" height="0" aria-hidden className="absolute">
        <defs>
          <linearGradient id="stripRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--accent-2)" />
            <stop offset="1" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
      </svg>
      {days.map((iso) => {
        const s = byDate.get(iso)
        const total = s?.total ?? 0
        const done = s?.done ?? 0
        const frac = total > 0 ? done / total : 0
        return (
          <DayCell
            key={iso}
            iso={iso}
            frac={frac}
            complete={total > 0 && done >= total}
            isToday={iso === today}
            selected={iso === selected}
            reduce={!!reduce}
            onSelect={onSelect}
          />
        )
      })}
    </div>
  )
}

interface CellProps {
  iso: string
  frac: number
  complete: boolean
  isToday: boolean
  selected: boolean
  reduce: boolean
  onSelect: (iso: string) => void
}

function DayCell({ iso, frac, complete, isToday, selected, reduce, onSelect }: CellProps) {
  const d = parseISO(iso)
  const dow = d.toLocaleDateString(undefined, { weekday: 'short' }).slice(0, 3)
  const num = d.getDate()

  const size = 34
  const stroke = 3
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - frac)

  return (
    <button
      role="tab"
      aria-selected={selected}
      onClick={() => onSelect(iso)}
      className="flex flex-none flex-col items-center gap-1.5 rounded-2xl px-1.5 py-1 outline-none"
      style={{ width: 46, scrollSnapAlign: 'center' }}
    >
      <span
        className="nums text-[10px] uppercase tracking-wide transition-colors"
        style={{ color: selected ? 'var(--accent-2)' : 'var(--ink-muted)' }}
      >
        {dow}
      </span>

      <motion.span
        className="relative grid place-items-center"
        initial={false}
        animate={{ scale: selected ? 1.12 : 1 }}
        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 26 }}
        style={{
          width: size,
          height: size,
          filter: selected ? 'drop-shadow(0 0 8px var(--halo))' : 'none',
        }}
      >
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={complete ? '#34d399' : 'url(#stripRingGrad)'}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={false}
            animate={{ strokeDashoffset: offset }}
            transition={reduce ? { duration: 0 } : { duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          />
        </svg>
        <span
          className="nums absolute text-[12px] font-semibold"
          style={{ color: selected ? 'var(--ink)' : 'var(--ink-muted)' }}
        >
          {num}
        </span>
      </motion.span>

      {/* today marker (hidden when today is the selected day — the ring glow says it) */}
      <span
        className="h-1 w-1 rounded-full transition-opacity"
        style={{
          background: 'var(--accent)',
          opacity: isToday && !selected ? 1 : 0,
          boxShadow: '0 0 6px var(--accent)',
        }}
      />
    </button>
  )
}
