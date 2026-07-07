# Design System — "Graphite Mono"

Minimal & premium (Vercel/Linear energy). **Dark is the default theme.** Light theme supported. Motion: dialed up but tasteful (see below).

## Tokens
Defined as CSS custom properties; components read tokens only (never raw hex), so both themes swap cleanly.

### Dark (default)
| Token | Hex | Use |
|-------|-----|-----|
| `--ground` | `#0b0b0d` | page background |
| `--surface` | `#161618` | cards / app surface |
| `--surface-2` | `#1e1e22` | raised rows |
| `--ink` | `#ededf0` | text |
| `--ink-muted` | `#8a8a94` | secondary text |
| `--line` | `rgba(255,255,255,.09)` | hairlines/borders |
| `--accent` | `#8b5cf6` | highlight: done-glow, buttons, ring |
| `--accent-2` | `#c4b5fd` | gradient partner |
| `--btn-ink` | `#0b0b0d` | text on accent buttons |

### Light
| Token | Hex |
|-------|-----|
| `--ground` | `#f6f6f8` |
| `--surface` | `#ffffff` |
| `--surface-2` | `#f2f2f5` |
| `--ink` | `#18181b` |
| `--ink-muted` | `#6b6b76` |
| `--line` | `rgba(20,20,30,.10)` |
| `--accent` | `#7c3aed` (deeper for contrast) |
| `--accent-2` | `#a78bfa` |
| `--btn-ink` | `#ffffff` |

Accent gradient: `linear-gradient(135deg, var(--accent), var(--accent-2))`.
Neutrals are true graphite (no strong hue), letting the violet accent carry all the color.

## Type
Apple-native pairing (guaranteed, avoids Inter/Space-Grotesk default):
- Display: `ui-serif, "New York", Georgia, serif` — greeting, big numbers.
- Body: `system-ui, -apple-system, "SF Pro Text", sans-serif`.
- Numerals/labels: `ui-monospace, "SF Mono", Menlo, monospace` + `tabular-nums`.

## Motion (Framer Motion) — "more / wow"
- **Complete a habit**: check springs (scale bump), ripple ring expands, violet particle sparks fly out, card gains accent glow. Optimistic (instant).
- **Progress ring**: fills + % counts up; center disc grows/brightens as the day completes.
- **Entrance**: cards stagger up on load (`staggerChildren`).
- **Ambient**: subtle drifting glow behind the app.
- **Milestone**: streak number shimmers when it ticks up.
- All motion disabled under `prefers-reduced-motion`.

## Shape / feel
Rounded-2xl cards (20–22px), soft shadows, 1px hairline borders, glassy header. Mobile-first: single column stack; comfortable tap targets.

Reference mockup: `scratchpad/eos-palettes.html` (board), Graphite Mono tile.
