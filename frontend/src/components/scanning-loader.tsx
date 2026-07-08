import { useEffect, useState } from 'react'
import { Warning, Check, FileMagnifyingGlass } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

type Flag = 'ok' | 'warn' | 'bad'

// A mock contract's text lines; some carry a finding the scan will surface.
const LINES: { w: string; flag?: Flag }[] = [
  { w: '58%' },
  { w: '92%' },
  { w: '80%', flag: 'ok' },
  { w: '88%' },
  { w: '73%' },
  { w: '95%', flag: 'bad' },
  { w: '64%' },
  { w: '85%', flag: 'ok' },
  { w: '90%' },
  { w: '69%', flag: 'warn' },
  { w: '83%' },
  { w: '55%', flag: 'ok' },
]

const STEPS = [
  'Extracting text from the PDF',
  'Segmenting the contract into clauses',
  'Checking probation & termination',
  'Checking pay, 13th month & benefits',
  'Checking hours, IP & dispute terms',
  'Compiling your compliance report',
]

const FLAG_STYLE: Record<Flag, { icon: typeof Check; cls: string }> = {
  ok: { icon: Check, cls: 'bg-emerald-500 text-white' },
  warn: { icon: Warning, cls: 'bg-amber-500 text-white' },
  bad: { icon: Warning, cls: 'bg-red-500 text-white' },
}

export function ScanningLoader() {
  const [step, setStep] = useState(0)
  const [revealed, setRevealed] = useState(0)

  useEffect(() => {
    const stepTimer = setInterval(
      () => setStep((s) => (s + 1) % STEPS.length),
      1600
    )
    const flagTimer = setInterval(
      () => setRevealed((r) => (r >= LINES.length ? r : r + 1)),
      420
    )
    return () => {
      clearInterval(stepTimer)
      clearInterval(flagTimer)
    }
  }, [])

  return (
    <div className='mx-auto flex max-w-md flex-col items-center py-6 text-center'>
      {/* Scanning document */}
      <div className='relative w-full max-w-[280px]'>
        <div className='bg-primary/15 absolute -inset-4 rounded-3xl blur-2xl' />
        <div className='border-border/70 bg-card relative h-[264px] overflow-hidden rounded-xl border shadow-xl'>
          {/* Paper header */}
          <div className='border-border/60 flex items-center gap-2 border-b px-4 py-2.5'>
            <FileMagnifyingGlass className='text-primary size-3.5' />
            <div className='bg-muted-foreground/30 h-1.5 w-20 rounded-full' />
          </div>

          {/* Text lines with findings */}
          <div className='space-y-2.5 px-4 py-3.5'>
            {LINES.map((line, i) => {
              const shown = i < revealed && line.flag
              const meta = line.flag ? FLAG_STYLE[line.flag] : null
              const Icon = meta?.icon
              return (
                <div key={i} className='flex items-center gap-2'>
                  <div
                    className={cn(
                      'h-2 rounded-full transition-colors duration-300',
                      shown && line.flag === 'bad'
                        ? 'bg-red-500/40'
                        : shown && line.flag === 'warn'
                          ? 'bg-amber-500/40'
                          : shown && line.flag === 'ok'
                            ? 'bg-emerald-500/30'
                            : 'bg-muted-foreground/20'
                    )}
                    style={{ width: line.w }}
                  />
                  {shown && meta && Icon && (
                    <span
                      className={cn(
                        'flag-pop flex size-4 shrink-0 items-center justify-center rounded-full',
                        meta.cls
                      )}
                    >
                      <Icon className='size-2.5' weight='bold' />
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Sweeping scan beam */}
          <div className='scan-beam pointer-events-none absolute inset-x-0 top-0'>
            <div className='via-primary/80 h-0.5 bg-gradient-to-r from-transparent to-transparent' />
            <div className='from-primary/25 h-14 bg-gradient-to-b to-transparent' />
          </div>
        </div>
      </div>

      {/* Live status */}
      <h2 className='mt-8 text-lg font-semibold tracking-tight'>
        Scanning your contract
      </h2>
      <p
        key={step}
        className='text-muted-foreground flag-pop mt-1.5 h-5 text-sm'
      >
        {STEPS[step]}
      </p>

      {/* Step dots */}
      <div className='mt-4 flex gap-1.5'>
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              i === step ? 'bg-primary w-5' : 'bg-muted-foreground/30 w-1.5'
            )}
          />
        ))}
      </div>
    </div>
  )
}
