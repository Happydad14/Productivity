#!/usr/bin/env node
/**
 * Render public/icons/icon-source.svg to every raster icon the app ships:
 *   public/icons/apple-touch-icon.png  180  (iOS home screen)
 *   public/icons/icon-192.png          192  (PWA manifest, browser tab)
 *   public/icons/icon-512.png          512  (PWA manifest, splash, maskable)
 * and mirrors the source to public/favicon.svg so the tab icon can never
 * drift from the home-screen icon.
 *
 * PNGs are not a nicety here. iOS silently ignores an SVG `apple-touch-icon`
 * and falls back to a screenshot of the page, which is why "Add to Home
 * Screen" used to produce a blank-looking tile — public/favicon.svg was the
 * only icon the app had.
 *
 * Three marks live in public/icons/concepts/. Switch the app over with:
 *
 *   node scripts/render-icons.mjs ring      <- current
 *   node scripts/render-icons.mjs check
 *   node scripts/render-icons.mjs bars
 *
 * With no argument it re-renders whatever icon-source.svg currently holds.
 *
 * After changing the art, bump VERSION in public/sw.js — the worker precaches
 * the icons and serves them cache-first, so installed copies keep showing the
 * old mark until the cache name changes.
 *
 * Needs `sharp`, deliberately NOT a repo dependency: `npm i --no-save sharp`.
 *
 * The marks sit inside the middle ~76% of the canvas so they survive Android's
 * maskable crop (a circle of 80% diameter) and iOS's squircle — which is why
 * one 512 file can serve both the `any` and `maskable` manifest purposes.
 */
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { copyFileSync, existsSync, readdirSync } from 'node:fs'

const require = createRequire(import.meta.url)
let sharp
try {
  sharp = require('sharp')
} catch {
  console.error('sharp is not installed. Run `npm i --no-save sharp` first.')
  process.exit(1)
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const iconsDir = join(root, 'public', 'icons')
const conceptsDir = join(iconsDir, 'concepts')
const src = join(iconsDir, 'icon-source.svg')

const concept = process.argv[2]
if (concept) {
  const from = join(conceptsDir, `${concept}.svg`)
  if (!existsSync(from)) {
    const available = readdirSync(conceptsDir)
      .filter((f) => f.endsWith('.svg'))
      .map((f) => f.replace(/\.svg$/, ''))
    console.error(`No concept "${concept}". Available: ${available.join(', ')}`)
    process.exit(1)
  }
  copyFileSync(from, src)
  console.log(`icon-source.svg <- concepts/${concept}.svg`)
}

for (const [name, size] of [
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
]) {
  const out = join(iconsDir, name)
  // density: librsvg rasterises at 96dpi by default, which softens the
  // gradients and glows on the way up to 512.
  await sharp(src, { density: 300 }).resize(size, size).png().toFile(out)
  console.log(`${out} ${size}x${size}`)
}

copyFileSync(src, join(root, 'public', 'favicon.svg'))
console.log(`${join(root, 'public', 'favicon.svg')} <- icon-source.svg`)
