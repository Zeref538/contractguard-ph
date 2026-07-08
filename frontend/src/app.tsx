import { useEffect, useRef, useState } from 'react'
import { List } from '@phosphor-icons/react'
import {
  analyzeContract,
  analyzeText,
  type ComplianceReport,
} from './lib/api'
import { useAuth } from './lib/auth'
import {
  addHistory,
  clearHistory,
  deleteHistory,
  loadHistory,
  type HistoryItem,
} from './lib/history'
import { Sidebar } from './components/sidebar'
import { LogoMark } from './components/logo'
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

  async function run(fn: () => Promise<ComplianceReport>) {
    setLoading(true)
    setError(null)
    abortRef.current = false
    try {
      const result = await fn()
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

  const handleUpload = (file: File) => run(() => analyzeContract(file))
  const handleText = (text: string) => run(() => analyzeText(text))

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

  function clearAll() {
    if (!confirm('Delete all analysis history? This cannot be undone.')) return
    clearHistory(user!.email)
    setHistory([])
    newAnalysis()
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
        onClearAll={clearAll}
      />

      <div className='flex min-w-0 flex-1 flex-col'>
        <header className='border-border/60 bg-background/70 sticky top-0 z-30 flex items-center gap-3 border-b px-4 py-3 backdrop-blur-md md:hidden'>
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label='Open menu'
            className='text-muted-foreground hover:text-foreground'
          >
            <List className='size-5' />
          </button>
          <LogoMark className='size-7' />
          <span className='text-sm font-semibold'>
            Aegix <span className='text-primary'>AI</span>
          </span>
        </header>

        <main className='mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:py-12'>
          {report ? (
            <ReportScreen report={report} onReset={newAnalysis} />
          ) : (
            <UploadScreen
              onUpload={handleUpload}
              onAnalyzeText={handleText}
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
