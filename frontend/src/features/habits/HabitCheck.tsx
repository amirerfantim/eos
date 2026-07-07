// The circular completion control. When it flips to done it springs, draws a
// checkmark, expands a ripple, and throws a short burst of accent sparks.

import { AnimatePresence, motion } from 'framer-motion'

const SPARKS = Array.from({ length: 9 }, (_, i) => {
  const angle = (Math.PI * 2 * i) / 9
  const dist = 22 + (i % 3) * 6
  return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, i }
})

const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface Props {
  done: boolean
  /** increments each time the habit is completed, to trigger the burst */
  burst: number
}

export function HabitCheck({ done, burst }: Props) {
  return (
    <div className="relative grid h-9 w-9 place-items-center">
      {/* ripple */}
      <AnimatePresence>
        {done && !prefersReduced && (
          <motion.span
            key={burst}
            className="absolute h-9 w-9 rounded-full"
            style={{ border: '2px solid var(--accent)' }}
            initial={{ scale: 0.6, opacity: 0.8 }}
            animate={{ scale: 2.4, opacity: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* sparks */}
      <AnimatePresence>
        {done && !prefersReduced && (
          <motion.div key={`s-${burst}`} className="pointer-events-none absolute inset-0">
            {SPARKS.map((s) => (
              <motion.span
                key={s.i}
                className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full"
                style={{ background: s.i % 2 ? 'var(--accent-2)' : 'var(--accent)' }}
                initial={{ x: '-50%', y: '-50%', opacity: 1, scale: 1 }}
                animate={{ x: `calc(-50% + ${s.x}px)`, y: `calc(-50% + ${s.y}px)`, opacity: 0, scale: 0.2 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* the button face */}
      <motion.div
        animate={done ? { scale: [1, 1.24, 1] } : { scale: 1 }}
        transition={{ duration: 0.42, ease: 'easeOut', times: [0, 0.4, 1] }}
        className="grid h-9 w-9 place-items-center rounded-full"
        style={
          done
            ? {
                backgroundImage: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                boxShadow: '0 0 18px -2px var(--accent)',
              }
            : { border: '2px solid color-mix(in srgb, var(--ink-muted) 45%, transparent)' }
        }
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <motion.path
            d="M5 13l4 4L19 7"
            stroke="var(--btn-ink)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={false}
            animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </svg>
      </motion.div>
    </div>
  )
}
