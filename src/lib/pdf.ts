import { getDocument, GlobalWorkerOptions, OPS, type PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = workerUrl

// pdf.js transfers the data buffer to its worker, so we always hand it a copy.
// The cache holds the in-flight promise, not the resolved proxy: the rail, canvas
// and tools all ask for the same document at once, and caching only on resolve
// would let every one of them spawn its own pdf.js worker.
const cache = new Map<string, Promise<PDFDocumentProxy>>()

export function getDoc(id: string, bytes: ArrayBuffer): Promise<PDFDocumentProxy> {
  const hit = cache.get(id)
  if (hit) return hit
  const pending = getDocument({ data: new Uint8Array(bytes.slice(0)) }).promise
  cache.set(id, pending)
  // A failed load must not stick in the cache, or a retry can never succeed.
  pending.catch(() => {
    if (cache.get(id) === pending) cache.delete(id)
  })
  return pending
}

export function invalidateDoc(id: string): void {
  const pending = cache.get(id)
  if (pending) {
    cache.delete(id)
    // pdfjs v6: teardown lives on the loading task, not the proxy.
    void pending.then((doc) => doc.loadingTask.destroy()).catch(() => {})
  }
}

export async function getPdfPageCount(id: string, bytes: ArrayBuffer): Promise<number> {
  return (await getDoc(id, bytes)).numPages
}

export async function renderPageToCanvas(
  id: string,
  bytes: ArrayBuffer,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number,
): Promise<{ width: number; height: number }> {
  const doc = await getDoc(id, bytes)
  const page = await doc.getPage(pageNumber)
  const viewport = page.getViewport({ scale })
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.floor(viewport.width * dpr)
  canvas.height = Math.floor(viewport.height * dpr)
  canvas.style.width = `${Math.floor(viewport.width)}px`
  canvas.style.height = `${Math.floor(viewport.height)}px`
  await page
    .render({
      canvas,
      viewport,
      transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
    })
    .promise
  // Page size in PDF points (scale 1).
  return { width: viewport.width / scale, height: viewport.height / scale }
}

export async function renderThumbnail(
  id: string,
  bytes: ArrayBuffer,
  pageNumber: number,
  width = 100,
): Promise<string> {
  const doc = await getDoc(id, bytes)
  const page = await doc.getPage(pageNumber)
  const base = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale: width / base.width })
  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  await page.render({ canvas, viewport }).promise
  return canvas.toDataURL('image/png')
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas export failed'))), type, quality)
  })
}

/** Rebuild the PDF as JPEG page images (used by heavy compression & flatten). */
export async function rasterizePdf(
  id: string,
  bytes: ArrayBuffer,
  scale: number,
  jpegQuality: number,
): Promise<ArrayBuffer> {
  const doc = await getDoc(id, bytes)
  const { PDFDocument } = await import('pdf-lib')
  const out = await PDFDocument.create()
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    await page.render({ canvas, viewport }).promise
    const blob = await canvasToBlob(canvas, 'image/jpeg', jpegQuality)
    const img = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()))
    const pg = out.addPage([viewport.width, viewport.height])
    pg.drawImage(img, { x: 0, y: 0, width: viewport.width, height: viewport.height })
  }
  return out.save({ useObjectStreams: true })
}

export async function pdfToImages(
  id: string,
  bytes: ArrayBuffer,
  pages: number[],
  opts: { dpi: number; format: 'jpeg' | 'png'; quality?: number },
): Promise<Array<{ page: number; blob: Blob }>> {
  const doc = await getDoc(id, bytes)
  const scale = opts.dpi / 72
  const results: Array<{ page: number; blob: Blob }> = []
  for (const p of pages) {
    const page = await doc.getPage(p)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    await page.render({ canvas, viewport }).promise
    const type = opts.format === 'png' ? 'image/png' : 'image/jpeg'
    results.push({ page: p, blob: await canvasToBlob(canvas, type, opts.quality) })
  }
  return results
}

/** Convert any browser-decodable image (JPG/PNG/WebP/BMP…) to PNG bytes for pdf-lib embedding. */
export async function imageFileToPngBytes(file: File): Promise<{ bytes: ArrayBuffer; name: string }> {
  if (/\.png$/i.test(file.name)) return { bytes: await file.arrayBuffer(), name: file.name }
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
  bitmap.close()
  const blob = await canvasToBlob(canvas, 'image/png')
  return { bytes: await blob.arrayBuffer(), name: file.name.replace(/\.[^.]+$/, '') + '.png' }
}

/** Text lines with page-space bounding boxes (y-down), used by the edit-text tool. */
export async function getPageTextItems(
  id: string,
  bytes: ArrayBuffer,
  pageNumber: number,
): Promise<Array<{ str: string; x: number; y: number; w: number; h: number; fontSize: number }>> {
  const doc = await getDoc(id, bytes)
  const page = await doc.getPage(pageNumber)
  const viewport = page.getViewport({ scale: 1 })
  const content = await page.getTextContent()
  const items: Array<{ str: string; x: number; y: number; w: number; h: number; fontSize: number }> = []
  for (const it of content.items) {
    if (!('str' in it)) continue
    const transform = it.transform as number[]
    const fontSize = it.height ?? 12
    const x = transform[4]
    const baselineY = transform[5] // PDF y, bottom-up
    const yTop = viewport.height - baselineY - fontSize * 0.85
    items.push({
      str: it.str as string,
      x,
      y: yTop,
      w: Math.max(8, (it.width as number) || 8),
      h: fontSize * 1.3,
      fontSize,
    })
  }
  return items
}

/** Extract the distinct images painted on a page (for the extract tool). */
export async function extractPageImages(
  id: string,
  bytes: ArrayBuffer,
  pageNumber: number,
): Promise<Array<{ blob: Blob; name: string }>> {
  const doc = await getDoc(id, bytes)
  const page = await doc.getPage(pageNumber)
  const opList = await page.getOperatorList()
  const seen = new Set<string>()
  const out: Array<{ blob: Blob; name: string }> = []
  for (let i = 0; i < opList.fnArray.length; i++) {
    const fn = opList.fnArray[i]
    if (fn !== OPS.paintImageXObject && fn !== OPS.paintInlineImageXObject) continue
    const name = String(opList.argsArray[i]?.[0] ?? `img-${i}`)
    if (seen.has(name)) continue
    seen.add(name)
    try {
      const imgObj = (await page.objs.get(name)) as
        | { width: number; height: number; data?: Uint8ClampedArray }
        | undefined
      if (!imgObj || !imgObj.data || !imgObj.width || !imgObj.height) continue
      const canvas = document.createElement('canvas')
      canvas.width = imgObj.width
      canvas.height = imgObj.height
      const ctx = canvas.getContext('2d')!
      const imageData = new ImageData(new Uint8ClampedArray(imgObj.data), imgObj.width, imgObj.height)
      ctx.putImageData(imageData, 0, 0)
      out.push({ blob: await canvasToBlob(canvas, 'image/png'), name: `page-${pageNumber}-image-${out.length + 1}.png` })
    } catch {
      // skip undecodable image objects
    }
  }
  return out
}
