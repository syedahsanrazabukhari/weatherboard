import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const svgPath = path.join(rootDir, 'public', 'icon.svg')
const maskableSvgPath = path.join(rootDir, 'public', 'icon-maskable.svg')
const publicDir = path.join(rootDir, 'public')

async function generate() {
  console.log('Generating PWA PNG icons from SVG...')

  const svgBuffer = fs.readFileSync(svgPath)
  const maskableSvgBuffer = fs.readFileSync(maskableSvgPath)

  // 1. 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'))
  console.log('✓ Generated pwa-192x192.png')

  // 2. 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'))
  console.log('✓ Generated pwa-512x512.png')

  // 3. 512x512 Maskable
  await sharp(maskableSvgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512-maskable.png'))
  console.log('✓ Generated pwa-512x512-maskable.png')

  // 4. Apple Touch Icon (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'))
  console.log('✓ Generated apple-touch-icon.png')

  console.log('All PWA icons generated successfully!')
}

generate().catch((err) => {
  console.error('Icon generation failed:', err)
  process.exit(1)
})
