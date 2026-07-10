import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL ?? ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

/** Google sign-in is only offered when Supabase credentials are present. */
export const SUPABASE_CONFIGURED = Boolean(url && anonKey)

// Always construct the client so imports never throw; when unconfigured it
// points at a placeholder and is never called (gated by SUPABASE_CONFIGURED).
export const supabase = createClient(
  SUPABASE_CONFIGURED ? url : 'https://placeholder.supabase.co',
  SUPABASE_CONFIGURED ? anonKey : 'placeholder'
)
