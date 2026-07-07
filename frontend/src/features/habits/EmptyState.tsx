import { motion } from 'framer-motion'

export function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-4 rounded-[22px] border border-dashed px-6 py-14 text-center"
      style={{ borderColor: 'var(--line)' }}
    >
      <motion.div
        aria-hidden
        className="h-14 w-14 rounded-full accent-gradient"
        style={{ boxShadow: '0 0 40px -4px var(--accent)' }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div>
        <div className="font-display text-lg">No habits yet</div>
        <p className="mt-1 max-w-xs text-sm text-muted">
          Add your first habit and start keeping your light alive, one day at a time.
        </p>
      </div>
      <button
        onClick={onAdd}
        className="accent-gradient rounded-full px-5 py-2.5 text-sm font-semibold"
        style={{ color: 'var(--btn-ink)' }}
      >
        ＋ New habit
      </button>
    </motion.div>
  )
}
