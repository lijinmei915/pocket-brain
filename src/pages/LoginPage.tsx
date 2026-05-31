import { useEffect, useMemo, useState } from 'react'
import { Loader2, MailCheck } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/ui/Logo'
import { FormFieldMessage } from '@/components/patterns/FormFieldMessage'
import { useAuth } from '@/hooks/use-auth'

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

  if (
    text.includes('redirect') ||
    text.includes('not allowed') ||
    text.includes('invalid redirect') ||
    text.includes('redirect_to')
  ) {
    return '登录回跳地址未配置，请检查 Supabase Redirect URLs。'
  }
  if (
    text.includes('email provider') ||
    text.includes('smtp') ||
    text.includes('send email') ||
    text.includes('sending email')
  ) {
    return '邮件服务暂时不可用，请检查 Supabase 邮件配置。'
  }
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

function isLocalHostName(hostname: string) {
  return ['localhost', '127.0.0.1', '::1'].includes(hostname)
}

function getAppOrigin() {
  const currentOrigin = window.location.origin
  const configuredUrl = String(import.meta.env.VITE_APP_URL || '').trim()
  if (!configuredUrl) return currentOrigin

  try {
    const configured = new URL(configuredUrl)
    const isCurrentLocal = isLocalHostName(window.location.hostname)
    const isConfiguredLocal = isLocalHostName(configured.hostname)

    if (isCurrentLocal || configured.host === window.location.host) {
      return configured.origin
    }

    if (!isConfiguredLocal) {
      console.warn('[PB] VITE_APP_URL differs from current host, using current origin for login redirect:', {
        configuredOrigin: configured.origin,
        currentOrigin,
      })
    }
  } catch {
    console.warn('[PB] Invalid VITE_APP_URL, fallback to current origin:', configuredUrl)
  }

  return currentOrigin
}

function logMagicLinkError(error: Error, redirectTo: string) {
  console.error('[PB] send magic link failed:', {
    message: error.message,
    name: error.name,
    redirectTo,
  })
}

function buildLoginRedirectUrl(redirectTarget: string) {
  const redirectUrl = new URL('/login', getAppOrigin())
  if (redirectTarget && redirectTarget !== '/') {
    redirectUrl.searchParams.set('redirect', redirectTarget)
  }

  return redirectUrl
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

    const redirectUrl = buildLoginRedirectUrl(redirectTarget)
    const { error: sendError } = await sendMagicLink(normalizedEmail, redirectUrl.toString())

    if (sendError) {
      logMagicLinkError(sendError, redirectUrl.toString())
      setStatus('idle')
      setError(friendlyAuthError(sendError.message))
      return
    }

    setSentTo(normalizedEmail)
    setStatus('sent')
  }

  const isSending = status === 'sending'
  const showError = Boolean(error)

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eef3f8] px-6 py-10 text-foreground sm:px-8 sm:py-14">
      <div
        className="absolute inset-0 opacity-70"
        aria-hidden="true"
        style={{
          backgroundImage: `
            linear-gradient(rgba(108, 130, 160, 0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(108, 130, 160, 0.07) 1px, transparent 1px)
          `,
          backgroundPosition: 'center center',
          backgroundSize: '26px 26px',
        }}
      />
      <div
        className="absolute inset-x-0 top-0 h-40 opacity-90"
        aria-hidden="true"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0) 100%)',
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-56 opacity-70"
        aria-hidden="true"
        style={{
          background: 'linear-gradient(180deg, rgba(238,243,248,0) 0%, rgba(224,232,240,0.9) 100%)',
        }}
      />

      <section className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center justify-center">
        <div className="w-full max-w-2xl">
          <div className="mx-auto max-w-xl animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <div className="mb-8 text-center sm:mb-10">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-black/8 bg-white/88 shadow-[0_10px_30px_rgba(41,56,78,0.08)] backdrop-blur-sm">
                <Logo size={34} />
              </div>
              <h1 className="text-balance text-[2.2rem] font-semibold tracking-tight text-slate-950 sm:text-5xl">
                登录 Pocket Brain
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-600 sm:text-lg">
                输入邮箱，我们会发送一个登录链接给你。
              </p>
            </div>

            {loading && user ? (
              <div className="animate-in fade-in-0 slide-in-from-bottom-3 rounded-[24px] border border-slate-200/90 bg-white/90 pad-card-xl text-sm text-slate-600 shadow-[var(--shadow-lg)] backdrop-blur-md duration-300">
                <div className="flex items-center gap-2.5">
                  <Loader2 size={16} className="animate-spin text-slate-500" />
                  正在完成登录…
                </div>
              </div>
            ) : status === 'sent' ? (
              <div className="animate-in fade-in-0 slide-in-from-bottom-3 stack-lg rounded-[28px] border border-slate-200/90 bg-white/92 pad-card-xl shadow-[var(--shadow-lg)] backdrop-blur-md duration-300">
                <div className="flex items-start gap-md">
                  <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50/80 text-emerald-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                    <MailCheck size={20} />
                  </div>
                  <div className="stack-sm">
                    <h2 className="text-lg font-semibold text-slate-950">登录链接已发送</h2>
                    <p className="text-sm leading-6 text-slate-600 sm:text-[15px]">
                      请前往 <span className="font-medium text-slate-950">{sentTo}</span>，点击邮件中的登录链接继续。
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-sm sm:flex-row sm-gap-md">
                  <Button type="button" size="lg" shadow="md" className="sm:flex-1" onClick={() => setStatus('idle')}>
                    重新发送
                  </Button>
                  <Button type="button" variant="ghost" size="lg" className="sm:flex-1" onClick={() => setEmail('')}>
                    更换邮箱
                  </Button>
                </div>
              </div>
            ) : (
              <form
                className="animate-in fade-in-0 slide-in-from-bottom-3 stack-lg rounded-[28px] border border-slate-200/90 bg-white/92 pad-card-xl shadow-[var(--shadow-lg)] backdrop-blur-md duration-300"
                onSubmit={handleSubmit}
              >
                <div className="stack-sm">
                  <label htmlFor="login-email" className="text-lg font-semibold text-foreground">
                    邮箱
                  </label>
                  <Input
                    id="login-email"
                    type="email"
                    size="xl"
                    shadow="none"
                    value={email}
                    autoFocus
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@example.com"
                    aria-invalid={showError ? 'true' : 'false'}
                    disabled={isSending}
                    className="border-input"
                    onChange={event => { setEmail(event.target.value); if (error) setError('') }}
                  />
                  <FormFieldMessage tone="error">{showError ? error : null}</FormFieldMessage>
                </div>

                <Button
                  type="submit"
                  size="xl"
                  shadow="md"
                  className="w-full"
                  disabled={isSending}
                >
                  {isSending ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      发送中…
                    </>
                  ) : (
                    '发送登录链接'
                  )}
                </Button>

                <div className="flex items-center gap-md pt-space-sm text-xs text-slate-500 sm:text-sm">
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="shrink-0">安全、快速、无密码登录</span>
                  <div className="h-px flex-1 bg-slate-200" />
                </div>

                <p className="text-center text-xs leading-6 text-slate-500 sm:text-sm">
                  支持国内外常见邮箱，点击邮件中的链接后会自动回到你刚才要去的页面。
                </p>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
