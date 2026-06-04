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

export function canExposeClassifierDebug() {
  return runtimeEnv.NODE_ENV !== 'production' || runtimeEnv.VERCEL_ENV === 'development'
}

const ALLOWED_CONFIDENCE = new Set(['high', 'medium', 'low'])
const ALLOWED_TAG_TYPES = new Set(['content', 'status', 'source', 'format'])
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504])
const DEFAULT_TAG_USER_ID = '00000000-0000-0000-0000-000000000001'
const CLASSIFIER_CACHE_TTL_MS = Number(runtimeEnv.CLASSIFIER_CACHE_TTL_MS || '60000')
const classifierCache = new Map()
const CANONICAL_TAG_ALIASES = {
  content: {
    claudecode: 'Claude',
    claudeai: 'Claude',
    anthropicclaude: 'Claude',
    aicoding: 'AI编程工具',
    ai编程: 'AI编程工具',
    ai编程助手: 'AI编程工具',
    ai编程工具: 'AI编程工具',
    开发者工具: 'AI编程工具',
    编程工具: 'AI编程工具',
    codingassistant: 'AI编程工具',
    aicodingtool: 'AI编程工具',
    website: '网站',
    webpage: '网站',
    site: '网站',
  },
  source: {
    官网: '官网',
    官方网站: '官网',
    officialwebsite: '官网',
    officialsite: '官网',
    website: '官网',
    site: '官网',
  },
  format: {
    article: '文章',
    文章: '文章',
    post: '帖子',
    帖子: '帖子',
    video: '视频',
    视频: '视频',
    audio: '音频',
    音频: '音频',
    tutorial: '教程',
    教程: '教程',
    tool: '工具',
    tools: '工具',
    工具: '工具',
  },
}

async function getCachedValue(key, loader, ttlMs = CLASSIFIER_CACHE_TTL_MS) {
  const now = Date.now()
  const cached = classifierCache.get(key)

  if (cached && cached.expiresAt > now) {
    return cached.value
  }

  if (cached?.promise) {
    return cached.promise
  }

  const promise = Promise.resolve()
    .then(loader)
    .then(value => {
      classifierCache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      })
      return value
    })
    .catch(error => {
      classifierCache.delete(key)
      throw error
    })

  classifierCache.set(key, {
    value: null,
    expiresAt: now + ttlMs,
    promise,
  })

  return promise
}

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
  return getCachedValue('categories', async () => {
    const rows = await fetchSupabaseJson('/categories?select=id,name,description,sort_order&order=sort_order.asc')
    return Array.isArray(rows) ? rows : []
  })
}

function getTagUserId(userId) {
  return userId || runtimeEnv.POCKET_BRAIN_TAG_USER_ID || DEFAULT_TAG_USER_ID
}

function isMissingColumnError(error, column) {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes(`column ${column}`) || message.includes(`Could not find the '${column}' column`)
}

async function tagsUseUserId(userId) {
  return getCachedValue(`tags-use-user-id:${getTagUserId(userId)}`, async () => {
    try {
      await supabaseRest(`/tags?select=id&user_id=eq.${encodeURIComponent(getTagUserId(userId))}&limit=1`)
      return true
    } catch (error) {
      if (isMissingColumnError(error, 'user_id')) {
        return false
      }
      throw error
    }
  })
}

async function findExistingTag({ name, type }, userId) {
  const encodedName = encodeURIComponent(name)
  const encodedType = encodeURIComponent(type)

  if (await tagsUseUserId(userId)) {
    const rows = await supabaseRest(
      `/tags?select=id,name,type&user_id=eq.${encodeURIComponent(getTagUserId(userId))}&name=eq.${encodedName}&type=eq.${encodedType}&limit=1`
    )
    if (Array.isArray(rows) && rows[0]) {
      return rows[0]
    }
  }

  const rows = await supabaseRest(`/tags?select=id,name,type&name=eq.${encodedName}&type=eq.${encodedType}&limit=1`)
  return Array.isArray(rows) && rows[0] ? rows[0] : null
}

async function createTag({ name, type }, userId) {
  const body = { name, type }

  if (await tagsUseUserId(userId)) {
    body.user_id = getTagUserId(userId)
  }

  const rows = await supabaseRest('/tags?select=id,name,type', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body,
  })

  return Array.isArray(rows) && rows[0] ? rows[0] : null
}

async function ensureTag(tag, userId) {
  return (await findExistingTag(tag, userId)) || (await createTag(tag, userId))
}

async function fetchUserTagLibrary(userId) {
  return getCachedValue(`user-tag-library:${getTagUserId(userId)}`, async () => {
    if (await tagsUseUserId(userId)) {
      const rows = await supabaseRest(
        `/tags?select=name,type&user_id=eq.${encodeURIComponent(getTagUserId(userId))}&order=name.asc&limit=200`
      )
      return Array.isArray(rows) ? rows : []
    }

    const rows = await supabaseRest('/tags?select=name,type&order=name.asc&limit=200')
    return Array.isArray(rows) ? rows : []
  })
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

async function upsertUserItemTag(itemId, tagId) {
  await supabaseRest('/item_tags', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: {
      item_id: itemId,
      tag_id: tagId,
      applied_by: 'user',
    },
  })
}

async function deleteItemTag(itemId, tagId) {
  await supabaseRest(`/item_tags?item_id=eq.${encodeURIComponent(itemId)}&tag_id=eq.${encodeURIComponent(tagId)}`, {
    method: 'DELETE',
  })
}

async function addSuppression(itemId, tagId) {
  await supabaseRest('/item_tag_suppressions', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: {
      item_id: itemId,
      tag_id: tagId,
    },
  })
}

async function clearSuppression(itemId, tagId) {
  await supabaseRest(
    `/item_tag_suppressions?item_id=eq.${encodeURIComponent(itemId)}&tag_id=eq.${encodeURIComponent(tagId)}`,
    { method: 'DELETE' }
  )
}

async function fetchStoredTagsForItem(itemId) {
  const rows = await fetchCurrentItemTagRows(itemId)
  return normalizeStoredTagRows(rows)
}

function buildPrompt({ url, title, note, sourceTag, categories, userTagLibrary }) {
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
    '3. tags 最多 5 个，可使用的 type 只有 content / source / format。content 表示主题，source 表示来源，format 表示形态。其中前台主展示只保留 content 和 format；source 作为底层元数据保留，不要求必须输出。',
    '4. content 标签数量按内容主题复杂度决定，不要求凑满；如果主题集中，只输出 1-3 个最关键标签。content 应是具体主题词（如"React""机器学习"），不要输出来源平台名、分类名或泛化词（如"技术文章""新闻"）。',
    '5. source 只表示来源或平台，最多 1 个；如果来源不明确可以为空，不要把主题词误当作 source。source 仅在确实有帮助时输出，不要为了凑类型而强行生成。',
    '6. format 只表示内容形态，最多 1 个；优先从"文章""视频""音频""帖子""教程""工具"这类最贴近的形态里选择，不要和 source 或 content 混用。',
    '7. 在输出 tags 前，先对照用户已有标签库；如果已有标签中存在语义相同、近义、互相包含，或只是不同表述方式的标签，优先使用用户已有标签名作为最终输出，不再生成新的近似标签。这个规则同时适用于 content / source / format。',
    '8. 标签之间不能语义重复、互相包含，或只是上位/近义改写。若出现冲突，优先保留最具体、最贴近页面主题、信息量最高的标签。仅当标签语义完全重复、互相包含，或只是上位/近义改写时才去重；并列细分标签（如"React""Vue"）可以同时保留。',
    '9. 标签生成后，必须按以下顺序校验：① 数量 ≤ 5；② 只使用 content / source / format；③ content 无来源/分类/泛化词；④ source ≤ 1；⑤ format ≤ 1；⑥ 无语义重复、包含或近义冲突；校验通过后再输出。错误示例：同时输出"Claude""Claude Code"、"AI编程工具""开发者工具"、"大模型""AI工具"都属于未完成去重，必须先合并后再输出。',
    '10. summary 用简体中文，控制在 50 字以内。摘要必须补充标题中没有的关键信息（如结论、数据、人物、事件结果），严禁复述或改写标题。如果内容信息不足，写"暂无更多信息"。',
    '11. 如果把握不大，也要选最接近的 category_id，并把 confidence 设为 low。',
    '12. 只返回 JSON，不要输出 Markdown，不要解释。',
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
        user_tag_library: Array.isArray(userTagLibrary) ? userTagLibrary : [],
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
        summary: '标题之外的关键信息，50字内',
      },
      null,
      2
    ),
  ].join('\n')
}

function buildFileSummaryPrompt({ fileName, mimeType, text, userTagLibrary }) {
  return [
    '你是 Pocket Brain 的资料解析助手。',
    '任务：阅读用户上传的文件正文，生成适合进入个人知识库的标题、摘要和标签建议。',
    '',
    '必须遵守：',
    '1. 只返回 JSON，不要输出 Markdown，不要解释。',
    '2. title 用简体中文，控制在 40 字以内；如果原文件名已经清楚，可以保留或轻微优化。',
    '3. summary 用简体中文，控制在 120 字以内，概括文件核心信息、结论、用途或可复用价值。',
    '4. tags 最多 5 个，可使用的 type 只有 content / format。content 表示主题，format 表示文件形态，如 PDF、Word、Markdown、文档、代码、表格。',
    '5. 标签生成前先参考用户已有标签库；语义相同或近似时，优先复用已有标签名。',
    '6. 不要输出“资料”“文件”“上传文件”这类没有检索价值的泛化标签。',
    '7. 如果正文信息不足，summary 写“暂无更多信息”，tags 只输出确定的格式标签。',
    '',
    '输入：',
    JSON.stringify(
      {
        file_name: fileName || '',
        mime_type: mimeType || '',
        user_tag_library: Array.isArray(userTagLibrary) ? userTagLibrary : [],
        text,
      },
      null,
      2
    ),
    '',
    '目标 JSON 结构：',
    JSON.stringify(
      {
        title: '适合收藏卡片展示的标题',
        summary: '文件核心内容摘要，120字内',
        tags: [{ name: '产品设计', type: 'content' }, { name: 'PDF', type: 'format' }],
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

function normalizeFileTitle(title, fallbackFileName) {
  const fallback = String(fallbackFileName || '未命名资料')
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
  const text = String(title || fallback || '未命名资料').replace(/\s+/g, ' ').trim()
  return text.length > 40 ? `${text.slice(0, 40).trim()}…` : text
}

function normalizeFileSummary(summary) {
  const text = String(summary || '暂无更多信息').replace(/\s+/g, ' ').trim()
  return text.length > 120 ? `${text.slice(0, 120).trim()}…` : text
}

function normalizeFileText(text) {
  return String(text || '')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 28000)
}

function normalizeConfirmedTag(tag) {
  const name = String(tag?.name || '').replace(/^#/, '').trim()
  const type = String(tag?.type || '').trim().toLowerCase()
  if (!name || !ALLOWED_TAG_TYPES.has(type)) return null
  return { name, type }
}

function normalizeTagText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['".,!?()[\]{}\-_/\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildTagTokens(value) {
  const normalized = normalizeTagText(value)
  if (!normalized) return []

  const compact = normalized.replace(/\s+/g, '')
  const singular = normalized.endsWith('s') && normalized.length > 3
    ? normalized.slice(0, -1)
    : normalized

  return Array.from(new Set([normalized, compact, singular.replace(/\s+/g, '')].filter(Boolean)))
}

function resolveCanonicalTag(tag, userTagLibrary) {
  const aliasMap = CANONICAL_TAG_ALIASES[tag.type] || {}
  const sourceTokens = buildTagTokens(tag.name)
  const aliasedName = sourceTokens
    .map(token => aliasMap[token])
    .find(Boolean)
  const aliasResolvedTag = aliasedName ? { ...tag, name: aliasedName } : tag

  const candidates = (Array.isArray(userTagLibrary) ? userTagLibrary : []).filter(candidate => candidate?.type === tag.type)
  if (candidates.length === 0) return aliasResolvedTag

  const canonicalSourceTokens = buildTagTokens(aliasResolvedTag.name)
  const normalizedSourceTokens = canonicalSourceTokens.length > 0 ? canonicalSourceTokens : sourceTokens
  if (sourceTokens.length === 0) return tag

  const exactMatch = candidates.find(candidate => {
    const candidateTokens = buildTagTokens(candidate.name)
    return candidateTokens.some(token => normalizedSourceTokens.includes(token))
  })
  if (exactMatch?.name) {
    return { ...aliasResolvedTag, name: exactMatch.name }
  }

  const inclusiveMatch = candidates.find(candidate => {
    const candidateTokens = buildTagTokens(candidate.name)
    return candidateTokens.some(candidateToken =>
      normalizedSourceTokens.some(sourceToken =>
        candidateToken.length >= 2 &&
        sourceToken.length >= 2 &&
        (candidateToken.includes(sourceToken) || sourceToken.includes(candidateToken))
      )
    )
  })

  return inclusiveMatch?.name ? { ...aliasResolvedTag, name: inclusiveMatch.name } : aliasResolvedTag
}

function normalizeTags(tags, sourceTag, userTagLibrary) {
  const buckets = {
    content: [],
    source: [],
    format: [],
  }
  const seen = new Set()

  for (const tag of Array.isArray(tags) ? tags : []) {
    const normalized = normalizeConfirmedTag(tag)
    if (!normalized) continue

    const canonical = resolveCanonicalTag(normalized, userTagLibrary)
    if (!['content', 'source', 'format'].includes(canonical.type)) continue

    const key = `${canonical.type}:${canonical.name.toLowerCase()}`
    if (seen.has(key)) continue

    seen.add(key)
    buckets[canonical.type].push(canonical)
  }

  if (sourceTag) {
    const canonicalSourceTag = resolveCanonicalTag({ name: sourceTag, type: 'source' }, userTagLibrary)
    const key = `source:${canonicalSourceTag.name.toLowerCase()}`
    if (!seen.has(key)) {
      buckets.source.push(canonicalSourceTag)
    }
  }

  const contentNameSet = new Set(buckets.content.map(tag => tag.name.toLowerCase()))
  const dedupedSource = buckets.source.filter(tag => !contentNameSet.has(tag.name.toLowerCase())).slice(0, 1)
  const dedupedFormat = buckets.format.filter(tag => !contentNameSet.has(tag.name.toLowerCase())).slice(0, 1)
  const dedupedContent = buckets.content.slice(0, 5 - dedupedSource.length - dedupedFormat.length)

  return [...dedupedContent, ...dedupedFormat].slice(0, 5)
}

export function normalizeConfirmedClassification(input, fallback = {}) {
  const normalizedAiTags = []
  const seenAi = new Set()
  const normalizedUserTags = []
  const seenUser = new Set()

  for (const tag of Array.isArray(input?.tags) ? input.tags : []) {
    const normalized = normalizeConfirmedTag(tag)
    if (!normalized) continue

    const appliedBy = tag?.appliedBy === 'user' ? 'user' : 'ai'
    const key = `${normalized.type}:${normalized.name.toLowerCase()}`

    if (appliedBy === 'user') {
      if (seenUser.has(key)) continue
      seenUser.add(key)
      normalizedUserTags.push(normalized)
      continue
    }

    if (seenUser.has(key) || seenAi.has(key)) continue
    seenAi.add(key)
    normalizedAiTags.push(normalized)
  }

  const summary =
    input && Object.prototype.hasOwnProperty.call(input, 'summary')
      ? String(input.summary || '').trim()
      : undefined

  const confidence = ALLOWED_CONFIDENCE.has(input?.confidence) ? input.confidence : fallback.confidence
  const categoryId = typeof input?.category_id === 'string' ? input.category_id : fallback.category_id

  return {
    category_id: categoryId || null,
    confidence: confidence || null,
    summary: summary !== undefined ? summary : fallback.summary,
    tags: normalizedAiTags,
    userTags: normalizedUserTags,
  }
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
  const userTagLibrary = options.userTagLibrary || (await fetchUserTagLibrary(options.userId))
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
    userTagLibrary,
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
    tags: normalizeTags(parsed?.tags, sourceTag, userTagLibrary),
    summary: normalizeSummary(parsed?.summary, input.title),
  }
}

export async function summarizeFileContent(input, options = {}) {
  const userTagLibrary = options.userTagLibrary || (await fetchUserTagLibrary(options.userId))
  const text = normalizeFileText(input.text)

  if (!text) {
    throw new Error('No readable text extracted from file')
  }

  const prompt = buildFileSummaryPrompt({
    fileName: input.fileName,
    mimeType: input.mimeType,
    text,
    userTagLibrary,
  })

  const rawText = await callQwen(prompt)
  const parsed = JSON.parse(extractJsonText(rawText))

  return {
    title: normalizeFileTitle(parsed?.title, input.fileName),
    summary: normalizeFileSummary(parsed?.summary),
    tags: normalizeTags(parsed?.tags, null, userTagLibrary),
  }
}

async function assertOwnedItem(itemId, userId) {
  if (!userId) return

  const rows = await supabaseRest(
    `/items?id=eq.${encodeURIComponent(itemId)}&user_id=eq.${encodeURIComponent(userId)}&select=id&limit=1`
  )
  if (!Array.isArray(rows) || !rows[0]?.id) {
    throw new Error('Item does not belong to current user')
  }
}

export async function applyClassificationToItem(itemId, classification, options = {}) {
  await assertOwnedItem(itemId, options.userId)
  const currentRows = await fetchCurrentItemTagRows(itemId)
  const suppressedTagIds = await fetchSuppressedTagIds(itemId)
  const replaceUserTags = options.replaceUserTags === true
  const recordRemovedAiSuppressions = options.recordRemovedAiSuppressions === true
  const desiredUserTags = Array.isArray(options.userTags) ? options.userTags : []

  const currentAiTagIds = new Set(
    currentRows
      .filter(row => row?.applied_by !== 'user')
      .map(row => row?.tag_id)
      .filter(Boolean)
  )
  const currentUserTagIds = new Set(
    currentRows
      .filter(row => row?.applied_by === 'user')
      .map(row => row?.tag_id)
      .filter(Boolean)
  )

  const desiredAiTagIds = new Set()
  const desiredUserTagIds = new Set()

  for (const tag of Array.isArray(classification?.tags) ? classification.tags : []) {
    const ensured = await ensureTag(tag, options.userId)
    if (!ensured?.id) continue
    if (suppressedTagIds.has(ensured.id)) continue
    desiredAiTagIds.add(ensured.id)
    await upsertAiItemTag(itemId, ensured.id)
  }

  for (const tag of desiredUserTags) {
    const ensured = await ensureTag(tag, options.userId)
    if (!ensured?.id) continue
    desiredUserTagIds.add(ensured.id)
    await upsertUserItemTag(itemId, ensured.id)
    if (suppressedTagIds.has(ensured.id)) {
      await clearSuppression(itemId, ensured.id)
    }
  }

  for (const tagId of currentAiTagIds) {
    if (!desiredAiTagIds.has(tagId)) {
      await deleteItemTag(itemId, tagId)
      if (recordRemovedAiSuppressions) {
        await addSuppression(itemId, tagId)
      }
    }
  }

  if (replaceUserTags) {
    for (const tagId of currentUserTagIds) {
      if (!desiredUserTagIds.has(tagId)) {
        await deleteItemTag(itemId, tagId)
      }
    }
  }

  const itemPatch = { ai_status: 'completed' }
  if (Object.prototype.hasOwnProperty.call(classification || {}, 'category_id')) {
    itemPatch.category_id = classification.category_id || null
  }
  if (Object.prototype.hasOwnProperty.call(classification || {}, 'summary')) {
    itemPatch.summary = classification.summary || null
  }

  await supabaseRest(`/items?id=eq.${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: itemPatch,
  })

  return {
    ...classification,
    tags: await fetchStoredTagsForItem(itemId),
  }
}
