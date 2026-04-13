import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const envDebug = {
  cwd: null,
  moduleDir: null,
  checkedFiles: [],
  loadedFrom: null,
}

function parseEnvFile(content) {
  const result = {}

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const eqIndex = line.indexOf('=')
    if (eqIndex === -1) continue

    const key = line.slice(0, eqIndex).trim()
    let value = line.slice(eqIndex + 1).trim()
    if (!key) continue

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    result[key] = value
  }

  return result
}

function loadLocalEnvFallback() {
  const searchRoots = new Set()
  const cwd = globalThis.process?.cwd?.()
  const moduleDir = path.dirname(fileURLToPath(import.meta.url))

  envDebug.cwd = cwd || null
  envDebug.moduleDir = moduleDir
  envDebug.checkedFiles = []
  envDebug.loadedFrom = null

  if (cwd) searchRoots.add(cwd)
  searchRoots.add(moduleDir)

  const candidates = ['.env.local', '.env']

  for (const root of searchRoots) {
    let current = root

    while (current && current !== path.dirname(current)) {
      for (const filename of candidates) {
        const fullPath = path.join(current, filename)
        envDebug.checkedFiles.push(fullPath)
        if (!fs.existsSync(fullPath)) continue

        try {
          envDebug.loadedFrom = fullPath
          return parseEnvFile(fs.readFileSync(fullPath, 'utf8'))
        } catch {
          return {}
        }
      }

      current = path.dirname(current)
    }
  }

  return {}
}

const runtimeEnv = {
  ...loadLocalEnvFallback(),
  ...(globalThis.process?.env ?? {}),
}

export function getClassifierEnvDebug() {
  return {
    cwd: envDebug.cwd,
    moduleDir: envDebug.moduleDir,
    loadedFrom: envDebug.loadedFrom,
    checkedFiles: envDebug.checkedFiles,
    hasQwenApiKey: Boolean(runtimeEnv.QWEN_API_KEY),
    hasDashscopeApiKey: Boolean(runtimeEnv.DASHSCOPE_API_KEY),
    hasQwenModel: Boolean(runtimeEnv.QWEN_MODEL),
    hasQwenBaseUrl: Boolean(runtimeEnv.QWEN_BASE_URL),
    hasTagUserId: Boolean(runtimeEnv.POCKET_BRAIN_TAG_USER_ID),
  }
}

export function hasClassifierApiKey() {
  return Boolean(runtimeEnv.QWEN_API_KEY || runtimeEnv.DASHSCOPE_API_KEY)
}

const ALLOWED_CONFIDENCE = new Set(['high', 'medium', 'low'])
const ALLOWED_TAG_TYPES = new Set(['content', 'status', 'source'])
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504])
const DEFAULT_TAG_USER_ID = runtimeEnv.POCKET_BRAIN_TAG_USER_ID || '00000000-0000-0000-0000-000000000001'

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

function getQwenModel() {
  return runtimeEnv.QWEN_MODEL || 'qwen3.6-plus'
}

function getQwenBaseUrl() {
  return runtimeEnv.QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
}

function getQwenRetryCount() {
  const parsed = Number(runtimeEnv.QWEN_RETRY_COUNT || '2')
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 2
}

function getRetryDelayMs(attempt) {
  return 800 * (attempt + 1)
}

export async function fetchSupabaseJson(path) {
  return supabaseRest(path)
}

async function supabaseRest(path, options = {}) {
  const url = getRequiredEnv('SUPABASE_URL', 'VITE_SUPABASE_URL')
  const key = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY', 'VITE_SUPABASE_KEY')

  const response = await fetch(`${url}/rest/v1${path}`, {
    method: options.method || 'GET',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    throw new Error(`Supabase request failed (${response.status}): ${await response.text()}`)
  }

  if (response.status === 204) return null

  const text = await response.text()
  if (!text) return null
  return JSON.parse(text)
}

export async function fetchCategories() {
  const rows = await fetchSupabaseJson('/categories?select=id,name,description,sort_order&order=sort_order.asc')
  return Array.isArray(rows) ? rows : []
}

function getTagUserId() {
  return runtimeEnv.POCKET_BRAIN_TAG_USER_ID || DEFAULT_TAG_USER_ID
}

function isMissingColumnError(error, column) {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes(`column ${column}`) || message.includes(`Could not find the '${column}' column`)
}

async function tagsUseUserId() {
  try {
    await supabaseRest(`/tags?select=id&user_id=eq.${encodeURIComponent(getTagUserId())}&limit=1`)
    return true
  } catch (error) {
    if (isMissingColumnError(error, 'user_id')) {
      return false
    }
    throw error
  }
}

async function findExistingTag({ name, type }) {
  const encodedName = encodeURIComponent(name)
  const encodedType = encodeURIComponent(type)

  if (await tagsUseUserId()) {
    const rows = await supabaseRest(
      `/tags?select=id,name,type&user_id=eq.${encodeURIComponent(getTagUserId())}&name=eq.${encodedName}&type=eq.${encodedType}&limit=1`
    )
    if (Array.isArray(rows) && rows[0]) {
      return rows[0]
    }
  }

  const rows = await supabaseRest(`/tags?select=id,name,type&name=eq.${encodedName}&type=eq.${encodedType}&limit=1`)
  return Array.isArray(rows) && rows[0] ? rows[0] : null
}

async function createTag({ name, type }) {
  const body = { name, type }

  if (await tagsUseUserId()) {
    body.user_id = getTagUserId()
  }

  const rows = await supabaseRest('/tags?select=id,name,type', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body,
  })

  return Array.isArray(rows) && rows[0] ? rows[0] : null
}

async function ensureTag(tag) {
  return (await findExistingTag(tag)) || (await createTag(tag))
}

async function fetchCurrentItemTagRows(itemId) {
  const rows = await supabaseRest(
    `/item_tags?item_id=eq.${encodeURIComponent(itemId)}&select=item_id,tag_id,applied_by,tags(id,name,type)`
  )
  return Array.isArray(rows) ? rows : []
}

async function fetchSuppressedTagIds(itemId) {
  try {
    const rows = await supabaseRest(`/item_tag_suppressions?item_id=eq.${encodeURIComponent(itemId)}&select=tag_id`)
    return new Set((Array.isArray(rows) ? rows : []).map(row => row.tag_id).filter(Boolean))
  } catch (error) {
    if (error instanceof Error && error.message.includes('item_tag_suppressions')) {
      return new Set()
    }
    throw error
  }
}

function normalizeStoredTagRows(rows) {
  const seen = new Set()
  const result = []

  for (const row of rows) {
    const tag = Array.isArray(row?.tags) ? row.tags[0] : row?.tags
    const id = tag?.id
    const name = String(tag?.name || '').trim()
    const type = String(tag?.type || '').trim().toLowerCase()
    const appliedBy = row?.applied_by === 'user' ? 'user' : 'ai'
    if (!id || !name || !ALLOWED_TAG_TYPES.has(type)) continue

    const key = `${id}:${appliedBy}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push({ id, name, type, appliedBy })
  }

  return result
}

async function upsertAiItemTag(itemId, tagId) {
  await supabaseRest('/item_tags', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: {
      item_id: itemId,
      tag_id: tagId,
      applied_by: 'ai',
    },
  })
}

async function deleteItemTag(itemId, tagId) {
  await supabaseRest(`/item_tags?item_id=eq.${encodeURIComponent(itemId)}&tag_id=eq.${encodeURIComponent(tagId)}`, {
    method: 'DELETE',
  })
}

async function fetchStoredTagsForItem(itemId) {
  const rows = await fetchCurrentItemTagRows(itemId)
  return normalizeStoredTagRows(rows)
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

  throw new Error(`Model returned non-JSON content: ${rawText}`)
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

async function callQwen(prompt) {
  const apiKey = getRequiredEnv('QWEN_API_KEY', 'DASHSCOPE_API_KEY')
  const model = getQwenModel()
  const baseUrl = getQwenBaseUrl().replace(/\/$/, '')
  const maxRetries = getQwenRetryCount()
  let lastError = null

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: '你是 Pocket Brain 的分类器。你必须严格返回 JSON 对象，不要输出解释、Markdown 或额外文本。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1,
          response_format: {
            type: 'json_object',
          },
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        const error = new Error(`Qwen API error (${response.status}, model=${model}): ${errorText}`)
        if (attempt < maxRetries && RETRYABLE_STATUS_CODES.has(response.status)) {
          await sleep(getRetryDelayMs(attempt))
          lastError = error
          continue
        }
        throw error
      }

      const data = await response.json()
      const text = data?.choices?.[0]?.message?.content ?? ''
      if (!text.trim()) {
        throw new Error('Qwen returned empty content')
      }

      return text
    } catch (error) {
      lastError = error
      const message = error instanceof Error ? error.message : String(error)
      if (attempt < maxRetries && /fetch failed|ECONNRESET|ETIMEDOUT|timeout/i.test(message)) {
        await sleep(getRetryDelayMs(attempt))
        continue
      }
      throw error
    }
  }

  throw lastError || new Error('Qwen request failed')
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
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

  const rawText = await callQwen(prompt)
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

export async function applyClassificationToItem(itemId, classification) {
  const currentRows = await fetchCurrentItemTagRows(itemId)
  const suppressedTagIds = await fetchSuppressedTagIds(itemId)

  const currentAiTagIds = new Set(
    currentRows
      .filter(row => row?.applied_by !== 'user')
      .map(row => row?.tag_id)
      .filter(Boolean)
  )

  const desiredAiTagIds = new Set()

  for (const tag of Array.isArray(classification?.tags) ? classification.tags : []) {
    const ensured = await ensureTag(tag)
    if (!ensured?.id) continue
    if (suppressedTagIds.has(ensured.id)) continue
    desiredAiTagIds.add(ensured.id)
    await upsertAiItemTag(itemId, ensured.id)
  }

  for (const tagId of currentAiTagIds) {
    if (!desiredAiTagIds.has(tagId)) {
      await deleteItemTag(itemId, tagId)
    }
  }

  await supabaseRest(`/items?id=eq.${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: {
      category_id: classification.category_id,
      summary: classification.summary,
      ai_status: 'completed',
    },
  })

  return {
    ...classification,
    tags: await fetchStoredTagsForItem(itemId),
  }
}
