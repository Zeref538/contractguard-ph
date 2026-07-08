import { useRef, useState } from 'react'
import { Scale } from 'lucide-react'
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
    <div className='flex min-h-svh flex-col'>
      <header className='border-b bg-card'>
        <div className='mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-4 sm:px-6'>
          <div className='bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg'>
            <Scale className='size-5' aria-hidden />
          </div>
          <div>
            <p className='font-serif text-xl leading-tight font-semibold tracking-tight'>
              ContractGuard <span className='text-accent'>PH</span>
            </p>
            <p className='text-muted-foreground text-xs'>
              Employment contract compliance · Philippine Labor Code
            </p>
          </div>
        </div>
      </header>

      <main className='mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6'>
        {report ? (
          <ReportScreen report={report} onReset={reset} />
        ) : (
          <UploadScreen onUpload={handleUpload} loading={loading} error={error} />
        )}
      </main>

      <footer className='border-t'>
        <div className='text-muted-foreground mx-auto w-full max-w-6xl px-4 py-4 text-xs sm:px-6'>
          ContractGuard PH is an automated screening tool, not legal advice.
          Consult a qualified Philippine labor lawyer for binding guidance.
        </div>
      </footer>
    </div>
  )
}
