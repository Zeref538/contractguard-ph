import { cn } from '@/lib/utils'
import logoUrl from '/logo.png'

export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt='ContractGuard PH'
      className={cn('object-contain', className)}
    />
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoMark className='size-8 shrink-0' />
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
