import { cn } from '@/lib/utils'

/**
 * Aegix mark — a gradient app-tile with a clean geometric "A" monogram.
 * Vector + self-contained gradient, so it stays crisp and high-contrast on
 * both light and dark backgrounds.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 48 48'
      fill='none'
      className={cn('shrink-0', className)}
      aria-hidden='true'
    >
      <defs>
        <linearGradient
          id='aegix-g'
          x1='6'
          y1='4'
          x2='42'
          y2='44'
          gradientUnits='userSpaceOnUse'
        >
          <stop stopColor='#8B97F7' />
          <stop offset='1' stopColor='#4A56BE' />
        </linearGradient>
      </defs>
      <rect x='3' y='3' width='42' height='42' rx='12' fill='url(#aegix-g)' />
      <rect
        x='3.6'
        y='3.6'
        width='40.8'
        height='40.8'
        rx='11.4'
        stroke='#fff'
        strokeOpacity='0.16'
      />
      <path
        d='M24 12.5 L33.5 35 M24 12.5 L14.5 35'
        stroke='#fff'
        strokeWidth='3.6'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M18.7 27 L29.3 27'
        stroke='#fff'
        strokeWidth='3.2'
        strokeLinecap='round'
      />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark className='size-8' />
      <div className='leading-none'>
        <p className='text-[15px] font-semibold tracking-tight'>
          Aegix <span className='text-primary'>AI</span>
        </p>
        <p className='text-muted-foreground mt-1 text-[11px]'>
          PH contract compliance
        </p>
      </div>
    </div>
  )
}
