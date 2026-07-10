import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { SUPABASE_CONFIGURED, supabase } from './supabase'

export interface User {
  name: string
  email: string
  avatarUrl?: string
}

interface AuthState {
  user: User | null
  signIn: (user: User) => void
  signInWithGoogle: () => Promise<void>
  signOut: () => void
}

const STORAGE_KEY = 'contractguard.user'

function readUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

function userFromSession(session: Session): User {
  const meta = session.user.user_metadata ?? {}
  const email = session.user.email ?? ''
  return {
    email,
    name: (meta.full_name || meta.name || email.split('@')[0]) as string,
    avatarUrl: meta.avatar_url as string | undefined,
  }
}

const AuthContext = createContext<AuthState>({
  user: null,
  signIn: () => {},
  signInWithGoogle: async () => {},
  signOut: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readUser)

  // Pick up the Google OAuth session: on first load after the redirect,
  // supabase-js parses the tokens from the URL and emits SIGNED_IN here.
  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const u = userFromSession(session)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
        setUser(u)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const signIn = (u: User) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    setUser(u)
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }

  const signOut = () => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
    if (SUPABASE_CONFIGURED) void supabase.auth.signOut()
  }

  return (
    <AuthContext
      value={{ user, signIn, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)

export function initials(user: User): string {
  const source = user.name.trim() || user.email
  const parts = source.split(/[\s@.]+/).filter(Boolean)
  return (parts[0]?.[0] ?? '?').concat(parts[1]?.[0] ?? '').toUpperCase()
}
