import { useEffect, useMemo, useState } from 'react'
import { Loader2, MailCheck, TriangleAlert } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function sanitizeRedirect(value: string | null) {
  if (!value || !value.startsWith('/')) return '/'
  if (value.startsWith('//')) return '/'
  if (value.startsWith('/login')) return '/'
  return value
}

function friendlyAuthError(message: string) {
  const text = String(message || '').toLowerCase()

  if (text.includes('email link is invalid') || text.includes('expired')) {
    return '登录链接已失效，请重新发送。'
  }
  if (text.includes('rate limit')) {
    return '发送太频繁了，请稍后再试。'
  }
  if (text.includes('invalid email')) {
    return '请输入有效的邮箱地址。'
  }

  return '发送登录链接失败，请稍后再试。'
}

function readCallbackError() {
  const search = new URLSearchParams(window.location.search)
  const hash = window.location.hash.startsWith('#')
    ? new URLSearchParams(window.location.hash.slice(1))
    : new URLSearchParams()
  const raw = hash.get('error_description') || search.get('error_description') || hash.get('error') || search.get('error')
  return raw ? friendlyAuthError(decodeURIComponent(raw)) : ''
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, loading, sendMagicLink } = useAuth()

  const redirectTarget = useMemo(
    () => sanitizeRedirect(searchParams.get('redirect')),
    [searchParams]
  )

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [sentTo, setSentTo] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const callbackError = readCallbackError()
    if (callbackError) {
      setError(callbackError)
    }
  }, [])

  useEffect(() => {
    if (loading || !user) return
    navigate(redirectTarget, { replace: true })
  }, [loading, user, navigate, redirectTarget])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError('请输入邮箱地址。')
      return
    }
    if (!isValidEmail(normalizedEmail)) {
      setError('请输入有效的邮箱地址。')
      return
    }

    setError('')
    setStatus('sending')

    const redirectUrl = new URL('/login', window.location.origin)
    if (redirectTarget && redirectTarget !== '/') {
      redirectUrl.searchParams.set('redirect', redirectTarget)
    }

    const { error: sendError } = await sendMagicLink(normalizedEmail, redirectUrl.toString())

    if (sendError) {
      setStatus('idle')
      setError(friendlyAuthError(sendError.message))
      return
    }

    setSentTo(normalizedEmail)
    setStatus('sent')
  }

  const isSending = status === 'sending'

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <section className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <Logo size={36} />
          <div>
            <h1 className="text-2xl font-semibold text-foreground">登录 Pocket Brain</h1>
            <p className="text-sm text-muted-foreground">输入邮箱，我们会发送一个登录链接给你</p>
          </div>
        </div>

        {loading && user ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" />
            正在完成登录…
          </div>
        ) : status === 'sent' ? (
          <div className="space-y-4 rounded-xl border border-border bg-card px-5 py-5 shadow-sm">
            <div className="flex items-start gap-3">
              <MailCheck size={20} className="mt-0.5 text-primary" />
              <div className="space-y-1">
                <h2 className="text-base font-medium text-foreground">登录链接已发送</h2>
                <p className="text-sm text-muted-foreground">
                  请前往 <span className="font-medium text-foreground">{sentTo}</span>，点击邮件中的登录链接继续。
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={() => setStatus('idle')}>重新发送</Button>
              <Button type="button" variant="outline" onClick={() => setEmail('')}>更换邮箱</Button>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-sm font-medium text-foreground">
                邮箱
              </label>
              <Input
                id="login-email"
                type="email"
                value={email}
                autoFocus
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                aria-invalid={error ? 'true' : 'false'}
                disabled={isSending}
                onChange={event => setEmail(event.target.value)}
              />
              {error && (
                <p className="text-sm text-destructive flex items-start gap-1.5" aria-live="polite">
                  <TriangleAlert size={14} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" />
                  发送中…
                </>
              ) : (
                '发送登录链接'
              )}
            </Button>

            <p className={cn('text-xs text-muted-foreground', error && 'pt-1')}>
              支持国内外常见邮箱，点击邮件中的链接后会自动回到你刚才要去的页面。
            </p>
          </form>
        )}
      </section>
    </main>
  )
}

