// Create/edit sheet. Centered dialog on desktop, bottom sheet on mobile.

import emojiData from '@emoji-mart/data'
import EmojiPicker from '@emoji-mart/react'
import { AnimatePresence, motion } from 'framer-motion'
import { Smile, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { GoalPeriod, Habit, HabitCreate } from '../../api/types'
import { WheelPicker } from '../../components/WheelPicker'
import { overlay, sheet } from '../../lib/motion'
import { PRESET_COLORS, PRESET_ICONS, formatGoal } from './constants'

// Goal amounts offered on the wheel.
const TARGET_VALUES = Array.from({ length: 99 }, (_, i) => i + 1)

// Match the emoji-mart picker to the Graphite Mono dark surface. These CSS vars
// inherit into the picker's shadow DOM (custom properties pierce shadow roots).
const pickerVars = {
  '--rgb-background': '30 30 34',
  '--rgb-input': '11 11 13',
  '--rgb-color': '237 237 240',
  '--rgb-accent': '139 92 246',
} as React.CSSProperties

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
  const [target, setTarget] = useState(1)
  const [period, setPeriod] = useState<GoalPeriod>('day')
  const [unit, setUnit] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

  // Seed fields when opening.
  useEffect(() => {
    if (!open) return
    setName(editing?.name ?? '')
    setIcon(editing?.icon ?? PRESET_ICONS[0])
    setColor(editing?.color ?? PRESET_COLORS[0])
    setTarget(editing?.target ?? 1)
    setPeriod(editing?.period ?? 'day')
    setUnit(editing?.unit ?? '')
    setPickerOpen(false)
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
    onSubmit({ name: name.trim(), icon, color, target, period, unit: unit.trim() || null })
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
            className="relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-[28px] border p-6 sm:rounded-[28px]"
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="Habit name"
                maxLength={100}
                className="flex-1 rounded-xl border bg-transparent px-3.5 py-2.5 text-base outline-none focus:border-accent"
                style={{ borderColor: 'var(--line)' }}
              />
            </div>

            {/* icon picker — quick presets + full searchable picker */}
            <Label>Icon</Label>
            <div className="mb-2 grid grid-cols-8 gap-1.5">
              {PRESET_ICONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className="grid aspect-square place-items-center rounded-lg text-xl transition-transform hover:scale-110"
                  style={{
                    background: icon === ic ? 'var(--surface-2)' : 'transparent',
                    boxShadow: icon === ic ? `inset 0 0 0 1.5px ${color}` : 'none',
                  }}
                >
                  {ic}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border py-2 text-sm text-muted transition-colors hover:text-ink"
              style={{ borderColor: 'var(--line)' }}
            >
              <Smile size={15} />
              {pickerOpen ? 'Close picker' : 'Browse all emojis…'}
            </button>
            <AnimatePresence initial={false}>
              {pickerOpen && (
                <motion.div
                  // Fade only — no height/size animation, so emoji-mart measures
                  // the real container width and lays out full-width (dynamicWidth).
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
                  // Force the emoji-mart host element to fill the width; on its
                  // own it shrinks to content (~188px). dynamicWidth then lays
                  // out columns to match the real width.
                  className="mb-5 w-full [&_em-emoji-picker]:!w-full"
                  style={pickerVars}
                >
                  <EmojiPicker
                    data={emojiData}
                    onEmojiSelect={(e: { native: string }) => {
                      setIcon(e.native)
                      setPickerOpen(false)
                    }}
                    theme="dark"
                    previewPosition="none"
                    skinTonePosition="search"
                    navPosition="top"
                    dynamicWidth
                    maxFrequentRows={1}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* color picker — presets + any custom color */}
            <Label>Color</Label>
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={`color ${c}`}
                  className="h-8 w-8 rounded-full transition-transform hover:scale-110"
                  style={{
                    background: c,
                    boxShadow:
                      color.toLowerCase() === c.toLowerCase()
                        ? `0 0 0 2px var(--surface), 0 0 0 4px ${c}`
                        : 'none',
                  }}
                />
              ))}
              {/* custom color — native wheel/hex; shows the picked color as its face */}
              <label
                className="relative grid h-8 w-8 cursor-pointer place-items-center rounded-full transition-transform hover:scale-110"
                title="Custom color"
                style={{
                  background: isCustom(color)
                    ? color
                    : 'conic-gradient(from 0deg, #fb7185, #f59e0b, #4ade80, #38bdf8, #a78bfa, #fb7185)',
                  boxShadow: isCustom(color)
                    ? `0 0 0 2px var(--surface), 0 0 0 4px ${color}`
                    : 'none',
                }}
              >
                <span className="text-[13px] font-bold leading-none text-white mix-blend-difference">
                  +
                </span>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Custom color"
                />
              </label>
            </div>

            {/* goal — how many times, over which period, in what unit */}
            <Label>Goal</Label>
            <div
              className="mb-6 rounded-2xl border p-3"
              style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}
            >
              <div className="flex items-stretch gap-3">
                <WheelPicker
                  values={TARGET_VALUES}
                  value={target}
                  onChange={setTarget}
                  ariaLabel="times per period"
                  className="flex-1"
                />
                {/* period toggle */}
                <div className="flex w-24 flex-none flex-col justify-center gap-2">
                  {(['day', 'week'] as GoalPeriod[]).map((p) => {
                    const active = period === p
                    return (
                      <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className="rounded-xl border py-2 text-sm font-medium capitalize transition-colors"
                        style={{
                          borderColor: active ? color : 'var(--line)',
                          background: active
                            ? `color-mix(in srgb, ${color} 20%, var(--surface))`
                            : 'transparent',
                          color: active ? 'var(--ink)' : 'var(--ink-muted)',
                        }}
                      >
                        per {p}
                      </button>
                    )
                  })}
                </div>
              </div>
              {/* custom unit */}
              <div className="mt-3 flex items-center gap-3">
                <span className="nums text-[0.66rem] uppercase tracking-[0.16em] text-muted">
                  Unit
                </span>
                <input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="times"
                  maxLength={24}
                  className="flex-1 rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
                  style={{ borderColor: 'var(--line)' }}
                />
              </div>
              {/* live summary */}
              <div className="mt-3 text-center text-sm text-muted">
                <span style={{ color }}>{icon}</span> {formatGoal(target, period, unit.trim() || null)}
              </div>
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

/** True when the color isn't one of the presets (i.e. a custom-picked hex). */
function isCustom(color: string): boolean {
  return !PRESET_COLORS.some((c) => c.toLowerCase() === color.toLowerCase())
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="nums mb-2 text-[0.66rem] uppercase tracking-[0.16em] text-muted">{children}</div>
  )
}
