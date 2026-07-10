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
import { ThemeToggle } from './components/theme-toggle'
import { ConfirmDialog } from './components/confirm-dialog'
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
  const [confirmClear, setConfirmClear] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (user) setHistory(loadHistory(user.email))
  }, [user])

  if (!user) return <SignInScreen />

  function cancelPending() {
    abortRef.current?.abort()
    abortRef.current = null
  }

  async function run(fn: (signal: AbortSignal) => Promise<ComplianceReport>) {
    cancelPending()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)
    try {
      const result = await fn(controller.signal)
      const item = addHistory(user!.email, result)
      setHistory(loadHistory(user!.email))
      setReport(result)
      setActiveId(item.id)
    } catch (e) {
      // An aborted request is a user action, not an error to surface
      if (controller.signal.aborted) return
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setLoading(false)
      }
    }
  }

  const handleUpload = (file: File) =>
    run((signal) => analyzeContract(file, signal))
  const handleText = (text: string, title: string) =>
    run((signal) => analyzeText(text, title, signal))

  function newAnalysis() {
    cancelPending()
    setReport(null)
    setActiveId(null)
    setError(null)
    setLoading(false)
    setSidebarOpen(false)
  }

  function selectItem(item: HistoryItem) {
    cancelPending()
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
    clearHistory(user!.email)
    setHistory([])
    newAnalysis()
    setConfirmClear(false)
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
        onClearAll={() => setConfirmClear(true)}
      />

      {confirmClear && (
        <ConfirmDialog
          title='Delete all history?'
          body={`This permanently removes all ${history.length} saved analyses from this browser. It cannot be undone.`}
          confirmLabel='Delete all'
          onCancel={() => setConfirmClear(false)}
          onConfirm={clearAll}
        />
      )}

      <div className='flex min-w-0 flex-1 flex-col'>
        <header className='border-border/60 bg-background/70 sticky top-0 z-30 flex items-center gap-3 border-b px-4 py-3 backdrop-blur-md md:hidden'>
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label='Open menu'
            className='text-muted-foreground hover:text-foreground -ml-2 flex size-11 touch-manipulation items-center justify-center rounded-lg'
          >
            <List className='size-5' />
          </button>
          <LogoMark className='size-7' />
          <span className='text-sm font-semibold'>
            Aegix <span className='text-primary'>AI</span>
          </span>
          <ThemeToggle className='ml-auto' />
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
