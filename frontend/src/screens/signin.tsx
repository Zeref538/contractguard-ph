import { useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeSlash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LogoMark } from '@/components/logo'
import { useAuth, type User } from '@/lib/auth'
import { SUPABASE_CONFIGURED } from '@/lib/supabase'

function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox='0 0 24 24' className={className} aria-hidden='true'>
      <path
        fill='#4285F4'
        d='M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81Z'
      />
      <path
        fill='#34A853'
        d='M12 24c3.24 0 5.96-1.07 7.93-2.91l-3.87-3c-1.07.72-2.44 1.14-4.06 1.14-3.12 0-5.77-2.11-6.71-4.95H1.29v3.09A11.99 11.99 0 0 0 12 24Z'
      />
      <path
        fill='#FBBC05'
        d='M5.29 14.28A7.2 7.2 0 0 1 4.91 12c0-.79.14-1.56.38-2.28V6.63H1.29a11.99 11.99 0 0 0 0 10.74l4-3.09Z'
      />
      <path
        fill='#EA4335'
        d='M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.69 1.29 6.63l4 3.09C6.23 6.88 8.88 4.77 12 4.77Z'
      />
    </svg>
  )
}

function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? ''
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(' ')
}

export function SignInScreen() {
  const { signIn, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [googleBusy, setGoogleBusy] = useState(false)

  async function google() {
    setErr(null)
    setGoogleBusy(true)
    try {
      await signInWithGoogle() // redirects away on success
    } catch {
      setErr('Google sign-in is unavailable right now. Try email instead.')
      setGoogleBusy(false)
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!email.includes('@') || password.length < 4) {
      setErr('Enter a valid email and a password of at least 4 characters.')
      return
    }
    const user: User = {
      email: email.trim(),
      name: (mode === 'signup' && name.trim()) || nameFromEmail(email),
    }
    signIn(user)
  }

  function guest() {
    signIn({ name: 'Guest', email: 'guest@local' })
  }

  return (
    <div className='mx-auto flex min-h-svh max-w-sm flex-col justify-center px-6 py-12'>
      <div className='mb-8 flex flex-col items-center text-center'>
        <div className='relative mb-4'>
          <div className='bg-primary/25 absolute inset-0 rounded-full blur-2xl' />
          <LogoMark className='relative size-14' />
        </div>
        <p className='mb-3 text-lg font-semibold tracking-tight'>
          Aegix <span className='text-primary'>AI</span>
        </p>
        <h1 className='text-2xl font-semibold tracking-tight'>
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className='text-muted-foreground mt-2 text-sm text-balance'>
          Sign in to save your contract reviews and pick up where you left
          off.
        </p>
      </div>

      <form
        onSubmit={submit}
        className='border-border/70 bg-card/60 space-y-4 rounded-2xl border p-6 backdrop-blur-sm'
      >
        {SUPABASE_CONFIGURED && (
          <>
            <Button
              type='button'
              variant='outline'
              onClick={google}
              disabled={googleBusy}
              className='w-full gap-2.5'
            >
              <GoogleG className='size-4' />
              {googleBusy ? 'Redirecting to Google…' : 'Continue with Google'}
            </Button>
            <div className='flex items-center gap-3'>
              <div className='bg-border/70 h-px flex-1' />
              <span className='text-muted-foreground text-xs'>
                or with email
              </span>
              <div className='bg-border/70 h-px flex-1' />
            </div>
          </>
        )}
        {mode === 'signup' && (
          <div className='space-y-1.5'>
            <label htmlFor='name' className='text-sm font-medium'>
              Full name
            </label>
            <Input
              id='name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Juan dela Cruz'
              autoComplete='name'
            />
          </div>
        )}
        <div className='space-y-1.5'>
          <label htmlFor='email' className='text-sm font-medium'>
            Email
          </label>
          <Input
            id='email'
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder='you@example.com'
            autoComplete='email'
          />
        </div>
        <div className='space-y-1.5'>
          <label htmlFor='password' className='text-sm font-medium'>
            Password
          </label>
          <div className='relative'>
            <Input
              id='password'
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='••••••••'
              autoComplete={
                mode === 'signin' ? 'current-password' : 'new-password'
              }
              className='pr-10'
            />
            <button
              type='button'
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Hide password' : 'Show password'}
              className='text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-10 items-center justify-center'
            >
              {show ? (
                <EyeSlash className='size-4' />
              ) : (
                <Eye className='size-4' />
              )}
            </button>
          </div>
        </div>

        {err && <p className='text-destructive text-sm'>{err}</p>}

        <Button type='submit' className='w-full gap-2'>
          {mode === 'signin' ? 'Sign in' : 'Create account'}
          <ArrowRight className='size-4' />
        </Button>

        <p className='text-muted-foreground text-center text-xs'>
          Demo mode — your account and history stay in this browser.
        </p>
      </form>

      <div className='mt-5 flex flex-col items-center gap-3 text-sm'>
        <button
          onClick={() => {
            setErr(null)
            setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
          }}
          className='text-muted-foreground hover:text-foreground'
        >
          {mode === 'signin'
            ? "Don't have an account? Create one"
            : 'Already have an account? Sign in'}
        </button>
        <button
          onClick={guest}
          className='text-primary font-medium hover:underline'
        >
          Continue as guest
        </button>
      </div>
    </div>
  )
}
