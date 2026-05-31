import { VercelRequest, VercelResponse } from '@vercel/node'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    key: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY || '',
  }
}

function getRequestOrigin(req: VercelRequest) {
  const host = req.headers['x-forwarded-host'] || req.headers.host
  const protocol = req.headers['x-forwarded-proto'] || 'https'
  const firstHost = Array.isArray(host) ? host[0] : host
  const firstProtocol = Array.isArray(protocol) ? protocol[0] : protocol

  if (!firstHost) return ''
  return `${firstProtocol}://${firstHost}`
}

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin
  } catch {
    return ''
  }
}

function getConfiguredOrigins() {
  return [
    process.env.VITE_APP_URL,
    process.env.APP_URL,
    process.env.MAGIC_LINK_ALLOWED_ORIGINS,
  ]
    .filter(Boolean)
    .flatMap(value => String(value).split(','))
    .map(value => normalizeOrigin(value.trim()))
    .filter(Boolean)
}

function validateRedirectTo(req: VercelRequest, redirectTo: string) {
  let url: URL
  try {
    url = new URL(redirectTo)
  } catch {
    return { ok: false as const, error: 'Invalid redirect URL' }
  }

  if (url.pathname !== '/login') {
    return { ok: false as const, error: 'Invalid redirect path' }
  }

  const requestOrigin = normalizeOrigin(getRequestOrigin(req))
  const allowedOrigins = new Set([requestOrigin, ...getConfiguredOrigins()].filter(Boolean))
  if (!allowedOrigins.has(url.origin)) {
    return { ok: false as const, error: 'Redirect origin is not allowed' }
  }

  return { ok: true as const, url }
}

function readSupabaseError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback
  const data = payload as Record<string, unknown>
  return String(data.msg || data.message || data.error_description || data.error || fallback)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  const redirectTo = typeof req.body?.redirectTo === 'string' ? req.body.redirectTo : ''

  if (!emailPattern.test(email)) {
    return res.status(400).json({ error: 'Invalid email' })
  }

  const redirect = validateRedirectTo(req, redirectTo)
  if (!redirect.ok) {
    return res.status(400).json({ error: redirect.error })
  }

  const supabase = getSupabaseConfig()
  if (!supabase.url || !supabase.key) {
    return res.status(500).json({ error: 'Missing Supabase auth configuration' })
  }

  try {
    const response = await fetch(
      `${supabase.url}/auth/v1/otp?${new URLSearchParams({ redirect_to: redirect.url.toString() })}`,
      {
        method: 'POST',
        headers: {
          apikey: supabase.key,
          Authorization: `Bearer ${supabase.key}`,
          'Content-Type': 'application/json;charset=UTF-8',
          'X-Client-Info': 'pocket-brain-auth-proxy',
        },
        body: JSON.stringify({
          email,
          data: {},
          create_user: true,
          gotrue_meta_security: {},
        }),
      }
    )

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      const message = readSupabaseError(payload, response.statusText || 'Supabase auth error')
      console.error('[PB] magic link proxy error:', {
        status: response.status,
        message,
        redirectOrigin: redirect.url.origin,
      })
      return res.status(response.status).json({ error: message })
    }

    return res.status(200).json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[PB] magic link proxy fetch failed:', {
      message,
      redirectOrigin: redirect.url.origin,
    })
    return res.status(502).json({ error: 'Supabase auth API unavailable' })
  }
}
