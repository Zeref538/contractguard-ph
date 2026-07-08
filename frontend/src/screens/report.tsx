import {
  Warning,
  BookOpen,
  CheckCircle,
  Prohibit,
  Question,
  ArrowCounterClockwise,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ClauseReport, ComplianceReport, Verdict } from '@/lib/api'

const VERDICT_META: Record<
  Verdict,
  {
    icon: typeof CheckCircle
    text: string
    chip: string
    bar: string
    glow: string
    blurb: string
  }
> = {
  'Non-compliant': {
    icon: Warning,
    text: 'text-red-400',
    chip: 'bg-red-500/10 text-red-400 border-red-500/25',
    bar: 'bg-red-500',
    glow: 'bg-red-500/15',
    blurb: 'Conflicts with the law',
  },
  Missing: {
    icon: Prohibit,
    text: 'text-zinc-300',
    chip: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/25',
    bar: 'bg-zinc-400',
    glow: 'bg-zinc-500/15',
    blurb: 'Not addressed in the contract',
  },
  Vague: {
    icon: Question,
    text: 'text-amber-400',
    chip: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
    bar: 'bg-amber-500',
    glow: 'bg-amber-500/15',
    blurb: 'Too imprecise to verify',
  },
  Compliant: {
    icon: CheckCircle,
    text: 'text-emerald-400',
    chip: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    bar: 'bg-emerald-500',
    glow: 'bg-emerald-500/15',
    blurb: 'Meets the legal minimum',
  },
}

const SEVERITY: Verdict[] = ['Non-compliant', 'Missing', 'Vague', 'Compliant']

const CATEGORY_LABEL: Record<string, string> = {
  probation: 'Probation period',
  termination: 'Termination & notice',
  pay: 'Pay & 13th month',
  benefits: 'SSS · PhilHealth · Pag-IBIG',
  hours: 'Hours & overtime',
  ip: 'IP ownership',
  dispute: 'Dispute resolution',
}

export function ReportScreen({
  report,
  onReset,
}: {
  report: ComplianceReport
  onReset: () => void
}) {
  const counts = report.clauses.reduce<Record<string, number>>((acc, c) => {
    acc[c.verdict] = (acc[c.verdict] ?? 0) + 1
    return acc
  }, {})
  const issues = (counts['Non-compliant'] ?? 0) + (counts['Missing'] ?? 0)

  const ordered = [...report.clauses].sort(
    (a, b) => SEVERITY.indexOf(a.verdict) - SEVERITY.indexOf(b.verdict)
  )

  return (
    <div className='space-y-8'>
      {/* Header */}
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <div>
          <p className='text-primary mb-1.5 text-xs font-semibold tracking-[0.18em] uppercase'>
            Compliance report
          </p>
          <h1 className='text-2xl font-semibold tracking-tight'>
            {report.filename}
          </h1>
          <p
            className={cn(
              'mt-1.5 text-sm',
              issues > 0 ? 'text-red-400' : 'text-emerald-400'
            )}
          >
            {issues > 0
              ? `${issues} item${issues > 1 ? 's' : ''} need${issues > 1 ? '' : 's'} attention`
              : 'No red flags found — everything checks out'}
          </p>
        </div>
        <Button variant='outline' onClick={onReset} className='gap-2'>
          <ArrowCounterClockwise className='size-4' aria-hidden />
          Check another
        </Button>
      </div>

      {/* Summary tiles */}
      <dl className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        {SEVERITY.map((v) => {
          const meta = VERDICT_META[v]
          const Icon = meta.icon
          return (
            <div
              key={v}
              className='border-border/70 bg-card/60 relative overflow-hidden rounded-xl border p-4 backdrop-blur-sm'
            >
              <div
                className={cn(
                  'pointer-events-none absolute -top-8 -right-8 size-24 rounded-full blur-2xl',
                  meta.glow
                )}
              />
              <dt className='text-muted-foreground flex items-center gap-1.5 text-xs font-medium'>
                <Icon className={cn('size-3.5', meta.text)} aria-hidden />
                {v}
              </dt>
              <dd
                className={cn(
                  'mt-1.5 text-3xl font-semibold tracking-tight tabular-nums',
                  meta.text
                )}
              >
                {counts[v] ?? 0}
              </dd>
            </div>
          )
        })}
      </dl>

      {/* Clause findings as readable cards */}
      <div className='space-y-4'>
        {ordered.map((clause, i) => (
          <ClauseCard key={i} clause={clause} />
        ))}
      </div>

      <p className='text-muted-foreground border-border/50 border-t pt-5 text-xs leading-relaxed'>
        {report.disclaimer}
      </p>
    </div>
  )
}

function ClauseCard({ clause }: { clause: ClauseReport }) {
  const meta = VERDICT_META[clause.verdict]
  const Icon = meta.icon
  return (
    <article className='border-border/70 bg-card/60 relative overflow-hidden rounded-xl border pl-1 backdrop-blur-sm'>
      <div className={cn('absolute inset-y-0 left-0 w-1', meta.bar)} />
      <div className='p-5'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <h3 className='text-base font-semibold tracking-tight'>
            {CATEGORY_LABEL[clause.clause_type] ?? clause.clause_type}
          </h3>
          <span
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
              meta.chip
            )}
          >
            <Icon className='size-3.5' aria-hidden />
            {clause.verdict}
          </span>
        </div>

        <p className={cn('mt-0.5 text-xs font-medium', meta.text)}>
          {meta.blurb}
        </p>

        <p className='mt-3 text-[15px] leading-relaxed text-pretty'>
          {clause.explanation}
        </p>

        <div className='text-muted-foreground mt-4 flex items-start gap-2 text-sm'>
          <BookOpen className='mt-0.5 size-4 shrink-0' aria-hidden />
          <span>
            <span className='font-medium'>Legal basis: </span>
            {clause.citation}
          </span>
        </div>

        {clause.clause_text && (
          <details className='group mt-3'>
            <summary className='text-primary inline-flex cursor-pointer items-center text-xs font-medium hover:underline'>
              Show the clause from your contract
            </summary>
            <blockquote className='border-border text-muted-foreground mt-2 border-l-2 pl-4 text-sm leading-relaxed whitespace-pre-wrap italic'>
              {clause.clause_text}
            </blockquote>
          </details>
        )}
      </div>
    </article>
  )
}
