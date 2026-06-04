import { createClient, type AuthChangeEvent, type Session, type User } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY

function isLocalHost() {
  if (typeof window === 'undefined') return false
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
}

export function isDevAuthBypassEnabled() {
  return import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true' && isLocalHost()
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn('[PB] Supabase auth env is missing. Login will not work until VITE_SUPABASE_URL and VITE_SUPABASE_KEY are configured.')
}

export const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export type AuthState = {
  session: Session | null
  user: User | null
}

export async function getAuthState(): Promise<AuthState> {
  if (isDevAuthBypassEnabled()) {
    return { session: null, user: null }
  }

  const { data } = await supabaseAuth.auth.getSession()
  return {
    session: data.session ?? null,
    user: data.session?.user ?? null,
  }
}

export async function getAccessToken() {
  if (isDevAuthBypassEnabled()) return null

  const { data } = await supabaseAuth.auth.getSession()
  return data.session?.access_token ?? null
}

export async function getCurrentUserId() {
  if (isDevAuthBypassEnabled()) return null

  const { data } = await supabaseAuth.auth.getSession()
  return data.session?.user?.id ?? null
}

export async function sendMagicLink(email: string, redirectTo: string) {
  if (isDevAuthBypassEnabled()) {
    return { data: { user: null, session: null }, error: null }
  }

  try {
    const response = await fetch('/api/send-magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, redirectTo }),
    })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      const message = typeof payload?.error === 'string' ? payload.error : 'Failed to send magic link'
      return { data: { user: null, session: null }, error: new Error(message) }
    }

    return { data: { user: null, session: null }, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { data: { user: null, session: null }, error: new Error(message || 'Network error') }
  }
}

export async function signOut() {
  if (isDevAuthBypassEnabled()) {
    return { error: null }
  }

  return supabaseAuth.auth.signOut()
}

export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  if (isDevAuthBypassEnabled()) {
    return {
      data: {
        subscription: {
          unsubscribe() {},
        },
      },
    }
  }

  return supabaseAuth.auth.onAuthStateChange(callback)
}
