import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import {
  getAuthState,
  onAuthStateChange,
  sendMagicLink as sendMagicLinkRequest,
  signOut as signOutRequest,
} from '@/utils/auth'

type AuthContextValue = {
  session: Session | null
  user: User | null
  loading: boolean
  sendMagicLink: (email: string, redirectTo: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    getAuthState()
      .then(({ session: nextSession, user: nextUser }) => {
        if (!mounted) return
        setSession(nextSession)
        setUser(nextUser)
      })
      .catch(error => {
        console.error('[PB] auth init error:', error)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    const { data: subscription } = onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user,
    loading,
    async sendMagicLink(email: string, redirectTo: string) {
      const { error } = await sendMagicLinkRequest(email, redirectTo)
      return { error }
    },
    async signOut() {
      const { error } = await signOutRequest()
      return { error }
    },
  }), [session, user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}

