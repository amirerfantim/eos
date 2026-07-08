// A single habit row: icon, name, streak, and the completion check. Tap the row
// to toggle today; the kebab opens a portal menu (edits or deletes) that floats
// above every card and flips up/down to stay on-screen.

import { AnimatePresence, motion } from 'framer-motion'
import { Flame, MoreHorizontal, Pencil, Sparkles, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Habit } from '../../api/types'
import { listItem } from '../../lib/motion'
import { HabitCheck } from './HabitCheck'

interface Props {
  habit: Habit
  burst: number
  onToggle: (habit: Habit) => void
  onEdit: (habit: Habit) => void
  onDelete: (habit: Habit) => void
}

const MENU_W = 172
const MENU_H = 96

interface MenuPos {
  top: number
  left: number
  origin: 'top' | 'bottom'
}

export function HabitCard({ habit, burst, onToggle, onEdit, onDelete }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [menu, setMenu] = useState<MenuPos | null>(null)

  const openMenu = useCallback(() => {
    const el = btnRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const margin = 8
    const spaceBelow = window.innerHeight - r.bottom
    const openDown = spaceBelow > MENU_H + 16
    const top = openDown ? r.bottom + 6 : r.top - MENU_H - 6
    let left = r.right - MENU_W // right-align to the button
    left = Math.max(margin, Math.min(left, window.innerWidth - MENU_W - margin))
    setMenu({ top, left, origin: openDown ? 'top' : 'bottom' })
  }, [])

  const closeMenu = useCallback(() => setMenu(null), [])

  // Keep the menu anchored: close it if the page scrolls or resizes, and on Esc.
  useEffect(() => {
    if (!menu) return
    const onScroll = () => closeMenu()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeMenu()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('keydown', onKey)
    }
  }, [menu, closeMenu])

  return (
    <motion.div
      variants={listItem}
      layout
      className="relative flex cursor-pointer items-center gap-3.5 rounded-[20px] border p-3.5 transition-colors"
      style={{
        background: 'var(--surface-2)',
        borderColor: habit.done_today
          ? 'color-mix(in srgb, var(--accent) 45%, var(--line))'
          : 'var(--line)',
        boxShadow: habit.done_today ? '0 14px 34px -18px var(--accent)' : 'none',
      }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => onToggle(habit)}
      role="button"
      aria-pressed={habit.done_today}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle(habit)
        }
      }}
    >
      {/* icon chip */}
      <div
        className="grid h-11 w-11 flex-none place-items-center rounded-[13px] text-xl"
        style={{
          background: `color-mix(in srgb, ${habit.color} 20%, var(--surface))`,
          boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${habit.color} 32%, transparent)`,
        }}
      >
        {habit.icon}
      </div>

      {/* name + streak */}
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold tracking-tight">{habit.name}</div>
        <div className="nums mt-0.5 flex items-center gap-1.5 text-[0.78rem] text-muted">
          {habit.current_streak > 0 ? (
            <>
              <Flame size={13} className="text-accent" />
              <span>
                {habit.current_streak} day{habit.current_streak === 1 ? '' : 's'}
              </span>
              {habit.best_streak > habit.current_streak && (
                <span className="opacity-60">· best {habit.best_streak}</span>
              )}
            </>
          ) : (
            <>
              <Sparkles size={13} />
              <span>start today</span>
            </>
          )}
        </div>
      </div>

      {/* kebab */}
      <button
        ref={btnRef}
        aria-label="Habit options"
        aria-haspopup="menu"
        aria-expanded={menu !== null}
        className="grid h-8 w-8 flex-none place-items-center rounded-full text-muted transition-colors hover:bg-line/60"
        onClick={(e) => {
          e.stopPropagation()
          menu ? closeMenu() : openMenu()
        }}
      >
        <MoreHorizontal size={18} />
      </button>

      {/* check */}
      <div onClick={(e) => e.stopPropagation()} className="flex-none">
        <button
          aria-label={habit.done_today ? 'Mark not done' : 'Mark done'}
          onClick={() => onToggle(habit)}
        >
          <HabitCheck done={habit.done_today} burst={burst} />
        </button>
      </div>

      {/* portal menu — floats above all cards, never clipped */}
      {createPortal(
        <AnimatePresence>
          {menu && (
            <>
              <motion.button
                aria-hidden
                tabIndex={-1}
                className="fixed inset-0 z-[90] cursor-default"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => {
                  e.stopPropagation()
                  closeMenu()
                }}
              />
              <motion.div
                role="menu"
                className="fixed z-[91] w-[172px] overflow-hidden rounded-2xl border p-1.5 shadow-2xl"
                style={{
                  top: menu.top,
                  left: menu.left,
                  transformOrigin: `${menu.origin === 'top' ? 'top' : 'bottom'} right`,
                  background: 'var(--surface)',
                  borderColor: 'var(--line)',
                  boxShadow: 'var(--shadow)',
                }}
                initial={{ opacity: 0, scale: 0.92, y: menu.origin === 'top' ? -6 : 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: menu.origin === 'top' ? -6 : 6 }}
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                onClick={(e) => e.stopPropagation()}
              >
                <MenuItem
                  icon={<Pencil size={16} />}
                  label="Edit"
                  onClick={() => {
                    closeMenu()
                    onEdit(habit)
                  }}
                />
                <MenuItem
                  icon={<Trash2 size={16} />}
                  label="Delete"
                  danger
                  onClick={() => {
                    closeMenu()
                    onDelete(habit)
                  }}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </motion.div>
  )
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[0.95rem] transition-colors hover:bg-line/50"
      style={danger ? { color: '#fb7185' } : undefined}
    >
      {icon}
      {label}
    </button>
  )
}
