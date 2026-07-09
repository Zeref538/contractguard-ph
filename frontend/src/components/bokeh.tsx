import { useEffect, useRef } from 'react'

// Out-of-focus light orbs. Each floats on its own along a slow, organic path
// (sum of sine waves), and the mouse gently nudges them by depth (parallax).
const ORBS = [
  { size: 380, x: '6%', y: '10%', depth: 26, color: 'oklch(0.585 0.13 277 / 0.22)', ax: 80, ay: 60, sx: 0.00011, sy: 0.00015, px: 0.0, py: 1.3 },
  { size: 300, x: '80%', y: '6%', depth: 42, color: 'oklch(0.62 0.15 300 / 0.17)', ax: 65, ay: 85, sx: 0.00016, sy: 0.00012, px: 2.1, py: 0.4 },
  { size: 440, x: '68%', y: '66%', depth: 18, color: 'oklch(0.585 0.13 277 / 0.17)', ax: 95, ay: 70, sx: 0.00009, sy: 0.00013, px: 1.0, py: 3.0 },
  { size: 240, x: '20%', y: '78%', depth: 34, color: 'oklch(0.66 0.14 330 / 0.15)', ax: 70, ay: 95, sx: 0.00014, sy: 0.0001, px: 3.4, py: 1.9 },
  { size: 180, x: '46%', y: '36%', depth: 48, color: 'oklch(0.7 0.13 320 / 0.13)', ax: 110, ay: 80, sx: 0.00018, sy: 0.00016, px: 0.7, py: 2.4 },
  { size: 160, x: '90%', y: '46%', depth: 30, color: 'oklch(0.62 0.15 300 / 0.15)', ax: 85, ay: 100, sx: 0.00013, sy: 0.00019, px: 2.8, py: 0.9 },
]

export function BokehField() {
  const orbRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const target = { x: 0, y: 0 }
    const smooth = { x: 0, y: 0 }

    function onMove(e: MouseEvent) {
      target.x = e.clientX / window.innerWidth - 0.5
      target.y = e.clientY / window.innerHeight - 0.5
    }
    window.addEventListener('mousemove', onMove, { passive: true })

    let raf = 0
    function frame(now: number) {
      // ease the mouse influence so it feels soft, not twitchy
      smooth.x += (target.x - smooth.x) * 0.04
      smooth.y += (target.y - smooth.y) * 0.04

      for (let i = 0; i < ORBS.length; i++) {
        const el = orbRefs.current[i]
        if (!el) continue
        const o = ORBS[i]
        const dx =
          o.ax * Math.sin(now * o.sx + o.px) +
          0.4 * o.ax * Math.sin(now * o.sx * 2.3 + o.px * 1.7)
        const dy =
          o.ay * Math.cos(now * o.sy + o.py) +
          0.4 * o.ay * Math.cos(now * o.sy * 1.9 + o.py * 1.3)
        const tx = dx + smooth.x * o.depth
        const ty = dy + smooth.y * o.depth
        el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      aria-hidden
      className='pointer-events-none fixed inset-0 -z-10 overflow-hidden'
    >
      {ORBS.map((o, i) => (
        <div
          key={i}
          ref={(el) => {
            orbRefs.current[i] = el
          }}
          className='absolute rounded-full will-change-transform'
          style={{
            left: o.x,
            top: o.y,
            width: o.size,
            height: o.size,
            background: o.color,
            filter: `blur(${Math.round(o.size / 5)}px)`,
          }}
        />
      ))}
    </div>
  )
}
