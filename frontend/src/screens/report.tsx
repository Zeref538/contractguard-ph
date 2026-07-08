import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ComplianceReport, Verdict } from '@/lib/api'

const VERDICT_STYLE: Record<Verdict, string> = {
  Compliant: 'bg-green-600/15 text-green-700 dark:text-green-400',
  'Non-compliant': 'bg-red-600/15 text-red-700 dark:text-red-400',
  Vague: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  Missing: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
}

const CATEGORY_LABEL: Record<string, string> = {
  probation: 'Probation',
  termination: 'Termination',
  pay: 'Pay / 13th month',
  benefits: 'SSS / PhilHealth / Pag-IBIG',
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

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader className='flex flex-row items-start justify-between gap-4'>
          <div>
            <CardTitle>Compliance report</CardTitle>
            <CardDescription>
              {report.filename} —{' '}
              {(Object.keys(VERDICT_STYLE) as Verdict[])
                .filter((v) => counts[v])
                .map((v) => `${counts[v]} ${v.toLowerCase()}`)
                .join(', ')}
            </CardDescription>
          </div>
          <Button variant='outline' onClick={onReset}>
            Check another contract
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-40'>Clause</TableHead>
                <TableHead className='w-32'>Verdict</TableHead>
                <TableHead className='w-56'>Citation</TableHead>
                <TableHead>Explanation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.clauses.map((c, i) => (
                <TableRow key={i}>
                  <TableCell className='font-medium'>
                    {CATEGORY_LABEL[c.clause_type] ?? c.clause_type}
                  </TableCell>
                  <TableCell>
                    <Badge className={VERDICT_STYLE[c.verdict]} variant='outline'>
                      {c.verdict}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-sm'>{c.citation}</TableCell>
                  <TableCell className='text-sm'>
                    {c.explanation}
                    {c.clause_text && (
                      <details className='mt-1'>
                        <summary className='text-muted-foreground cursor-pointer text-xs'>
                          Show clause text
                        </summary>
                        <blockquote className='text-muted-foreground mt-1 border-l-2 pl-2 text-xs whitespace-pre-wrap'>
                          {c.clause_text}
                        </blockquote>
                      </details>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className='text-muted-foreground mt-4 text-xs'>{report.disclaimer}</p>
        </CardContent>
      </Card>
    </div>
  )
}
