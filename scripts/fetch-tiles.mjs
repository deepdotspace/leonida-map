/**
 * Downloads the in-game Leonida map tiles from the GTADB community repository
 * (CC BY 4.0) and lays them out for MapLibre under public/tiles/{z}/{x}/{y}.jpg.
 *
 * GTADB names its 256 px tiles `{z}/{z},{y},{x}.jpg`, where its level 0 is a
 * 4x4 grid covering game coordinates -16384..16384. A standard web-map pyramid
 * has one tile at level 0, so GTADB level z is web-map level z + 2.
 *
 * Each output tile is 512 px, made of the four GTADB tiles that cover it, so
 * the map keeps its full detail in a quarter of the files (the host allows
 * 20,000 per deploy and GTADB has 31,000). A 512 px tile at level z covers what
 * the 256 px tiles of level z + 1 cover, so GTADB level z becomes level z + 1.
 *
 * Usage: node scripts/fetch-tiles.mjs [path-to-existing-gtadb-checkout]
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const TILESET = 'maps/tiles/6/day'
const SOURCE_SIZE = 256
const LEVEL_OFFSET = 1
/** The open sea in GTADB's tiles; fills the parts of an edge tile GTADB has no image for. */
const SEA = { r: 47, g: 144, b: 176 }
const JPEG_QUALITY = 88
const outDir = fileURLToPath(new URL('../public/tiles', import.meta.url))

let checkout = process.argv[2]
let temporary = false
if (!checkout) {
  checkout = mkdtempSync(join(tmpdir(), 'gtadb-'))
  temporary = true
  const git = (...args) => execFileSync('git', args, { cwd: checkout, stdio: 'inherit' })
  git('clone', '--depth', '1', '--filter=blob:none', '--sparse', 'https://github.com/rolux/gtadb.org.git', '.')
  git('sparse-checkout', 'set', TILESET)
}

const source = join(checkout, TILESET)
if (!existsSync(source)) throw new Error(`No tiles found at ${source}`)

/** Output tile path -> the GTADB tiles inside it and where each one sits. */
const outputs = new Map()
for (const level of readdirSync(source)) {
  if (!/^\d+$/.test(level)) continue
  for (const file of readdirSync(join(source, level))) {
    const match = /^(\d+),(\d+),(\d+)\.jpg$/.exec(file)
    if (!match) continue
    const [z, y, x] = match.slice(1).map(Number)
    const path = join(String(z + LEVEL_OFFSET), String(x >> 1), `${y >> 1}.jpg`)
    const parts = outputs.get(path) ?? []
    parts.push({ input: join(source, level, file), left: (x & 1) * SOURCE_SIZE, top: (y & 1) * SOURCE_SIZE })
    outputs.set(path, parts)
  }
}
if (outputs.size === 0) throw new Error(`No tiles found at ${source}`)

rmSync(outDir, { recursive: true, force: true })
for (const [path, parts] of outputs) {
  const file = join(outDir, path)
  mkdirSync(join(file, '..'), { recursive: true })
  await sharp({ create: { width: SOURCE_SIZE * 2, height: SOURCE_SIZE * 2, channels: 3, background: SEA } })
    .composite(parts)
    .jpeg({ quality: JPEG_QUALITY })
    .toFile(file)
}

if (temporary) rmSync(checkout, { recursive: true, force: true })
console.log(`Wrote ${outputs.size} tiles to ${outDir}`)
