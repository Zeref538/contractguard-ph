import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  title: string
  body: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div
      role='dialog'
      aria-modal='true'
      aria-labelledby='confirm-title'
      className='fixed inset-0 z-[100] flex items-center justify-center p-4'
    >
      <div
        className='absolute inset-0 bg-black/60 backdrop-blur-sm'
        onClick={onCancel}
        aria-hidden
      />
      <div className='border-border bg-card relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl'>
        <h2 id='confirm-title' className='text-lg font-semibold tracking-tight'>
          {title}
        </h2>
        <p className='text-muted-foreground mt-2 text-sm leading-relaxed'>
          {body}
        </p>
        <div className='mt-6 flex justify-end gap-2'>
          <Button variant='outline' onClick={onCancel}>
            Cancel
          </Button>
          <Button variant='destructive' onClick={onConfirm} autoFocus>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
