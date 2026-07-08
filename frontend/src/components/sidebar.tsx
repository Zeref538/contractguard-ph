import {
  FileText,
  LogOut,
  Plus,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Wordmark } from '@/components/logo'
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
}

export function Sidebar({
  history,
  activeId,
  open,
  onClose,
  onNew,
  onSelect,
  onDelete,
}: Props) {
  const { user, signOut } = useAuth()
  const groups = groupHistory(history)

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
          'border-border/60 bg-card/40 fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r backdrop-blur-xl transition-transform duration-200 md:static md:z-auto md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className='flex items-center justify-between px-4 py-4'>
          <Wordmark />
          <button
            onClick={onClose}
            className='text-muted-foreground hover:text-foreground md:hidden'
            aria-label='Close sidebar'
          >
            <X className='size-5' />
          </button>
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
              <ShieldAlert className='mx-auto mb-2 size-6 opacity-50' />
              No reviews yet. Bantay is standing by.
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label} className='mb-4'>
                <p className='text-muted-foreground px-2 py-1.5 text-[11px] font-semibold tracking-wide uppercase'>
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
                          className='text-muted-foreground hover:text-destructive shrink-0 opacity-0 transition-opacity group-hover:opacity-100'
                        >
                          <Trash2 className='size-3.5' />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </nav>

        {user && (
          <div className='border-border/60 flex items-center gap-3 border-t px-4 py-3'>
            <div className='from-primary/70 to-primary/30 flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-semibold text-white'>
              {initials(user)}
            </div>
            <div className='min-w-0 flex-1'>
              <p className='truncate text-sm font-medium'>{user.name}</p>
              <p className='text-muted-foreground truncate text-xs'>
                {user.email}
              </p>
            </div>
            <button
              onClick={signOut}
              aria-label='Sign out'
              className='text-muted-foreground hover:text-foreground'
            >
              <LogOut className='size-4' />
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
