// GitHub-style contribution grid. Columns = weeks (Sun–Sat), newest on the
// right. Completed days glow with the accent; past cells are tappable to
// backfill; future cells are inert.

import { motion } from 'framer-motion'
import { addDays, isoDate, prettyDate, startOfWeek } from '../../lib/date'

interface Props {
  doneSet: Set<string>
  today: Date
  weeks?: number
  onToggle: (date: string, done: boolean) => void
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const CELL = 13
const GAP = 3

export function Heatmap({ doneSet, today, weeks = 18, onToggle }: Props) {
  const lastWeekStart = startOfWeek(today)
  const firstWeekStart = addDays(lastWeekStart, -(weeks - 1) * 7)
  const todayStr = isoDate(today)

  // Build [week][day] date matrix.
  const columns = Array.from({ length: weeks }, (_, w) => {
    const weekStart = addDays(firstWeekStart, w * 7)
    return Array.from({ length: 7 }, (_, d) => addDays(weekStart, d))
  })

  // Month label per column when the month changes (based on that week's Sunday).
  const monthLabels = columns.map((col, i) => {
    const m = col[0].getMonth()
    const prev = i > 0 ? columns[i - 1][0].getMonth() : -1
    return m !== prev ? MONTHS[m] : ''
  })

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col gap-1.5" style={{ minWidth: 'min-content' }}>
        {/* month row */}
        <div className="flex" style={{ gap: GAP, paddingLeft: 22 }}>
          {monthLabels.map((label, i) => (
            <div
              key={i}
              className="nums text-[0.6rem] text-muted"
              style={{ width: CELL, overflow: 'visible', whiteSpace: 'nowrap' }}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="flex" style={{ gap: GAP }}>
          {/* weekday labels */}
          <div className="flex flex-col justify-between pr-1" style={{ gap: GAP }}>
            {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => (
              <div
                key={i}
                className="nums text-[0.55rem] leading-none text-muted"
                style={{ height: CELL, lineHeight: `${CELL}px` }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* week columns */}
          {columns.map((col, w) => (
            <div key={w} className="flex flex-col" style={{ gap: GAP }}>
              {col.map((date) => {
                const iso = isoDate(date)
                const future = iso > todayStr
                const done = doneSet.has(iso)
                return (
                  <motion.button
                    key={iso}
                    aria-label={`${prettyDate(date)}${done ? ' — done' : ''}`}
                    title={`${prettyDate(date)}${done ? ' · done' : ''}`}
                    disabled={future}
                    onClick={() => !future && onToggle(iso, !done)}
                    whileHover={future ? undefined : { scale: 1.25 }}
                    whileTap={future ? undefined : { scale: 0.9 }}
                    className="rounded-[3px]"
                    style={{
                      width: CELL,
                      height: CELL,
                      cursor: future ? 'default' : 'pointer',
                      background: done
                        ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
                        : 'var(--surface-2)',
                      boxShadow: done
                        ? '0 0 8px -1px var(--accent)'
                        : 'inset 0 0 0 1px var(--line)',
                      opacity: future ? 0.25 : 1,
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>

        {/* legend */}
        <div className="nums mt-1 flex items-center gap-2 text-[0.6rem] text-muted" style={{ paddingLeft: 22 }}>
          <span>Not done</span>
          <span className="rounded-[3px]" style={{ width: CELL, height: CELL, background: 'var(--surface-2)', boxShadow: 'inset 0 0 0 1px var(--line)' }} />
          <span className="rounded-[3px]" style={{ width: CELL, height: CELL, background: 'linear-gradient(135deg, var(--accent), var(--accent-2))' }} />
          <span>Done · tap a day to edit</span>
        </div>
      </div>
    </div>
  )
}
