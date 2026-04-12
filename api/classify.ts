import { VercelRequest, VercelResponse } from '@vercel/node'
import { classifyBookmark } from './_lib/classifier.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const payload = req.method === 'GET' ? req.query : req.body ?? {}
  const url = typeof payload.url === 'string' ? payload.url : ''
  const title = typeof payload.title === 'string' ? payload.title : ''
  const note = typeof payload.note === 'string' ? payload.note : ''

  if (!url) {
    return res.status(400).json({ error: 'Missing or invalid url parameter' })
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY' })
  }

  try {
    const result = await classifyBookmark({ url, title, note })
    return res.status(200).json(result)
  } catch (err) {
    console.error('[PB] classify error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
