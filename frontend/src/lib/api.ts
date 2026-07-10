const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
// Aegix AI — frontend API client

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

async function parse(res: Response): Promise<ComplianceReport> {
  if (!res.ok) {
    const detail = await res
      .json()
      .then((b) => b.detail as string)
      .catch(() => res.statusText)
    throw new Error(detail || 'Analysis failed')
  }
  return res.json()
}

export async function analyzeContract(
  file: File,
  signal?: AbortSignal
): Promise<ComplianceReport> {
  const form = new FormData()
  form.append('file', file)
  return parse(
    await fetch(`${API_BASE}/analyze`, { method: 'POST', body: form, signal })
  )
}

export async function analyzeText(
  text: string,
  filename?: string,
  signal?: AbortSignal
): Promise<ComplianceReport> {
  return parse(
    await fetch(`${API_BASE}/analyze-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, filename }),
      signal,
    })
  )
}
