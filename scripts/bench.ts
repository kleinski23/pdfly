// Phase 4 performance benchmark: builds a 100-page and a ~20 MB test PDF,
// then times the core local operations.
// Run: node --experimental-strip-types scripts/bench.ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { deflateSync } from 'node:zlib'
import { performance } from 'node:perf_hooks'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import * as ops from '../src/lib/operations.ts'
import { encryptPdf } from '../src/lib/security.ts'

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** Generate an incompressible RGB noise PNG of the given size (approx. w*h*3 bytes). */
function makeNoisePng(w: number, h: number): Buffer {
  const stride = 1 + w * 3
  const raw = Buffer.alloc(h * stride)
  // True random noise: incompressible, so the test doc reaches its target size.
  for (let y = 0; y < h; y++) {
    raw[y * stride] = 0 // PNG filter byte
    randomBytes(w * 3).copy(raw, y * stride + 1)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

async function buildDocs() {
  mkdirSync('test-data', { recursive: true })
  console.log('Building benchmark documents…')

  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (let i = 1; i <= 100; i++) {
    const p = doc.addPage([595, 842])
    p.drawText(`Page ${i} of the benchmark document`, { x: 50, y: 800, size: 18, font })
    p.drawRectangle({ x: 50, y: 700, width: 400, height: 1 })
  }
  writeFileSync('test-data/bench-100p.pdf', await doc.save())
  console.log('  bench-100p.pdf written')

  const noise = makeNoisePng(800, 600)
  const big = await PDFDocument.create()
  for (let i = 0; i < 16; i++) {
    const p = big.addPage([595, 842])
    const img = await big.embedPng(noise)
    p.drawImage(img, { x: 0, y: 0, width: 595, height: 842 })
  }
  writeFileSync('test-data/bench-20mb.pdf', await big.save())
  console.log('  bench-20mb.pdf written')
}

async function main() {
  await buildDocs()

  const t100 = readFileSync('test-data/bench-100p.pdf')
  const t20 = readFileSync('test-data/bench-20mb.pdf')
  console.log(
    `Docs: 100p = ${(t100.byteLength / 1024).toFixed(0)} KB · 20MB-target = ${(t20.byteLength / 1024 / 1024).toFixed(1)} MB`,
  )

  const fmt = (ms: number) => `${ms.toFixed(0)} ms`

  let t = performance.now()
  const light = await ops.compressLight(t20)
  console.log(`compressLight(20MB)   → ${(light.byteLength / 1024 / 1024).toFixed(1)} MB in ${fmt(performance.now() - t)}`)

  t = performance.now()
  const parts = await ops.splitEveryN(t100, 10)
  console.log(`splitEveryN(100p, 10) → ${parts.length} parts in ${fmt(performance.now() - t)}`)

  t = performance.now()
  const merged = await ops.mergePdfs([t100, t100])
  console.log(`mergePdfs(2×100p)     → ${(merged.byteLength / 1024).toFixed(0)} KB in ${fmt(performance.now() - t)}`)

  t = performance.now()
  await ops.rebuildPdf(t100, { order: Array.from({ length: 100 }, (_, i) => i + 1) })
  console.log(`rebuildPdf(100p)      → ${fmt(performance.now() - t)}`)

  t = performance.now()
  const bigParts = await ops.splitPdf(t20, [
    [1, 4],
    [5, 8],
    [9, 12],
    [13, 16],
  ])
  console.log(`splitPdf(20MB → 4)    → ${bigParts.length} parts in ${fmt(performance.now() - t)}`)

  t = performance.now()
  const enc = await encryptPdf(t100, {
    userPassword: 'bench123',
    allowPrinting: true,
    allowCopying: false,
    allowModifying: false,
  })
  console.log(`encryptPdf(100p)      → ${fmt(performance.now() - t)} (${(enc.byteLength / 1024).toFixed(0)} KB)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
