import { useEffect, useRef, useState } from 'react'
import {
  CaretDown,
  FileText,
  SignOut,
  Plus,
  ShieldWarning,
  Trash,
  TrashSimple,
  X,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Wordmark } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'
import { initials, useAuth } from '@/lib/auth'
import { groupHistory, type HistoryItem } from '@/lib/history'

interface Props {
  history: HistoryItem[]
  activeId: string | null
  open: boolean
  onClose: () => void
  onNew: () => void
  onSelect: (item: HistoryItem) => void
  onDelete: (id: string) => void
  onClearAll: () => void
}

export function Sidebar({
  history,
  activeId,
  open,
  onClose,
  onNew,
  onSelect,
  onDelete,
  onClearAll,
}: Props) {
  const { user, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const groups = groupHistory(history)

  useEffect(() => {
    if (!menuOpen) return
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  return (
    <>
      {open && (
        <div
          className='fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden'
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          'border-border/60 bg-card/40 fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r backdrop-blur-xl transition-transform duration-200',
          'md:sticky md:top-0 md:z-auto md:h-svh md:translate-x-0 md:self-start',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className='flex items-center justify-between px-4 py-4'>
          <Wordmark />
          <div className='flex items-center gap-1'>
            <ThemeToggle />
            <button
              onClick={onClose}
              className='text-muted-foreground hover:text-foreground flex size-11 items-center justify-center rounded-lg md:hidden'
              aria-label='Close sidebar'
            >
              <X className='size-5' />
            </button>
          </div>
        </div>

        <div className='px-3'>
          <Button onClick={onNew} className='w-full justify-start gap-2'>
            <Plus className='size-4' />
            New analysis
          </Button>
        </div>

        <nav className='mt-4 flex-1 overflow-y-auto px-3 pb-4'>
          {history.length === 0 ? (
            <div className='text-muted-foreground mt-8 px-2 text-center text-xs'>
              <ShieldWarning className='mx-auto mb-2 size-6 opacity-50' />
              No reviews yet. Upload a contract to get started.
            </div>
          ) : (
            <>
              <div className='mb-1 flex items-center justify-between px-2'>
                <span className='text-muted-foreground text-[11px] font-semibold tracking-wide uppercase'>
                  History
                </span>
                <button
                  onClick={onClearAll}
                  className='text-muted-foreground hover:text-destructive -m-1.5 flex items-center gap-1 p-1.5 text-[11px]'
                >
                  <Trash className='size-3.5' />
                  Clear
                </button>
              </div>
              {groups.map((group) => (
                <div key={group.label} className='mb-4'>
                  <p className='text-muted-foreground px-2 py-1.5 text-[11px] font-medium'>
                    {group.label}
                  </p>
                  <ul className='space-y-0.5'>
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <div
                          className={cn(
                            'group flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors',
                            item.id === activeId
                              ? 'bg-secondary text-foreground'
                              : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                          )}
                        >
                          <button
                            onClick={() => onSelect(item)}
                            className='flex min-w-0 flex-1 items-center gap-2 text-left'
                          >
                            <FileText className='size-3.5 shrink-0' />
                            <span className='truncate'>{item.filename}</span>
                          </button>
                          {item.issues > 0 && (
                            <span className='bg-red-500/15 text-red-400 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums'>
                              {item.issues}
                            </span>
                          )}
                          <button
                            onClick={() => onDelete(item.id)}
                            aria-label={`Delete ${item.filename}`}
                            // Always visible on touch (no hover); reveal on hover for pointers
                            className='text-muted-foreground hover:text-destructive -m-2 shrink-0 p-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100'
                          >
                            <TrashSimple className='size-4' />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          )}
        </nav>

        {user && (
          <div ref={menuRef} className='border-border/60 relative border-t p-3'>
            {menuOpen && (
              <div className='border-border bg-popover absolute right-3 bottom-full left-3 mb-2 overflow-hidden rounded-lg border shadow-xl'>
                <div className='border-border/60 border-b px-3 py-2.5'>
                  <p className='truncate text-sm font-medium'>{user.name}</p>
                  <p className='text-muted-foreground truncate text-xs'>
                    {user.email}
                  </p>
                </div>
                <div className='text-muted-foreground px-3 py-2 text-xs'>
                  {history.length} contract
                  {history.length === 1 ? '' : 's'} reviewed
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false)
                    signOut()
                  }}
                  className='hover:bg-secondary text-destructive flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm'
                >
                  <SignOut className='size-4' />
                  Sign out
                </button>
              </div>
            )}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className='hover:bg-secondary/60 flex w-full items-center gap-3 rounded-lg px-1.5 py-1.5 text-left transition-colors'
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=''
                  referrerPolicy='no-referrer'
                  className='size-8 shrink-0 rounded-full object-cover'
                />
              ) : (
                <div className='from-primary/70 to-primary/30 flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold text-white'>
                  {initials(user)}
                </div>
              )}
              <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-medium'>{user.name}</p>
                <p className='text-muted-foreground truncate text-xs'>
                  {user.email}
                </p>
              </div>
              <CaretDown
                className={cn(
                  'text-muted-foreground size-4 shrink-0 transition-transform',
                  menuOpen && 'rotate-180'
                )}
              />
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
