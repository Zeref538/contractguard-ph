import { useRef, useState, type DragEvent } from 'react'
import {
  AlertCircle,
  Banknote,
  Clock,
  FileText,
  Gavel,
  HeartPulse,
  Hourglass,
  Lightbulb,
  Loader2,
  ShieldCheck,
  UploadCloud,
  UserX,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Props {
  onUpload: (file: File) => void
  loading: boolean
  error: string | null
}

const CHECKS = [
  { icon: Hourglass, label: 'Probation period', law: 'Art. 296' },
  { icon: UserX, label: 'Termination & notice', law: 'Arts. 294–302' },
  { icon: Banknote, label: 'Pay & 13th month', law: 'PD 851' },
  { icon: HeartPulse, label: 'SSS · PhilHealth · Pag-IBIG', law: 'RA 11199 et al.' },
  { icon: Clock, label: 'Hours & overtime', law: 'Arts. 83–96' },
  { icon: Lightbulb, label: 'IP ownership', law: 'RA 8293' },
  { icon: Gavel, label: 'Dispute resolution', law: 'Art. 224' },
]

const LOADING_STEPS = [
  'Extracting text from your PDF…',
  'Segmenting the contract into clauses…',
  'Checking each clause against the Labor Code…',
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
      <div className='mx-auto max-w-xl'>
        <Card>
          <CardContent className='flex flex-col items-center gap-4 py-12 text-center'>
            <div className='bg-primary/10 text-primary flex size-14 items-center justify-center rounded-full'>
              <Loader2 className='size-7 animate-spin' aria-hidden />
            </div>
            <div>
              <h2 className='font-serif text-2xl font-semibold'>
                Reviewing your contract
              </h2>
              <p className='text-muted-foreground mt-1 text-sm'>
                Usually takes under a minute.
              </p>
            </div>
            <ul className='text-muted-foreground space-y-1.5 text-sm'>
              {LOADING_STEPS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='grid items-start gap-8 lg:grid-cols-[1fr_minmax(280px,340px)]'>
      <section>
        <div className='mb-6'>
          <h1 className='font-serif text-3xl font-semibold tracking-tight text-balance sm:text-4xl'>
            Is your employment contract{' '}
            <span className='text-primary'>DOLE-compliant?</span>
          </h1>
          <p className='text-muted-foreground mt-2 max-w-prose'>
            Upload a Philippine employment contract and get a clause-by-clause
            report — each verdict backed by a citation to the Labor Code or the
            governing statute.
          </p>
        </div>

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
            'group border-primary/25 bg-card flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-14 text-center shadow-sm transition-all duration-200',
            'hover:border-primary/60 hover:shadow-md',
            'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
            dragging && 'border-primary bg-primary/5 shadow-md'
          )}
        >
          <div className='bg-primary/10 text-primary group-hover:bg-primary/15 flex size-14 items-center justify-center rounded-full transition-colors'>
            <UploadCloud className='size-7' aria-hidden />
          </div>
          <div>
            <p className='text-lg font-semibold'>
              Drop your contract here, or{' '}
              <span className='text-primary underline underline-offset-4'>
                browse
              </span>
            </p>
            <p className='text-muted-foreground mt-1 text-sm'>
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

        <p className='text-muted-foreground mt-3 flex items-center gap-1.5 text-xs'>
          <FileText className='size-3.5' aria-hidden />
          Employment contracts only — freelance and service agreements follow a
          different legal framework.
        </p>
      </section>

      <aside className='bg-card rounded-xl border p-5 shadow-sm'>
        <div className='mb-4 flex items-center gap-2'>
          <ShieldCheck className='text-accent size-5' aria-hidden />
          <h2 className='font-serif text-lg font-semibold'>What gets checked</h2>
        </div>
        <ul className='space-y-3'>
          {CHECKS.map(({ icon: Icon, label, law }) => (
            <li key={label} className='flex items-center gap-3'>
              <div className='bg-muted text-primary flex size-8 shrink-0 items-center justify-center rounded-md'>
                <Icon className='size-4' aria-hidden />
              </div>
              <div className='min-w-0'>
                <p className='text-sm leading-tight font-medium'>{label}</p>
                <p className='text-muted-foreground text-xs'>{law}</p>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
