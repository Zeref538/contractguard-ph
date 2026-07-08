import { useRef, useState, type DragEvent } from 'react'
import {
  WarningCircle,
  Money,
  Clock,
  FileArrowUp,
  Gavel,
  Heartbeat,
  Hourglass,
  Lightbulb,
  Scan,
  Scroll,
  TextAlignLeft,
  UserMinus,
  PaperPlaneTilt,
} from '@phosphor-icons/react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ScanningLoader } from '@/components/scanning-loader'
import { cn } from '@/lib/utils'

interface Props {
  onUpload: (file: File) => void
  onAnalyzeText: (text: string) => void
  loading: boolean
  error: string | null
}

const CHECKS = [
  { icon: Hourglass, label: 'Probation period', law: 'Art. 296' },
  { icon: UserMinus, label: 'Termination & notice', law: 'Arts. 294–302' },
  { icon: Money, label: 'Pay & 13th month', law: 'PD 851 · MO 28' },
  { icon: Heartbeat, label: 'SSS · PhilHealth · Pag-IBIG', law: 'RA 11199 +' },
  { icon: Clock, label: 'Hours & overtime', law: 'Arts. 83–96' },
  { icon: Lightbulb, label: 'IP ownership', law: 'RA 8293' },
  { icon: Gavel, label: 'Dispute resolution', law: 'Art. 224' },
]

const STEPS = [
  {
    icon: FileArrowUp,
    title: 'Add your contract',
    body: 'Upload a file or paste the text.',
  },
  {
    icon: Scan,
    title: 'Scan',
    body: 'Each clause is checked against the Labor Code.',
  },
  {
    icon: Scroll,
    title: 'Report',
    body: 'Get verdicts with citations & plain-English reasons.',
  },
]

export function UploadScreen({
  onUpload,
  onAnalyzeText,
  loading,
  error,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [mode, setMode] = useState<'file' | 'text'>('file')
  const [text, setText] = useState('')

  function pick(files: FileList | null) {
    const file = files?.[0]
    if (file) onUpload(file)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (!loading) pick(e.dataTransfer.files)
  }

  if (loading) return <ScanningLoader />

  return (
    <div className='space-y-10'>
      <div className='grid items-start gap-8 lg:grid-cols-[1.35fr_1fr]'>
        {/* Left: hero + input */}
        <section>
          <p className='text-primary mb-3 text-xs font-semibold tracking-[0.18em] uppercase'>
            Philippine employment contracts
          </p>
          <h1 className='text-3xl font-semibold tracking-tight text-balance sm:text-4xl'>
            Spot illegal clauses{' '}
            <span className='from-primary bg-gradient-to-r to-[oklch(0.72_0.12_300)] bg-clip-text text-transparent'>
              before you sign
            </span>
          </h1>
          <p className='text-muted-foreground mt-3 max-w-md text-[15px] leading-relaxed'>
            Add your contract as a PDF or Word file, or paste the text — Aegix
            checks each clause and cites the Labor Code or the governing
            statute behind every verdict.
          </p>

          {/* Mode toggle */}
          <div className='bg-secondary/60 mt-6 inline-flex rounded-lg border p-1'>
            {(['file', 'text'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  mode === m
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {m === 'file' ? (
                  <FileArrowUp className='size-4' />
                ) : (
                  <TextAlignLeft className='size-4' />
                )}
                {m === 'file' ? 'Upload file' : 'Paste text'}
              </button>
            ))}
          </div>

          {error && (
            <Alert variant='destructive' className='mt-4'>
              <WarningCircle className='size-4' aria-hidden />
              <AlertTitle>Analysis failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {mode === 'file' ? (
            <>
              <div
                role='button'
                tabIndex={0}
                aria-label='Upload a contract file'
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) =>
                  e.key === 'Enter' && inputRef.current?.click()
                }
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  'group border-border bg-card/60 relative mt-4 flex cursor-pointer flex-col items-center gap-3 overflow-hidden rounded-2xl border px-6 py-12 text-center backdrop-blur-sm transition-all duration-200',
                  'hover:border-primary/50',
                  'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                  dragging && 'border-primary bg-primary/10'
                )}
              >
                <div className='bg-primary/20 pointer-events-none absolute -top-16 left-1/2 h-32 w-72 -translate-x-1/2 rounded-full opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-100' />
                <div className='border-border/80 bg-secondary/80 text-primary flex size-13 items-center justify-center rounded-xl border'>
                  <FileArrowUp className='size-6' weight='bold' aria-hidden />
                </div>
                <div>
                  <p className='font-medium'>
                    Drop your contract here, or{' '}
                    <span className='text-primary'>browse files</span>
                  </p>
                  <p className='text-muted-foreground mt-1 text-xs'>
                    PDF, Word, or text · max 10 MB · analyzed in memory, never
                    stored
                  </p>
                </div>
              </div>
              <input
                ref={inputRef}
                type='file'
                accept='.pdf,.docx,.doc,.txt,.md'
                className='hidden'
                onChange={(e) => pick(e.target.files)}
              />
            </>
          ) : (
            <div className='mt-4'>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder='Paste the full contract text here — copy it straight from your document…'
                rows={10}
                className='border-border bg-card/60 focus-visible:ring-ring w-full resize-y rounded-2xl border p-4 text-sm leading-relaxed backdrop-blur-sm focus-visible:ring-2 focus-visible:outline-none'
              />
              <div className='mt-3 flex items-center justify-between'>
                <span className='text-muted-foreground text-xs tabular-nums'>
                  {text.trim().length} characters
                </span>
                <Button
                  onClick={() => onAnalyzeText(text)}
                  disabled={text.trim().length < 120}
                  className='gap-2'
                >
                  <PaperPlaneTilt className='size-4' weight='bold' />
                  Check this contract
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Right: what gets checked */}
        <section className='border-border/70 bg-card/50 rounded-2xl border p-5 backdrop-blur-sm'>
          <h2 className='mb-4 text-sm font-semibold tracking-wide'>
            What gets checked
          </h2>
          <ul className='space-y-1'>
            {CHECKS.map(({ icon: Icon, label, law }) => (
              <li
                key={label}
                className='hover:bg-secondary/50 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors'
              >
                <div className='bg-secondary text-primary flex size-8 shrink-0 items-center justify-center rounded-lg'>
                  <Icon className='size-4' aria-hidden />
                </div>
                <span className='flex-1 text-sm font-medium'>{label}</span>
                <span className='text-muted-foreground text-xs tabular-nums'>
                  {law}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* How it works strip */}
      <section className='border-border/50 grid gap-4 border-t pt-8 sm:grid-cols-3'>
        {STEPS.map(({ icon: Icon, title, body }, i) => (
          <div key={title} className='flex items-start gap-3'>
            <div className='border-border/70 bg-card text-primary flex size-9 shrink-0 items-center justify-center rounded-lg border'>
              <Icon className='size-4' aria-hidden />
            </div>
            <div>
              <p className='text-sm font-semibold'>
                <span className='text-muted-foreground mr-1.5 tabular-nums'>
                  {i + 1}.
                </span>
                {title}
              </p>
              <p className='text-muted-foreground mt-0.5 text-xs leading-relaxed'>
                {body}
              </p>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}
