import { useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BantayMark } from '@/components/logo'
import { useAuth, type User } from '@/lib/auth'

function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? ''
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(' ')
}

export function SignInScreen() {
  const { signIn } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState<string | null>(null)

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
        <div className='relative mb-5'>
          <div className='bg-primary/25 absolute inset-0 rounded-full blur-2xl' />
          <BantayMark className='relative size-14' />
        </div>
        <h1 className='text-2xl font-semibold tracking-tight'>
          {mode === 'signin' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className='text-muted-foreground mt-2 text-sm text-balance'>
          Bantay keeps watch over your contract reviews. Sign in to save them
          and pick up where you left off.
        </p>
      </div>

      <form
        onSubmit={submit}
        className='border-border/70 bg-card/60 space-y-4 rounded-2xl border p-6 backdrop-blur-sm'
      >
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
                <EyeOff className='size-4' />
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
