import {
  AlertTriangle,
  CheckCircle2,
  CircleOff,
  HelpCircle,
  RotateCcw,
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
  { icon: typeof CheckCircle2; badge: string; text: string; glow: string }
> = {
  Compliant: {
    icon: CheckCircle2,
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    text: 'text-emerald-400',
    glow: 'bg-emerald-500/15',
  },
  'Non-compliant': {
    icon: AlertTriangle,
    badge: 'bg-red-500/10 text-red-400 border-red-500/25',
    text: 'text-red-400',
    glow: 'bg-red-500/15',
  },
  Vague: {
    icon: HelpCircle,
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
    text: 'text-amber-400',
    glow: 'bg-amber-500/15',
  },
  Missing: {
    icon: CircleOff,
    badge: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/25',
    text: 'text-zinc-400',
    glow: 'bg-zinc-500/15',
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
    <div className='space-y-8'>
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <div>
          <p className='text-primary mb-1.5 text-xs font-semibold tracking-[0.18em] uppercase'>
            Compliance report
          </p>
          <h1 className='text-2xl font-semibold tracking-tight'>
            {report.filename}
          </h1>
          <p className='text-muted-foreground mt-1 text-sm'>
            {issues > 0
              ? `${issues} item${issues > 1 ? 's' : ''} need${issues > 1 ? '' : 's'} attention`
              : 'No red flags found'}
          </p>
        </div>
        <Button variant='outline' onClick={onReset} className='gap-2'>
          <RotateCcw className='size-4' aria-hidden />
          Check another
        </Button>
      </div>

      <dl className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
        {VERDICT_ORDER.map((v) => {
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

      <div className='border-border/70 bg-card/60 overflow-x-auto rounded-xl border backdrop-blur-sm'>
        <Table>
          <TableHeader>
            <TableRow className='border-border/70 hover:bg-transparent'>
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
                <TableRow key={i} className='border-border/50 align-top'>
                  <TableCell className='pl-5 font-medium'>
                    {CATEGORY_LABEL[c.clause_type] ?? c.clause_type}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant='outline'
                      className={cn('gap-1 font-medium', meta.badge)}
                    >
                      <Icon className='size-3' aria-hidden />
                      {c.verdict}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-muted-foreground text-[13px]'>
                    {c.citation}
                  </TableCell>
                  <TableCell className='pr-5 text-sm leading-relaxed'>
                    {c.explanation}
                    {c.clause_text && (
                      <details className='mt-2'>
                        <summary className='text-primary cursor-pointer text-xs font-medium hover:underline'>
                          Show clause text
                        </summary>
                        <blockquote className='border-primary/40 text-muted-foreground mt-2 border-l-2 pl-3 text-xs leading-relaxed whitespace-pre-wrap'>
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
