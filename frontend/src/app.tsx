import { useEffect, useRef, useState } from 'react'
import { Menu } from 'lucide-react'
import { analyzeContract, type ComplianceReport } from './lib/api'
import { useAuth } from './lib/auth'
import {
  addHistory,
  deleteHistory,
  loadHistory,
  type HistoryItem,
} from './lib/history'
import { Sidebar } from './components/sidebar'
import { BantayMark } from './components/logo'
import { SignInScreen } from './screens/signin'
import { UploadScreen } from './screens/upload'
import { ReportScreen } from './screens/report'

export function App() {
  const { user } = useAuth()
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [report, setReport] = useState<ComplianceReport | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const abortRef = useRef(false)

  useEffect(() => {
    if (user) setHistory(loadHistory(user.email))
  }, [user])

  if (!user) return <SignInScreen />

  async function handleUpload(file: File) {
    setLoading(true)
    setError(null)
    abortRef.current = false
    try {
      const result = await analyzeContract(file)
      if (abortRef.current) return
      const item = addHistory(user!.email, result)
      setHistory(loadHistory(user!.email))
      setReport(result)
      setActiveId(item.id)
    } catch (e) {
      if (!abortRef.current)
        setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  function newAnalysis() {
    abortRef.current = true
    setReport(null)
    setActiveId(null)
    setError(null)
    setLoading(false)
    setSidebarOpen(false)
  }

  function selectItem(item: HistoryItem) {
    abortRef.current = true
    setLoading(false)
    setError(null)
    setReport(item.report)
    setActiveId(item.id)
    setSidebarOpen(false)
  }

  function removeItem(id: string) {
    const next = deleteHistory(user!.email, id)
    setHistory(next)
    if (id === activeId) newAnalysis()
  }

  return (
    <div className='flex min-h-svh'>
      <Sidebar
        history={history}
        activeId={activeId}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNew={newAnalysis}
        onSelect={selectItem}
        onDelete={removeItem}
      />

      <div className='flex min-w-0 flex-1 flex-col'>
        <header className='border-border/60 bg-background/70 sticky top-0 z-30 flex items-center gap-3 border-b px-4 py-3 backdrop-blur-md md:hidden'>
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label='Open menu'
            className='text-muted-foreground hover:text-foreground'
          >
            <Menu className='size-5' />
          </button>
          <BantayMark className='size-7' />
          <span className='text-sm font-semibold'>ContractGuard PH</span>
        </header>

        <main className='mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:py-12'>
          {report ? (
            <ReportScreen report={report} onReset={newAnalysis} />
          ) : (
            <UploadScreen
              onUpload={handleUpload}
              loading={loading}
              error={error}
            />
          )}
        </main>

        <footer className='border-border/60 border-t'>
          <div className='text-muted-foreground mx-auto w-full max-w-5xl px-4 py-4 text-xs sm:px-6'>
            Automated screening — not legal advice. Consult a qualified
            Philippine labor lawyer for binding guidance.
          </div>
        </footer>
      </div>
    </div>
  )
}
