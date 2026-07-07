// Create/edit sheet. Centered dialog on desktop, bottom sheet on mobile.

import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Habit, HabitCreate } from '../../api/types'
import { overlay, sheet } from '../../lib/motion'
import { PRESET_COLORS, PRESET_ICONS } from './constants'

interface Props {
  open: boolean
  /** habit to edit, or null to create */
  editing: Habit | null
  onClose: () => void
  onSubmit: (data: HabitCreate) => void
}

export function AddHabitModal({ open, editing, onClose, onSubmit }: Props) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState(PRESET_ICONS[0])
  const [color, setColor] = useState(PRESET_COLORS[0])

  // Seed fields when opening.
  useEffect(() => {
    if (!open) return
    setName(editing?.name ?? '')
    setIcon(editing?.icon ?? PRESET_ICONS[0])
    setColor(editing?.color ?? PRESET_COLORS[0])
  }, [open, editing])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const canSave = name.trim().length > 0

  const submit = () => {
    if (!canSave) return
    onSubmit({ name: name.trim(), icon, color })
  }

  // Guard against a missing container (can happen during HMR hot-swaps).
  if (typeof document === 'undefined' || !document.body) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
          variants={overlay}
          initial="hidden"
          animate="show"
          exit="exit"
        >
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.66)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />
          <motion.div
            variants={sheet}
            className="relative w-full max-w-md rounded-t-[28px] border p-6 sm:rounded-[28px]"
            style={{ background: 'var(--surface)', borderColor: 'var(--line)', boxShadow: 'var(--shadow)' }}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-xl tracking-tight">
                {editing ? 'Edit habit' : 'New habit'}
              </h2>
              <button
                aria-label="Close"
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-line/60"
              >
                <X size={18} />
              </button>
            </div>

            {/* preview + name */}
            <div className="mb-5 flex items-center gap-3">
              <div
                className="grid h-12 w-12 flex-none place-items-center rounded-[14px] text-2xl"
                style={{
                  background: `color-mix(in srgb, ${color} 22%, var(--surface))`,
                  boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 34%, transparent)`,
                }}
              >
                {icon}
              </div>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="Habit name"
                maxLength={100}
                className="flex-1 rounded-xl border bg-transparent px-3.5 py-2.5 text-base outline-none focus:border-accent"
                style={{ borderColor: 'var(--line)' }}
              />
            </div>

            {/* icon picker */}
            <Label>Icon</Label>
            <div className="mb-5 grid grid-cols-8 gap-1.5">
              {PRESET_ICONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className="grid aspect-square place-items-center rounded-lg text-xl transition-transform hover:scale-110"
                  style={{
                    background: icon === ic ? 'var(--surface-2)' : 'transparent',
                    boxShadow: icon === ic ? 'inset 0 0 0 1.5px var(--accent)' : 'none',
                  }}
                >
                  {ic}
                </button>
              ))}
            </div>

            {/* color picker */}
            <Label>Color</Label>
            <div className="mb-6 flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={`color ${c}`}
                  className="h-8 w-8 rounded-full transition-transform hover:scale-110"
                  style={{
                    background: c,
                    boxShadow:
                      color === c
                        ? '0 0 0 2px var(--surface), 0 0 0 4px var(--accent)'
                        : 'none',
                  }}
                />
              ))}
            </div>

            <button
              onClick={submit}
              disabled={!canSave}
              className="accent-gradient w-full rounded-full py-3 font-semibold disabled:opacity-40"
              style={{ color: 'var(--btn-ink)' }}
            >
              {editing ? 'Save changes' : 'Create habit'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="nums mb-2 text-[0.66rem] uppercase tracking-[0.16em] text-muted">{children}</div>
  )
}
