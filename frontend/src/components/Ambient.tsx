// Subtle drifting glow behind the app — atmosphere, not decoration overload.
// Stills automatically under prefers-reduced-motion (see index.css).

import { motion } from 'framer-motion'

export function Ambient() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '55vw',
          height: '55vw',
          left: '50%',
          top: '-20%',
          transform: 'translateX(-50%)',
          background: 'radial-gradient(circle, var(--halo), transparent 62%)',
          filter: 'blur(60px)',
        }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '40vw',
          height: '40vw',
          right: '-8%',
          top: '30%',
          background: 'radial-gradient(circle, var(--halo), transparent 65%)',
          filter: 'blur(70px)',
        }}
        animate={{ x: [0, -30, 0], y: [0, 20, 0], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}
