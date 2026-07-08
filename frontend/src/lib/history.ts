import type { ComplianceReport } from './api'

export interface HistoryItem {
  id: string
  filename: string
  createdAt: number
  issues: number
  report: ComplianceReport
}

const keyFor = (email: string) => `contractguard.history.${email}`

export function loadHistory(email: string): HistoryItem[] {
  try {
    const raw = localStorage.getItem(keyFor(email))
    return raw ? (JSON.parse(raw) as HistoryItem[]) : []
  } catch {
    return []
  }
}

function persist(email: string, items: HistoryItem[]) {
  localStorage.setItem(keyFor(email), JSON.stringify(items))
}

export function addHistory(
  email: string,
  report: ComplianceReport
): HistoryItem {
  const issues = report.clauses.filter(
    (c) => c.verdict === 'Non-compliant' || c.verdict === 'Missing'
  ).length
  const item: HistoryItem = {
    id: crypto.randomUUID(),
    filename: report.filename,
    createdAt: Date.now(),
    issues,
    report,
  }
  const items = [item, ...loadHistory(email)].slice(0, 100)
  persist(email, items)
  return item
}

export function deleteHistory(email: string, id: string): HistoryItem[] {
  const items = loadHistory(email).filter((i) => i.id !== id)
  persist(email, items)
  return items
}

/** Group history items into Today / Yesterday / Earlier buckets. */
export function groupHistory(
  items: HistoryItem[]
): { label: string; items: HistoryItem[] }[] {
  const now = new Date()
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime()
  const startOfYesterday = startOfToday - 86_400_000

  const buckets: Record<string, HistoryItem[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  }
  for (const item of items) {
    if (item.createdAt >= startOfToday) buckets.Today.push(item)
    else if (item.createdAt >= startOfYesterday) buckets.Yesterday.push(item)
    else buckets.Earlier.push(item)
  }
  return Object.entries(buckets)
    .filter(([, list]) => list.length > 0)
    .map(([label, list]) => ({ label, items: list }))
}
