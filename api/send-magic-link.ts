import { VercelRequest, VercelResponse } from '@vercel/node'
import { request } from 'node:https'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const requestTimeoutMs = 8000
const retryDelayMs = 350

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

function describeError(error: unknown) {
  if (!(error instanceof Error)) {
    return { message: String(error) }
  }

  const cause = (error as Error & { cause?: unknown }).cause
  const causeDetails = cause && typeof cause === 'object'
    ? {
        name: 'name' in cause ? String(cause.name) : undefined,
        message: 'message' in cause ? String(cause.message) : undefined,
        code: 'code' in cause ? String(cause.code) : undefined,
        errno: 'errno' in cause ? String(cause.errno) : undefined,
        syscall: 'syscall' in cause ? String(cause.syscall) : undefined,
        hostname: 'hostname' in cause ? String(cause.hostname) : undefined,
      }
    : cause
      ? { message: String(cause) }
      : undefined

  return {
    name: error.name,
    message: error.message,
    cause: causeDetails,
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function postJsonWithFetch(url: string, key: string, body: object) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs)

  try {
    return await fetch(url, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json;charset=UTF-8',
        'X-Client-Info': 'pocket-brain-auth-proxy',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function postJsonWithHttps(url: string, key: string, body: object) {
  const target = new URL(url)
  const payload = JSON.stringify(body)

  return new Promise<Response>((resolve, reject) => {
    const req = request({
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || 443,
      path: `${target.pathname}${target.search}`,
      method: 'POST',
      family: 4,
      timeout: requestTimeoutMs,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json;charset=UTF-8',
        'Content-Length': Buffer.byteLength(payload),
        'X-Client-Info': 'pocket-brain-auth-proxy-https',
      },
    }, response => {
      const chunks: Buffer[] = []
      response.on('data', chunk => chunks.push(Buffer.from(chunk)))
      response.on('end', () => {
        resolve(new Response(Buffer.concat(chunks), {
          status: response.statusCode || 500,
          statusText: response.statusMessage,
          headers: response.headers as HeadersInit,
        }))
      })
    })

    req.on('timeout', () => {
      req.destroy(new Error('Supabase auth request timed out'))
    })
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

async function postSupabaseOtp(url: string, key: string, body: object) {
  let lastError: unknown = null

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await postJsonWithFetch(url, key, body)
      return { response, transport: 'fetch', attempts: attempt }
    } catch (error) {
      lastError = error
      console.error('[PB] magic link proxy fetch attempt failed:', {
        attempt,
        targetHost: new URL(url).hostname,
        error: describeError(error),
      })
      if (attempt < 2) await sleep(retryDelayMs)
    }
  }

  try {
    const response = await postJsonWithHttps(url, key, body)
    return { response, transport: 'https', attempts: 1 }
  } catch (error) {
    const unavailableError = new Error('Supabase auth API unavailable') as Error & { cause?: unknown }
    unavailableError.cause = {
      fetch: describeError(lastError),
      https: describeError(error),
    }
    throw unavailableError
  }
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
    const supabaseUrl = `${supabase.url.replace(/\/$/, '')}/auth/v1/otp?${new URLSearchParams({
      redirect_to: redirect.url.toString(),
    })}`
    const { response, transport, attempts } = await postSupabaseOtp(
      supabaseUrl,
      supabase.key,
      {
        email,
        data: {},
        create_user: true,
        gotrue_meta_security: {},
      },
    )

    if (!response.ok) {
      const payload = await response.json().catch(() => null)
      const message = readSupabaseError(payload, response.statusText || 'Supabase auth error')
      console.error('[PB] magic link proxy error:', {
        status: response.status,
        message,
        redirectOrigin: redirect.url.origin,
        transport,
        attempts,
      })
      return res.status(response.status).json({ error: message })
    }

    return res.status(200).json({ ok: true })
  } catch (error) {
    console.error('[PB] magic link proxy fetch failed:', {
      error: describeError(error),
      redirectOrigin: redirect.url.origin,
    })
    return res.status(502).json({ error: 'Supabase auth API unavailable' })
  }
}
