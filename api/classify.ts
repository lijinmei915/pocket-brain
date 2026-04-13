import { VercelRequest, VercelResponse } from '@vercel/node'
import { applyClassificationToItem, classifyBookmark, getClassifierEnvDebug, hasClassifierApiKey } from './_lib/classifier.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const payload = req.method === 'GET' ? req.query : req.body ?? {}
  const url = typeof payload.url === 'string' ? payload.url : ''
  const title = typeof payload.title === 'string' ? payload.title : ''
  const note = typeof payload.note === 'string' ? payload.note : ''
  const itemId = typeof payload.itemId === 'string' ? payload.itemId : ''
  const apply = payload.apply === true || payload.apply === 'true' || payload.apply === '1'
  const debug = payload.debug === true || payload.debug === 'true' || payload.debug === '1'

  if (!url) {
    return res.status(400).json({ error: 'Missing or invalid url parameter' })
  }

  if (apply && !itemId) {
    return res.status(400).json({ error: 'Missing itemId for apply mode' })
  }

  if (!hasClassifierApiKey()) {
    return res.status(500).json({
      error: 'Missing QWEN_API_KEY or DASHSCOPE_API_KEY',
      ...(debug ? { debug: getClassifierEnvDebug() } : {}),
    })
  }

  try {
    const result = await classifyBookmark({ url, title, note })
    const finalResult = apply ? await applyClassificationToItem(itemId, result) : result
    return res.status(200).json(finalResult)
  } catch (err) {
    console.error('[PB] classify error:', err)
    return res.status(500).json({
      error: 'Internal server error',
      ...(debug
        ? {
            debug: {
              message: err instanceof Error ? err.message : String(err),
              env: getClassifierEnvDebug(),
            },
          }
        : {}),
    })
  }
}
