// Headless OCR verification: render a PDF page via mupdf, OCR it locally with
// Tesseract.js (our own worker/core/lang files), and validate the searchable
// PDF output.
// Run: node --experimental-strip-types scripts/verify-ocr.ts
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PDFDocument } from 'pdf-lib'

let failures = 0
function check(cond: boolean, label: string) {
  if (cond) console.log(`  ok  ${label}`)
  else {
    failures++
    console.error(`FAIL  ${label}`)
  }
}

async function main() {
  // 1. Render page 1 of sample-a to a PNG via mupdf.
  const { readFileSync } = await import('node:fs')
  const a = readFileSync('test-data/sample-a.pdf')
  const mupdf = await import('mupdf')
  const mdoc = mupdf.PDFDocument.openDocument(new Uint8Array(a), 'application/pdf')
  const mpage = mdoc.loadPage(0)
  const pixmap = mpage.toPixmap([2, 0, 0, 2, 0, 0], mupdf.ColorSpace.DeviceRGB, false)
  const png = pixmap.asPNG()
  mkdirSync('test-data', { recursive: true })
  writeFileSync('test-data/page1.png', png)
  mpage.destroy()
  mdoc.destroy()
  console.log('Rendered page 1 → test-data/page1.png')

  // 2. OCR with Tesseract.js using our local core/lang files. Node uses its
  // own worker entry, so no workerPath override.
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, {
    corePath: resolve('node_modules/tesseract.js-core/tesseract-core-simd.wasm.js'),
    langPath: resolve('public/tessdata'),
    gzip: true,
    logger: () => {},
  })

  const result = await worker.recognize('test-data/page1.png', {}, { text: true, pdf: true })
  const text = result.data?.text ?? ''
  console.log(`  OCR text: ${JSON.stringify(text.slice(0, 80))}`)
  check(text.toLowerCase().includes('sample-a'), 'recognized text contains the page label')

  const pdfBytes = (result.data?.pdf as Uint8Array | undefined) ?? null
  check(!!pdfBytes && pdfBytes.length > 0, 'searchable PDF produced')

  if (pdfBytes) {
    const doc = await PDFDocument.load(pdfBytes as unknown as ArrayBuffer)
    check(doc.getPageCount() === 1, 'searchable PDF has 1 page')
    // The generated PDF must contain the recognized text (searchable layer).
    const out = mupdf.PDFDocument.openDocument(pdfBytes, 'application/pdf')
    const page = out.loadPage(0)
    const extracted = page.toStructuredText().asText()
    check(extracted.toLowerCase().includes('sample-a'), 'searchable PDF text layer contains recognized text')
    page.destroy()
    out.destroy()
  }
  await worker.terminate()

  console.log(failures === 0 ? '\nALL OCR CHECKS PASSED ✅' : `\n${failures} CHECK(S) FAILED ❌`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
