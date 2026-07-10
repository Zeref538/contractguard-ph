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

/** Events streamed by the backend as each clause resolves. */
export type StreamEvent =
  | { type: 'stage'; stage: string }
  | {
      type: 'segmented'
      total: number
      clauses: { index: number; clause_type: string }[]
    }
  | { type: 'verdict'; index: number; clause: ClauseReport }
  | { type: 'done'; report: ComplianceReport }

type OnEvent = (event: StreamEvent) => void

async function errorFrom(res: Response): Promise<string> {
  return res
    .json()
    .then((b) => (b.detail as string) || res.statusText)
    .catch(() => res.statusText)
}

/**
 * Read an SSE body from a POST response. EventSource only speaks GET, so we
 * parse the `event:`/`data:` framing off the fetch stream ourselves — which
 * also lets us pass an AbortSignal.
 */
async function readStream(
  res: Response,
  onEvent: OnEvent
): Promise<ComplianceReport> {
  if (!res.ok) throw new Error(await errorFrom(res))
  if (!res.body) throw new Error('Streaming is not supported by this browser.')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let report: ComplianceReport | null = null

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let split: number
    while ((split = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, split)
      buffer = buffer.slice(split + 2)

      let name = 'message'
      let data = ''
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) name = line.slice(6).trim()
        else if (line.startsWith('data:')) data += line.slice(5).trim()
      }
      if (!data) continue

      const payload = JSON.parse(data)
      // The response already committed a 200, so failures arrive as events
      if (name === 'error') throw new Error(payload.detail)
      if (name === 'done') report = payload.report
      onEvent({ type: name, ...payload } as StreamEvent)
    }
  }

  if (!report) throw new Error('The analysis ended before finishing.')
  return report
}

export async function analyzeContract(
  file: File,
  onEvent: OnEvent,
  signal?: AbortSignal
): Promise<ComplianceReport> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/analyze/stream`, {
    method: 'POST',
    body: form,
    signal,
  })
  return readStream(res, onEvent)
}

export async function analyzeText(
  text: string,
  filename: string,
  onEvent: OnEvent,
  signal?: AbortSignal
): Promise<ComplianceReport> {
  const res = await fetch(`${API_BASE}/analyze-text/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, filename }),
    signal,
  })
  return readStream(res, onEvent)
}
