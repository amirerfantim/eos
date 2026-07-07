// Day-progress ring: the "sun rising" as habits get done. Fills the arc and
// counts the percentage up; a central disc grows/brightens with progress.

import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useEffect } from 'react'

interface Props {
  /** 0..1 completion for today */
  value: number
  size?: number
}

export function ProgressRing({ value, size = 68 }: Props) {
  const stroke = 7
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - value)

  const pct = useMotionValue(0)
  const rounded = useTransform(pct, (v) => `${Math.round(v)}%`)

  useEffect(() => {
    const controls = animate(pct, value * 100, { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] })
    return controls.stop
  }, [value, pct])

  const discR = 6 + value * (r - 12)

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--accent-2)" />
            <stop offset="1" stopColor="var(--accent)" />
          </linearGradient>
          <radialGradient id="discGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="var(--accent-2)" />
            <stop offset="1" stopColor="var(--accent)" />
          </radialGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          fill="url(#discGrad)"
          initial={false}
          animate={{ r: discR, opacity: 0.35 + value * 0.65 }}
          transition={{ duration: 0.6 }}
        />
      </svg>
      <motion.span className="nums absolute text-[0.8rem] font-semibold text-ink">
        {rounded}
      </motion.span>
    </div>
  )
}
