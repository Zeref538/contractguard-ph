import {
  AlertTriangle,
  CheckCircle2,
  CircleOff,
  HelpCircle,
  RotateCcw,
  ScrollText,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { ComplianceReport, Verdict } from '@/lib/api'

const VERDICT_META: Record<
  Verdict,
  { icon: typeof CheckCircle2; badge: string; tile: string; label: string }
> = {
  Compliant: {
    icon: CheckCircle2,
    badge:
      'bg-emerald-600/10 text-emerald-700 border-emerald-600/30 dark:text-emerald-400',
    tile: 'text-emerald-700 dark:text-emerald-400',
    label: 'Compliant',
  },
  'Non-compliant': {
    icon: AlertTriangle,
    badge: 'bg-red-600/10 text-red-700 border-red-600/30 dark:text-red-400',
    tile: 'text-red-700 dark:text-red-400',
    label: 'Non-compliant',
  },
  Vague: {
    icon: HelpCircle,
    badge:
      'bg-amber-500/10 text-amber-700 border-amber-500/40 dark:text-amber-400',
    tile: 'text-amber-700 dark:text-amber-400',
    label: 'Vague',
  },
  Missing: {
    icon: CircleOff,
    badge:
      'bg-slate-500/10 text-slate-600 border-slate-400/40 dark:text-slate-300',
    tile: 'text-slate-600 dark:text-slate-300',
    label: 'Missing',
  },
}

const VERDICT_ORDER: Verdict[] = ['Non-compliant', 'Vague', 'Missing', 'Compliant']

const CATEGORY_LABEL: Record<string, string> = {
  probation: 'Probation',
  termination: 'Termination',
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

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div className='flex items-start gap-3'>
          <div className='bg-primary/10 text-primary mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg'>
            <ScrollText className='size-5' aria-hidden />
          </div>
          <div>
            <h1 className='font-serif text-2xl font-semibold tracking-tight'>
              Compliance report
            </h1>
            <p className='text-muted-foreground text-sm'>
              {report.filename} ·{' '}
              {issues > 0
                ? `${issues} item${issues > 1 ? 's' : ''} need${issues > 1 ? '' : 's'} attention`
                : 'no red flags found'}
            </p>
          </div>
        </div>
        <Button variant='outline' onClick={onReset} className='gap-2'>
          <RotateCcw className='size-4' aria-hidden />
          Check another contract
        </Button>
      </div>

      <dl className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        {VERDICT_ORDER.map((v) => {
          const { icon: Icon, tile } = VERDICT_META[v]
          return (
            <div key={v} className='bg-card rounded-xl border p-4 shadow-sm'>
              <dt className='text-muted-foreground flex items-center gap-1.5 text-xs font-medium'>
                <Icon className={cn('size-3.5', tile)} aria-hidden />
                {v}
              </dt>
              <dd className={cn('mt-1 text-3xl font-semibold tabular-nums', tile)}>
                {counts[v] ?? 0}
              </dd>
            </div>
          )
        })}
      </dl>

      <div className='bg-card overflow-x-auto rounded-xl border shadow-sm'>
        <Table>
          <TableHeader>
            <TableRow className='hover:bg-transparent'>
              <TableHead className='w-44 pl-5'>Clause</TableHead>
              <TableHead className='w-36'>Verdict</TableHead>
              <TableHead className='w-60'>Legal basis</TableHead>
              <TableHead className='min-w-72 pr-5'>Explanation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.clauses.map((c, i) => {
              const meta = VERDICT_META[c.verdict]
              const Icon = meta.icon
              return (
                <TableRow key={i} className='align-top'>
                  <TableCell className='pl-5 font-medium'>
                    {CATEGORY_LABEL[c.clause_type] ?? c.clause_type}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant='outline'
                      className={cn('gap-1 font-medium', meta.badge)}
                    >
                      <Icon className='size-3' aria-hidden />
                      {meta.label}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-muted-foreground text-sm'>
                    {c.citation}
                  </TableCell>
                  <TableCell className='pr-5 text-sm leading-relaxed'>
                    {c.explanation}
                    {c.clause_text && (
                      <details className='mt-2'>
                        <summary className='text-primary cursor-pointer text-xs font-medium underline-offset-4 hover:underline'>
                          Show clause text
                        </summary>
                        <blockquote className='border-accent/60 text-muted-foreground mt-2 border-l-2 pl-3 text-xs leading-relaxed whitespace-pre-wrap'>
                          {c.clause_text}
                        </blockquote>
                      </details>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <p className='text-muted-foreground text-xs'>{report.disclaimer}</p>
    </div>
  )
}
