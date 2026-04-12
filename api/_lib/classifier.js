const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const runtimeEnv = globalThis.process?.env ?? {}

const ALLOWED_CONFIDENCE = new Set(['high', 'medium', 'low'])
const ALLOWED_TAG_TYPES = new Set(['content', 'status', 'source'])

export function detectLegacyType(url = '') {
  const lower = String(url).toLowerCase()
  if (/youtube\.com|youtu\.be|vimeo\.com|bilibili\.com/.test(lower)) return 'video'
  if (/twitter\.com|x\.com|weibo\.com|xiaohongshu/.test(lower)) return 'tweet'
  if (/spotify\.com|podcast|\.mp3|\.wav/.test(lower)) return 'audio'
  return 'article'
}

export function detectSourceTag(url = '') {
  const lower = String(url).toLowerCase()

  const rules = [
    [/github\.com/, 'GitHub'],
    [/youtube\.com|youtu\.be/, 'YouTube'],
    [/bilibili\.com/, 'Bilibili'],
    [/x\.com|twitter\.com/, 'X'],
    [/xiaohongshu\.com/, '小红书'],
    [/weibo\.com/, '微博'],
    [/spotify\.com/, 'Spotify'],
    [/notion\.site|notion\.so/, 'Notion'],
    [/figma\.com/, 'Figma'],
  ]

  const match = rules.find(([pattern]) => pattern.test(lower))
  if (match) return match[1]

  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    const root = hostname.split('.').slice(-2, -1)[0]
    return root ? root.charAt(0).toUpperCase() + root.slice(1) : null
  } catch {
    return null
  }
}

function getRequiredEnv(...names) {
  for (const name of names) {
    const value = runtimeEnv[name]
    if (value) return value
  }
  throw new Error(`Missing environment variable: ${names.join(' or ')}`)
}

export async function fetchSupabaseJson(path) {
  const url = getRequiredEnv('SUPABASE_URL', 'VITE_SUPABASE_URL')
  const key = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'VITE_SUPABASE_KEY')

  const response = await fetch(`${url}/rest/v1${path}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Supabase request failed (${response.status}): ${await response.text()}`)
  }

  return response.json()
}

export async function fetchCategories() {
  const rows = await fetchSupabaseJson('/categories?select=id,name,description,sort_order&order=sort_order.asc')
  return Array.isArray(rows) ? rows : []
}

function buildPrompt({ url, title, note, sourceTag, categories }) {
  const categoryOptions = categories.map(category => ({
    id: category.id,
    name: category.name,
    description: category.description,
  }))

  return [
    '你是 Pocket Brain 的分类器。',
    '任务：根据给定内容，从候选分类里选出唯一一个 category_id，并输出结构化 JSON。',
    '',
    '必须遵守：',
    '1. category_id 只能从候选列表中选择一个真实 UUID，禁止自造分类名或 UUID。',
    '2. confidence 只能是 high / medium / low。',
    '3. tags 最多 5 个，每个 tag 只能包含 name 和 type；type 只能是 content / status / source。',
    '4. summary 用简体中文，控制在 50 字以内。',
    '5. 如果把握不大，也要选最接近的 category_id，并把 confidence 设为 low。',
    '6. 只返回 JSON，不要输出 Markdown，不要解释。',
    '',
    '候选分类：',
    JSON.stringify(categoryOptions, null, 2),
    '',
    '输入内容：',
    JSON.stringify(
      {
        url,
        title: title || '',
        note: note || '',
        source_hint: sourceTag || null,
      },
      null,
      2
    ),
    '',
    '目标 JSON 结构：',
    JSON.stringify(
      {
        category_id: '候选中的真实 UUID',
        confidence: 'high',
        tags: [{ name: 'React', type: 'content' }],
        summary: '50字内摘要',
      },
      null,
      2
    ),
  ].join('\n')
}

function extractJsonText(rawText) {
  const trimmed = rawText.trim()

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed
  }

  const fenced = trimmed.match(/```json\s*([\s\S]*?)```/i) || trimmed.match(/```\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    return fenced[1].trim()
  }

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) {
    return trimmed.slice(start, end + 1)
  }

  throw new Error(`Gemini returned non-JSON content: ${rawText}`)
}

function normalizeSummary(summary, fallbackTitle) {
  const text = String(summary || fallbackTitle || '未提供摘要').replace(/\s+/g, ' ').trim()
  return text.length > 50 ? `${text.slice(0, 50).trim()}…` : text
}

function normalizeTags(tags, sourceTag) {
  const result = []
  const seen = new Set()

  for (const tag of Array.isArray(tags) ? tags : []) {
    const name = String(tag?.name || '').replace(/^#/, '').trim()
    const type = String(tag?.type || '').trim().toLowerCase()
    if (!name || !ALLOWED_TAG_TYPES.has(type)) continue

    const key = `${type}:${name.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push({ name, type })
  }

  if (sourceTag) {
    const key = `source:${sourceTag.toLowerCase()}`
    if (!seen.has(key)) {
      result.push({ name: sourceTag, type: 'source' })
    }
  }

  return result.slice(0, 5)
}

async function callGemini(prompt) {
  const apiKey = getRequiredEnv('GEMINI_API_KEY')
  const response = await fetch(`${GEMINI_API_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`Gemini API error (${response.status}): ${await response.text()}`)
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.map(part => part?.text || '').join('\n') ?? ''
  if (!text.trim()) {
    throw new Error('Gemini returned empty content')
  }

  return text
}

export async function classifyBookmark(input, options = {}) {
  const categories = options.categories || (await fetchCategories())
  if (!categories.length) {
    throw new Error('No categories found in Supabase')
  }

  const fallbackCategory = categories.find(category => category.name === '未分类') || categories[0]
  const sourceTag = detectSourceTag(input.url)
  const prompt = buildPrompt({
    url: input.url,
    title: input.title,
    note: input.note,
    sourceTag,
    categories,
  })

  const rawText = await callGemini(prompt)
  const parsed = JSON.parse(extractJsonText(rawText))
  const categoryIds = new Set(categories.map(category => category.id))
  const categoryId = categoryIds.has(parsed?.category_id) ? parsed.category_id : fallbackCategory.id
  const confidence = ALLOWED_CONFIDENCE.has(parsed?.confidence) ? parsed.confidence : 'low'

  return {
    type: detectLegacyType(input.url),
    category_id: categoryId,
    confidence,
    tags: normalizeTags(parsed?.tags, sourceTag),
    summary: normalizeSummary(parsed?.summary, input.title),
  }
}
