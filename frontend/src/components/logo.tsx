import { cn } from '@/lib/utils'

/**
 * Bantay mark — a custom guardian glyph for ContractGuard PH.
 * "Bantay" is Tagalog for guardian / watchdog. The mark is a shield whose
 * interior negative space forms an upward check (verified) with a vigilant
 * eye-dot at the crest — protection + verification + watchfulness.
 */
export function BantayMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 32 32'
      fill='none'
      className={className}
      aria-hidden='true'
    >
      <defs>
        <linearGradient id='bantay-g' x1='6' y1='3' x2='26' y2='30'>
          <stop offset='0' stopColor='#7C89F0' />
          <stop offset='1' stopColor='#4B57BE' />
        </linearGradient>
      </defs>
      {/* Shield body */}
      <path
        d='M16 2.5 L27 6.6 C27 6.6 27 15.4 27 16.6 C27 23.4 22 28.4 16 30.2 C10 28.4 5 23.4 5 16.6 C5 15.4 5 6.6 5 6.6 Z'
        fill='url(#bantay-g)'
      />
      {/* Watch-check carved in negative space (background shows through) */}
      <path
        d='M10.8 16.6 L14.6 20.4 L21.4 12.2'
        stroke='white'
        strokeWidth='2.6'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      {/* Vigilance dot at the crest */}
      <circle cx='16' cy='8.4' r='1.5' fill='white' fillOpacity='0.9' />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <BantayMark className='size-8 shrink-0' />
      <div className='leading-none'>
        <p className='text-[15px] font-semibold tracking-tight'>
          ContractGuard <span className='text-primary'>PH</span>
        </p>
        <p className='text-muted-foreground mt-0.5 text-[11px]'>
          Guarded by Bantay
        </p>
      </div>
    </div>
  )
}
