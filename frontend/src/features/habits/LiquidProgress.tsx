// A water-fill progress layer for goal habits — the card is a cup. Water rises
// bottom→top toward the goal with a living, sloshing surface rendered on a
// canvas: layered sine waves in the habit's color, a transient slosh whenever
// the count goes up, and a flat, gap-free fill once the target is hit.
//
// The fill level is driven by a critically-damped spring integrated against
// real elapsed time, so pouring is smooth and frame-rate independent, and a
// rapid long-press flows continuously instead of stepping. The render loop
// stays mounted for the card's lifetime and reads live props through a ref, so
// changing the count (or crossing the goal) never resets the animation.

import { useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'

// Surface wave layers: [spatial frequency, temporal speed].
const WAVES: [number, number][] = [
  [1.5, 1.15],
  [2.7, -0.85],
  [0.9, 0.5],
]
const AMP = 5 // base wave amplitude (px, pre-DPR)

// Spring constants for the fill level. damp ≈ 2·√k → critically damped (no
// overshoot), settling in ~0.5s — a deliberate, smooth pour.
const K = 120
const DAMP = 22

interface Rgb {
  r: number
  g: number
  b: number
}
function hexRgb(h: string): Rgb {
  const s = h.replace('#', '')
  return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) }
}
const mix = (c: Rgb, t: number, a: number): Rgb => ({
  r: c.r + (t - c.r) * a,
  g: c.g + (t - c.g) * a,
  b: c.b + (t - c.b) * a,
})
const rgba = (c: Rgb, a: number) => `rgba(${c.r | 0},${c.g | 0},${c.b | 0},${a})`

interface Props {
  /** progress 0..1 */
  pct: number
  color: string
  /** true once the goal is met — brightens the fill a touch */
  done: boolean
}

export function LiquidProgress({ pct, color, done }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduce = useReducedMotion()

  // All live state in one ref so prop changes never tear down the render loop.
  const st = useRef({ level: pct, vel: 0, slosh: 0, target: pct, color, done, reduce })

  // New progress → retarget the spring; a rise adds a gentle, proportional
  // slosh (no fixed kick, low cap) so rapid adds stay smooth, not turbulent.
  useEffect(() => {
    const s = st.current
    if (pct > s.target) s.slosh = Math.min(0.5, s.slosh + (pct - s.target) * 1.6)
    s.target = pct
  }, [pct])
  useEffect(() => {
    st.current.color = color
  }, [color])
  useEffect(() => {
    st.current.done = done
  }, [done])
  useEffect(() => {
    st.current.reduce = !!reduce
  }, [reduce])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const t0 = performance.now()
    let last = t0
    let raf = 0

    const frame = (now: number) => {
      const t = (now - t0) / 1000
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)) // clamp big gaps
      last = now
      const s = st.current

      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const W = Math.max(1, Math.round(rect.width * dpr))
      const H = Math.max(1, Math.round(rect.height * dpr))
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W
        canvas.height = H
      }

      // Spring the level toward target (semi-implicit Euler); decay the slosh.
      if (s.reduce) {
        s.level = s.target
        s.vel = 0
        s.slosh = 0
      } else {
        s.vel += (s.target - s.level) * K * dt
        s.vel -= s.vel * DAMP * dt
        s.level += s.vel * dt
        s.slosh *= Math.exp(-dt * 4)
      }
      const lvl = Math.max(0, Math.min(1, s.level))

      const habit = hexRgb(s.color)
      const deep = mix(habit, 0, 0.15)
      const bright = mix(habit, 255, 0.55)

      ctx.clearRect(0, 0, W, H)

      // Taper waves to nothing near empty/full so the cup fills flat, no gaps.
      const edge = s.reduce ? 0 : Math.min(1, Math.min(lvl, 1 - lvl) / 0.12)
      const A = AMP * dpr * (1 + s.slosh) * edge
      const tilt = s.slosh * 6 * dpr * edge

      // Base shifted up by the amplitude so wave troughs bottom out exactly at
      // the fill line — the water column below is always solid.
      const base = H * (1 - lvl) - A

      const surfaceY = (x: number) => {
        const u = x / W
        let dy = 0
        for (const [k, sp] of WAVES) dy += A * Math.sin(k * u * 6.283 + t * sp)
        dy += Math.sin(t * 7) * tilt * (u - 0.5) // see-saw slosh
        return base + dy
      }

      ctx.beginPath()
      ctx.moveTo(0, H)
      for (let x = 0; x <= W; x += 3) ctx.lineTo(x, surfaceY(x))
      ctx.lineTo(W, H)
      ctx.closePath()

      const g = ctx.createLinearGradient(0, base - 8 * dpr, 0, H)
      const boost = s.done ? 0.1 : 0
      g.addColorStop(0, rgba(bright, 0.42 + boost))
      g.addColorStop(1, rgba(deep, 0.34 + boost))
      ctx.fillStyle = g
      ctx.fill()

      // Glowing surface line (skipped when flat-full or empty).
      if (lvl > 0.001 && lvl < 0.999 && !s.reduce) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        ctx.strokeStyle = rgba(bright, 0.5)
        ctx.lineWidth = 1.6 * dpr
        ctx.shadowColor = rgba(bright, 0.7)
        ctx.shadowBlur = 8 * dpr
        ctx.beginPath()
        for (let x = 0; x <= W; x += 3) (x === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, x, surfaceY(x))
        ctx.stroke()
        ctx.restore()
      }

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      aria-hidden
    />
  )
}
