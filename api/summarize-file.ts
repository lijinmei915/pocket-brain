import { VercelRequest, VercelResponse } from '@vercel/node'
import { PDFParse } from 'pdf-parse'
import mammoth from 'mammoth'
import {
  canExposeClassifierDebug,
  getClassifierEnvDebug,
  hasClassifierApiKey,
  summarizeFileContent,
} from './_lib/classifier.js'

const MAX_FILE_BYTES = 20 * 1024 * 1024
const MIN_TEXT_LENGTH = 20

class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function getExtension(fileName = '') {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)
  return match?.[1] ?? ''
}

function isPdf(fileName: string, mimeType: string) {
  return mimeType === 'application/pdf' || getExtension(fileName) === 'pdf'
}

function isDocx(fileName: string, mimeType: string) {
  return (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    getExtension(fileName) === 'docx'
  )
}

function isLegacyDoc(fileName: string, mimeType: string) {
  return mimeType === 'application/msword' || getExtension(fileName) === 'doc'
}

function isTextLike(fileName: string, mimeType: string) {
  const ext = getExtension(fileName)
  return (
    mimeType.startsWith('text/') ||
    [
      'txt',
      'md',
      'markdown',
      'csv',
      'tsv',
      'json',
      'jsonl',
      'html',
      'htm',
      'xml',
      'log',
      'sql',
      'js',
      'jsx',
      'ts',
      'tsx',
      'css',
      'scss',
      'py',
      'rb',
      'go',
      'java',
      'rs',
      'yml',
      'yaml',
    ].includes(ext)
  )
}

async function fetchFileBuffer(fileUrl: string) {
  let parsed: URL
  try {
    parsed = new URL(fileUrl)
  } catch {
    throw new ApiError(400, '文件地址无效')
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new ApiError(400, '文件地址必须是 http(s)')
  }

  const response = await fetch(parsed.toString())
  if (!response.ok) {
    throw new ApiError(400, '无法读取上传后的文件')
  }

  const contentLength = Number(response.headers.get('content-length') || '0')
  if (contentLength > MAX_FILE_BYTES) {
    throw new ApiError(413, '文件过大，暂时无法解析总结')
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new ApiError(413, '文件过大，暂时无法解析总结')
  }
  return buffer
}

function decodeInlineBuffer(fileDataBase64: string) {
  const buffer = Buffer.from(fileDataBase64, 'base64')
  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new ApiError(413, '文件过大，暂时无法解析总结')
  }
  return buffer
}

async function extractPdfText(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return result.text || ''
  } finally {
    await parser.destroy()
  }
}

async function extractTextFromBuffer(buffer: Buffer, fileName: string, mimeType: string) {
  if (isPdf(fileName, mimeType)) {
    return extractPdfText(buffer)
  }

  if (isDocx(fileName, mimeType)) {
    const result = await mammoth.extractRawText({ buffer })
    return result.value || ''
  }

  if (isLegacyDoc(fileName, mimeType)) {
    throw new ApiError(415, '暂不支持 .doc，请转成 .docx 后再解析')
  }

  if (isTextLike(fileName, mimeType)) {
    return new TextDecoder('utf-8').decode(buffer)
  }

  throw new ApiError(415, '当前先支持 PDF、Word(.docx)、Markdown 和文本文件')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const payload = req.body ?? {}
  const fileName = typeof payload.fileName === 'string' ? payload.fileName : ''
  const mimeType = typeof payload.mimeType === 'string' ? payload.mimeType : ''
  const userId = typeof payload.userId === 'string' ? payload.userId : ''
  const fileUrl = typeof payload.fileUrl === 'string' ? payload.fileUrl : ''
  const fileDataBase64 = typeof payload.fileDataBase64 === 'string' ? payload.fileDataBase64 : ''
  const debug = (payload.debug === true || payload.debug === 'true' || payload.debug === '1') && canExposeClassifierDebug()

  if (!fileName) {
    return res.status(400).json({ error: 'Missing fileName' })
  }

  if (!fileUrl && !fileDataBase64) {
    return res.status(400).json({ error: 'Missing file data' })
  }

  if (!hasClassifierApiKey()) {
    return res.status(500).json({
      error: 'Missing QWEN_API_KEY or DASHSCOPE_API_KEY',
      ...(debug ? { debug: getClassifierEnvDebug() } : {}),
    })
  }

  try {
    const buffer = fileUrl ? await fetchFileBuffer(fileUrl) : decodeInlineBuffer(fileDataBase64)
    const text = (await extractTextFromBuffer(buffer, fileName, mimeType)).trim()

    if (text.length < MIN_TEXT_LENGTH) {
      throw new ApiError(422, '没有提取到足够的正文内容')
    }

    const result = await summarizeFileContent({ fileName, mimeType, text }, { userId })
    return res.status(200).json({
      ...result,
      textLength: text.length,
    })
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500
    const message = err instanceof Error ? err.message : String(err)
    if (status >= 500) {
      console.error('[PB] summarize file error:', err)
    }
    return res.status(status).json({
      error: status === 500 ? 'Internal server error' : message,
      ...(debug
        ? {
            debug: {
              message,
              env: getClassifierEnvDebug(),
            },
          }
        : {}),
    })
  }
}
