// Shared Framer Motion presets so animation feel stays consistent.

import type { Variants } from 'framer-motion'

export const spring = { type: 'spring', stiffness: 420, damping: 30 } as const
export const softSpring = { type: 'spring', stiffness: 260, damping: 26 } as const

// Staggered list entrance.
export const listContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
}

export const listItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: softSpring },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18 } },
}

// Modal / bottom-sheet.
export const overlay: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
  exit: { opacity: 0 },
}

export const sheet: Variants = {
  hidden: { opacity: 0, y: 40, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: softSpring },
  exit: { opacity: 0, y: 24, scale: 0.98, transition: { duration: 0.16 } },
}
