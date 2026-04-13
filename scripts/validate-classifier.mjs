import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { classifyBookmark, fetchCategories, fetchSupabaseJson } from '../api/_lib/classifier.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

loadEnvFile(path.join(projectRoot, '.env.local'))

const options = parseArgs(process.argv.slice(2))

const categories = await fetchCategories()
const items = await fetchSupabaseJson(
  `/items?select=id,title,url,note,type,created_at&url=not.is.null&order=created_at.desc&limit=${options.limit}`
)

const results = []
let abortedReason = ''

for (const [index, item] of items.entries()) {
  try {
    const classification = await classifyBookmark(
      {
        url: item.url,
        title: item.title,
        note: item.note,
      },
      { categories }
    )

    results.push({
      item_id: item.id,
      title: item.title,
      url: item.url,
      existing_type: item.type,
      ...classification,
    })

    const category = categories.find(entry => entry.id === classification.category_id)
    const tags = classification.tags.map(tag => `${tag.type}:${tag.name}`).join(', ')
    console.log(
      `[${index + 1}/${items.length}] ${truncate(item.title || item.url, 48)} -> ${category?.name || classification.category_id} (${classification.confidence})`
    )
    if (tags) {
      console.log(`    tags: ${tags}`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    results.push({
      item_id: item.id,
      title: item.title,
      url: item.url,
      error: message,
    })
    console.error(`[${index + 1}/${items.length}] ${truncate(item.title || item.url, 48)} -> ERROR: ${message}`)

    if (isQuotaError(message)) {
      abortedReason = 'quota_exceeded'
      console.error('\nValidation aborted early because the configured model hit quota limits.')
      break
    }
  }
}

const summary = {
  requested: items.length,
  total: results.length,
  success: results.filter(result => !result.error).length,
  failed: results.filter(result => result.error).length,
  aborted: Boolean(abortedReason),
  aborted_reason: abortedReason || null,
  confidence: countBy(results.filter(result => !result.error), 'confidence'),
  category: countBy(
    results
      .filter(result => !result.error)
      .map(result => ({
        name: categories.find(category => category.id === result.category_id)?.name || result.category_id,
      })),
    'name'
  ),
}

console.log('\nSummary:')
console.log(JSON.stringify(summary, null, 2))

if (options.out) {
  const outputPath = path.resolve(projectRoot, options.out)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        summary,
        results,
      },
      null,
      2
    )
  )
  console.log(`\nReport written to ${outputPath}`)
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return

  const text = fs.readFileSync(filePath, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separator = trimmed.indexOf('=')
    if (separator === -1) continue

    const key = trimmed.slice(0, separator).trim()
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

function parseArgs(args) {
  const defaults = {
    limit: 28,
    out: '',
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--limit' && args[index + 1]) {
      defaults.limit = Number(args[index + 1]) || defaults.limit
      index += 1
    } else if (arg.startsWith('--limit=')) {
      defaults.limit = Number(arg.split('=')[1]) || defaults.limit
    } else if (arg === '--out' && args[index + 1]) {
      defaults.out = args[index + 1]
      index += 1
    } else if (arg.startsWith('--out=')) {
      defaults.out = arg.split('=')[1] || ''
    }
  }

  return defaults
}

function truncate(text, maxLength) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text
}

function countBy(list, key) {
  return list.reduce((accumulator, item) => {
    const value = item[key] || 'unknown'
    accumulator[value] = (accumulator[value] || 0) + 1
    return accumulator
  }, {})
}

function isQuotaError(message) {
  return /429|RESOURCE_EXHAUSTED|quota/i.test(message)
}
