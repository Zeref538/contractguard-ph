import { useRef, useState, type DragEvent } from 'react'
import {
  AlertCircle,
  Banknote,
  Clock,
  Gavel,
  HeartPulse,
  Hourglass,
  Lightbulb,
  Loader2,
  UploadCloud,
  UserX,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface Props {
  onUpload: (file: File) => void
  loading: boolean
  error: string | null
}

const CHECKS = [
  { icon: Hourglass, label: 'Probation period', law: 'Labor Code Art. 296' },
  { icon: UserX, label: 'Termination & notice', law: 'Arts. 294–302' },
  { icon: Banknote, label: 'Pay & 13th month', law: 'PD 851 · MO 28' },
  { icon: HeartPulse, label: 'SSS · PhilHealth · Pag-IBIG', law: 'RA 11199 · 11223 · 9679' },
  { icon: Clock, label: 'Hours & overtime', law: 'Arts. 83–96' },
  { icon: Lightbulb, label: 'IP ownership', law: 'RA 8293' },
  { icon: Gavel, label: 'Dispute resolution', law: 'Art. 224' },
]

export function UploadScreen({ onUpload, loading, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function pick(files: FileList | null) {
    const file = files?.[0]
    if (file) onUpload(file)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (!loading) pick(e.dataTransfer.files)
  }

  if (loading) {
    return (
      <div className='mx-auto flex max-w-md flex-col items-center gap-5 py-20 text-center'>
        <div className='relative'>
          <div className='bg-primary/25 absolute inset-0 rounded-full blur-xl' />
          <div className='border-border/80 bg-card relative flex size-16 items-center justify-center rounded-full border'>
            <Loader2 className='text-primary size-7 animate-spin' aria-hidden />
          </div>
        </div>
        <div>
          <h2 className='text-xl font-semibold tracking-tight'>
            Bantay is on it
          </h2>
          <p className='text-muted-foreground mt-1.5 text-sm'>
            Reading every clause and checking it against the Labor Code —
            usually under a minute.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='mx-auto max-w-3xl'>
      <section className='pt-6 pb-10 text-center sm:pt-12'>
        <p className='text-primary mb-3 text-xs font-semibold tracking-[0.18em] uppercase'>
          Philippine employment contracts
        </p>
        <h1 className='mx-auto max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl'>
          Spot illegal clauses{' '}
          <span className='from-primary bg-gradient-to-r to-[oklch(0.72_0.12_300)] bg-clip-text text-transparent'>
            before you sign
          </span>
        </h1>
        <p className='text-muted-foreground mx-auto mt-4 max-w-lg text-[15px] leading-relaxed'>
          Hand Bantay a contract PDF and get a clause-by-clause verdict — every
          finding cited to the Labor Code or the governing statute.
        </p>
      </section>

      {error && (
        <Alert variant='destructive' className='mb-4'>
          <AlertCircle className='size-4' aria-hidden />
          <AlertTitle>Analysis failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div
        role='button'
        tabIndex={0}
        aria-label='Upload a contract PDF'
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'group border-border bg-card/60 relative flex cursor-pointer flex-col items-center gap-3 overflow-hidden rounded-2xl border px-6 py-14 text-center backdrop-blur-sm transition-all duration-200',
          'hover:border-primary/50',
          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          dragging && 'border-primary bg-primary/10'
        )}
      >
        <div className='bg-primary/20 pointer-events-none absolute -top-16 left-1/2 h-32 w-72 -translate-x-1/2 rounded-full opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-100' />
        <div className='border-border/80 bg-secondary/80 text-primary flex size-13 items-center justify-center rounded-xl border'>
          <UploadCloud className='size-6' aria-hidden />
        </div>
        <div>
          <p className='font-medium'>
            Drop your contract here, or{' '}
            <span className='text-primary'>browse files</span>
          </p>
          <p className='text-muted-foreground mt-1 text-xs'>
            Text-based PDF · max 10 MB · analyzed in memory, never stored
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        type='file'
        accept='application/pdf'
        className='hidden'
        onChange={(e) => pick(e.target.files)}
      />

      <section className='mt-12'>
        <p className='text-muted-foreground mb-4 text-center text-xs font-medium tracking-[0.18em] uppercase'>
          Seven checks, every contract
        </p>
        <ul className='grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4'>
          {CHECKS.map(({ icon: Icon, label, law }) => (
            <li
              key={label}
              className='border-border/70 bg-card/50 hover:border-primary/40 rounded-xl border p-3.5 backdrop-blur-sm transition-colors'
            >
              <Icon className='text-primary mb-2 size-4.5' aria-hidden />
              <p className='text-[13px] leading-tight font-medium'>{label}</p>
              <p className='text-muted-foreground mt-0.5 text-[11px]'>{law}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
