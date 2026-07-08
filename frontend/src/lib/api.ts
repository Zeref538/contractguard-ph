const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export type Verdict = 'Compliant' | 'Non-compliant' | 'Vague' | 'Missing'

export interface ClauseReport {
  clause_type: string
  clause_text: string | null
  verdict: Verdict
  citation: string
  explanation: string
}

export interface ComplianceReport {
  filename: string
  clauses: ClauseReport[]
  disclaimer: string
}

export async function analyzeContract(file: File): Promise<ComplianceReport> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/analyze`, { method: 'POST', body: form })
  if (!res.ok) {
    const detail = await res
      .json()
      .then((b) => b.detail as string)
      .catch(() => res.statusText)
    throw new Error(detail || 'Analysis failed')
  }
  return res.json()
}
