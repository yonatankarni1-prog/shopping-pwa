import { PNG } from 'pngjs'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Placeholder PWA icons: solid brand-color background (#1a56db), no glyph.
// Good enough for the walking-skeleton gate; Task 7+ can replace with real art.
const BRAND = { r: 0x1a, g: 0x56, b: 0xdb }

function solidPng(size: number): Buffer {
  const png = new PNG({ width: size, height: size })
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2
      png.data[idx] = BRAND.r
      png.data[idx + 1] = BRAND.g
      png.data[idx + 2] = BRAND.b
      png.data[idx + 3] = 255
    }
  }
  return PNG.sync.write(png)
}

const outDir = join(process.cwd(), 'public', 'icons')
const targets: Array<[string, number]> = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]

for (const [name, size] of targets) {
  writeFileSync(join(outDir, name), solidPng(size))
  console.log(`✅ wrote ${name} (${size}x${size})`)
}
