// An iOS-style scroll wheel. A vertical scroll-snap list where the centered row
// is the selected value; a soft mask fades the edges and a highlight band marks
// the selection. Scroll is contained so it never drags the parent sheet.

import { useEffect, useRef } from 'react'

const ITEM_H = 40 // px per row
const PAD = ITEM_H * 2 // top/bottom padding so ends can center (5 rows visible)

interface Props<T> {
  values: T[]
  value: T
  onChange: (v: T) => void
  /** Render a value; defaults to its string form. */
  render?: (v: T, selected: boolean) => React.ReactNode
  className?: string
  ariaLabel?: string
}

export function WheelPicker<T extends string | number>({
  values,
  value,
  onChange,
  render,
  className,
  ariaLabel,
}: Props<T>) {
  const ref = useRef<HTMLDivElement>(null)
  const settleTimer = useRef<number | null>(null)
  const index = Math.max(0, values.indexOf(value))

  // Snap to the selected row when the value changes from outside (not mid-scroll).
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const target = index * ITEM_H
    if (Math.abs(el.scrollTop - target) > 1) {
      el.scrollTo({ top: target, behavior: 'auto' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    if (settleTimer.current !== null) clearTimeout(settleTimer.current)
    // Wait for scrolling to settle, then read the nearest row.
    settleTimer.current = window.setTimeout(() => {
      const i = Math.round(el.scrollTop / ITEM_H)
      const clamped = Math.min(values.length - 1, Math.max(0, i))
      const next = values[clamped]
      if (next !== value) {
        navigator.vibrate?.(4)
        onChange(next)
      }
    }, 90)
  }

  return (
    <div className={`relative ${className ?? ''}`} style={{ height: ITEM_H * 5 }}>
      {/* selection band */}
      <div
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-xl"
        style={{ height: ITEM_H, background: 'var(--surface-2)' }}
      />
      <div
        ref={ref}
        role="listbox"
        aria-label={ariaLabel}
        onScroll={onScroll}
        className="no-scrollbar relative h-full overflow-y-scroll"
        style={{
          scrollSnapType: 'y mandatory',
          overscrollBehavior: 'contain',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent, #000 32%, #000 68%, transparent)',
          maskImage:
            'linear-gradient(to bottom, transparent, #000 32%, #000 68%, transparent)',
        }}
      >
        <div style={{ height: PAD }} />
        {values.map((v, i) => {
          const selected = i === index
          return (
            <button
              key={String(v)}
              type="button"
              onClick={() => onChange(v)}
              className="flex w-full items-center justify-center transition-all"
              style={{
                height: ITEM_H,
                scrollSnapAlign: 'center',
                fontVariantNumeric: 'tabular-nums',
                fontSize: selected ? '1.4rem' : '1.05rem',
                fontWeight: selected ? 700 : 500,
                color: selected ? 'var(--ink)' : 'var(--ink-muted)',
                opacity: selected ? 1 : 0.55,
              }}
            >
              {render ? render(v, selected) : v}
            </button>
          )
        })}
        <div style={{ height: PAD }} />
      </div>
    </div>
  )
}
