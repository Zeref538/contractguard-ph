import { useRef, useState } from 'react'
import { analyzeContract, type ComplianceReport } from './lib/api'
import { UploadScreen } from './screens/upload'
import { ReportScreen } from './screens/report'

export function App() {
  const [report, setReport] = useState<ComplianceReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef(false)

  async function handleUpload(file: File) {
    setLoading(true)
    setError(null)
    abortRef.current = false
    try {
      const result = await analyzeContract(file)
      if (!abortRef.current) setReport(result)
    } catch (e) {
      if (!abortRef.current) setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    abortRef.current = true
    setReport(null)
    setError(null)
    setLoading(false)
  }

  return (
    <main className='mx-auto max-w-5xl px-4 py-10'>
      <header className='mb-8'>
        <h1 className='text-2xl font-bold tracking-tight'>ContractGuard PH</h1>
        <p className='text-muted-foreground text-sm'>
          Philippine employment contract compliance checker — not legal advice.
        </p>
      </header>
      {report ? (
        <ReportScreen report={report} onReset={reset} />
      ) : (
        <UploadScreen onUpload={handleUpload} loading={loading} error={error} />
      )}
    </main>
  )
}
