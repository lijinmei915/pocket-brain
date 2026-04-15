export default async function handler(req, res) {
  const { url } = req.query
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url' })
  }

  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PocketBrain/1.0)' },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    })
    if (!r.ok) return res.status(200).json({ title: null })

    const html = await r.text()

    // og:title 优先
    const og = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1]
      ?? html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/i)?.[1]
    if (og) return res.status(200).json({ title: og.trim() })

    // 普通 <title>
    const t = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim()
    return res.status(200).json({ title: t ?? null })
  } catch {
    return res.status(200).json({ title: null })
  }
}
