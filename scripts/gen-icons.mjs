/**
 * 生成 PWA 图标
 * 修改 Logo SVG 后运行：npm run gen-icons
 */
import sharp from 'sharp'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svgPath = resolve(__dirname, '../public/favicon.svg')
const svg = readFileSync(svgPath)

const sizes = [
  { size: 192, out: 'public/icon-192.png' },
  { size: 512, out: 'public/icon-512.png' },
]

for (const { size, out } of sizes) {
  await sharp(svg)
    .resize(size, size)
    .toFile(resolve(__dirname, '..', out))
  console.log(`✓ ${out}`)
}
