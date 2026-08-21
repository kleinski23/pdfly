// Headless verification of the PDF operations + encryption against real files.
// Run: node --experimental-strip-types scripts/verify-ops.ts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { PDFDocument } from 'pdf-lib'
import * as ops from '../src/lib/operations.ts'
import { encryptPdf, unlockPdf } from '../src/lib/security.ts'

let failures = 0
function check(cond: boolean, label: string) {
  if (cond) {
    console.log(`  ok  ${label}`)
  } else {
    failures++
    console.error(`FAIL  ${label}`)
  }
}

async function main() {
  console.log('Building sample PDFs…')
  mkdirSync('test-data', { recursive: true })
  const samples: Array<[string, number]> = [
    ['sample-a.pdf', 3],
    ['sample-b.pdf', 2],
  ]
  for (const [name, pages] of samples) {
    const doc = await PDFDocument.create()
    for (let i = 1; i <= pages; i++) {
      const p = doc.addPage([400, 600])
      p.drawText(`${name} page ${i}`, { x: 50, y: 300, size: 24 })
    }
    writeFileSync(`test-data/${name}`, await doc.save())
  }
  const a = readFileSync('test-data/sample-a.pdf')
  const b = readFileSync('test-data/sample-b.pdf')
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  )

  console.log('Merge / split:')
  const merged = await ops.mergePdfs([a, b])
  check((await PDFDocument.load(merged)).getPageCount() === 5, 'merge 3+2 → 5 pages')

  const mergedRanged = await ops.mergePdfs([a, b], [
    [2, 3],
    [1, 1],
  ])
  check((await PDFDocument.load(mergedRanged)).getPageCount() === 3, 'merge with page ranges → 3 pages')

  const bySize = await ops.splitByMaxSize(a, 1000)
  check(bySize.length >= 2 && bySize.every((p) => p.byteLength <= 1000), 'split by max size → parts under limit')

  const parts = await ops.splitPdf(a, [
    [1, 2],
    [3, 3],
  ])
  check(
    parts.length === 2 &&
      (await PDFDocument.load(parts[0])).getPageCount() === 2 &&
      (await PDFDocument.load(parts[1])).getPageCount() === 1,
    'split by ranges → 2 + 1 pages',
  )
  check((await ops.splitEveryN(a, 2)).length === 2, 'split every 2 pages → 2 files')

  console.log('Rebuild (organize):')
  const rebuilt = await ops.rebuildPdf(a, { order: [3, 1], rotations: new Map([[3, 90]]) })
  const rdoc = await PDFDocument.load(rebuilt)
  check(rdoc.getPageCount() === 2, 'reorder → 2 pages')
  check(rdoc.getPage(0).getRotation().angle === 90, 'rotation applied (90°)')

  const dup = await ops.rebuildPdf(a, { order: [1, 1, 2, 3, 0] })
  check((await PDFDocument.load(dup)).getPageCount() === 5, 'duplicate + blank insert → 5 pages')

  const crop = await ops.rebuildPdf(a, {
    order: [1, 2, 3],
    crops: new Map([[1, { x: 0, y: 0, width: 200, height: 300 }]]),
  })
  const cdoc = await PDFDocument.load(crop)
  const box = cdoc.getPage(0).getCropBox()
  check(Math.round(box.width) === 200 && Math.round(box.height) === 300, 'crop box applied')

  const extract = await ops.extractPages(a, [2, 3])
  check((await PDFDocument.load(extract)).getPageCount() === 2, 'extract pages 2-3 → 2 pages')

  const withImage = await ops.insertImagePage(a, { bytes: png, name: 'pixel.png' }, 1)
  check((await PDFDocument.load(withImage)).getPageCount() === 4, 'insert image page after page 1 → 4 pages')

  const light = await ops.compressLight(a)
  check(light.byteLength > 0, 'compress (light) returns bytes')

  const size = await ops.getPageSize(a, 1)
  check(size.width === 400 && size.height === 600, 'page size read')

  console.log('Images → PDF:')
  const imgPdf = await ops.imagesToPdf([{ bytes: png, name: 'pixel.png' }])
  check((await PDFDocument.load(imgPdf)).getPageCount() === 1, '1×1 PNG → 1-page PDF')
  const imgPdfA4 = await ops.imagesToPdf([{ bytes: png, name: 'pixel.png' }], 'a4')
  const a4doc = await PDFDocument.load(imgPdfA4)
  check(Math.round(a4doc.getPage(0).getSize().width) === 595, 'A4 page size mode')

  console.log('Encrypt / unlock (mupdf):')
  const enc = await encryptPdf(a, {
    userPassword: 'secret123',
    allowPrinting: true,
    allowCopying: false,
    allowModifying: false,
  })
  let requiresPassword = false
  try {
    await PDFDocument.load(enc)
  } catch {
    requiresPassword = true
  }
  check(requiresPassword, 'encrypted PDF cannot be opened without password')

  const unlocked = await unlockPdf(enc, 'secret123')
  check((await PDFDocument.load(unlocked)).getPageCount() === 3, 'unlock with correct password')

  let wrongThrows = false
  try {
    await unlockPdf(enc, 'nope')
  } catch {
    wrongThrows = true
  }
  check(wrongThrows, 'wrong password throws')

  console.log(failures === 0 ? '\nALL CHECKS PASSED ✅' : `\n${failures} CHECK(S) FAILED ❌`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
