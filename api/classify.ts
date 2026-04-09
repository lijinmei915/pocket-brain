import { VercelRequest, VercelResponse } from '@vercel/node'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url, title } = req.query

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid url parameter' })
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY' })
  }

  try {
    const prompt = `分析这个内容的类型。
URL: ${url}
${title ? `Title: ${title}` : ''}

只回复一个单词，选择：article / video / audio / tweet / other`

    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      console.error(`[PB] Gemini API error: ${response.status}`)
      return res.status(response.status).json({ error: 'Gemini API error' })
    }

    const data = await response.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const type = text
      .toLowerCase()
      .trim()
      .match(/(article|video|audio|tweet|other)/)?.[1] ?? 'article'

    return res.status(200).json({ type })
  } catch (err) {
    console.error('[PB] classify error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
