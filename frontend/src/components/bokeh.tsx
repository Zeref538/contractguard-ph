import { useEffect, useRef, type CSSProperties } from 'react'

// Out-of-focus light orbs. Each drifts slowly (CSS) and shifts with the mouse
// (parallax by depth). Kept subtle so it reads as ambient, not distracting.
const ORBS = [
  { size: 380, x: '6%', y: '10%', depth: 26, dur: 26, delay: 0, color: 'oklch(0.585 0.13 277 / 0.22)' },
  { size: 300, x: '80%', y: '6%', depth: 42, dur: 31, delay: 3, color: 'oklch(0.62 0.15 300 / 0.17)' },
  { size: 440, x: '68%', y: '66%', depth: 18, dur: 35, delay: 1, color: 'oklch(0.585 0.13 277 / 0.17)' },
  { size: 240, x: '20%', y: '78%', depth: 34, dur: 24, delay: 5, color: 'oklch(0.66 0.14 330 / 0.15)' },
  { size: 180, x: '46%', y: '36%', depth: 48, dur: 22, delay: 2, color: 'oklch(0.7 0.13 320 / 0.13)' },
  { size: 160, x: '90%', y: '46%', depth: 30, dur: 28, delay: 4, color: 'oklch(0.62 0.15 300 / 0.15)' },
]

export function BokehField() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    function onMove(e: MouseEvent) {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el!.style.setProperty('--mx', String(e.clientX / window.innerWidth - 0.5))
        el!.style.setProperty('--my', String(e.clientY / window.innerHeight - 0.5))
      })
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden
      className='pointer-events-none fixed inset-0 -z-10 overflow-hidden'
      style={{ '--mx': 0, '--my': 0 } as CSSProperties}
    >
      {ORBS.map((o, i) => (
        <div
          key={i}
          className='absolute'
          style={{
            left: o.x,
            top: o.y,
            transform: `translate(calc(var(--mx) * ${o.depth}px), calc(var(--my) * ${o.depth}px))`,
            transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <div
            className='bokeh-orb rounded-full'
            style={{
              width: o.size,
              height: o.size,
              background: o.color,
              filter: `blur(${Math.round(o.size / 5)}px)`,
              animationDuration: `${o.dur}s`,
              animationDelay: `${o.delay}s`,
            }}
          />
        </div>
      ))}
    </div>
  )
}
