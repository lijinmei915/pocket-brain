import { VercelRequest, VercelResponse } from '@vercel/node'
import {
  applyClassificationToItem,
  canExposeClassifierDebug,
  classifyBookmark,
  getClassifierEnvDebug,
  hasClassifierApiKey,
  normalizeConfirmedClassification,
} from './_lib/classifier.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const payload = req.method === 'GET' ? req.query : req.body ?? {}
  const url = typeof payload.url === 'string' ? payload.url : ''
  const title = typeof payload.title === 'string' ? payload.title : ''
  const note = typeof payload.note === 'string' ? payload.note : ''
  const itemId = typeof payload.itemId === 'string' ? payload.itemId : ''
  const userId = typeof payload.userId === 'string' ? payload.userId : ''
  const apply = payload.apply === true || payload.apply === 'true' || payload.apply === '1'
  const debug = (payload.debug === true || payload.debug === 'true' || payload.debug === '1') && canExposeClassifierDebug()
  const confirmed = payload.confirmed && typeof payload.confirmed === 'object' ? payload.confirmed : null

  if (!url && !(apply && confirmed)) {
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
    const result = confirmed
      ? normalizeConfirmedClassification(confirmed, {
          summary: title,
        })
      : await classifyBookmark({ url, title, note }, { userId })
    const finalResult = apply
      ? await applyClassificationToItem(itemId, result, {
          userId,
          userTags: result.userTags,
          replaceUserTags: confirmed !== null,
          recordRemovedAiSuppressions: confirmed !== null,
        })
      : result
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
