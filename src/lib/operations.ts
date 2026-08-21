import { PDFDocument, degrees, type PDFPage } from 'pdf-lib'

export type Rotation = 90 | 180 | 270

export interface CropBox {
  x: number
  y: number
  width: number
  height: number
}

/** order: 1-based page numbers in final order; 0 = insert a blank page. */
export interface RebuildOptions {
  order: number[]
  rotations?: Map<number, Rotation>
  crops?: Map<number, CropBox>
}

/**
 * Merge PDFs; optional 1-based page ranges per file (null/undefined = all pages).
 */
export async function mergePdfs(
  files: ArrayBuffer[],
  ranges?: Array<[number, number] | null>,
): Promise<ArrayBuffer> {
  const out = await PDFDocument.create()
  for (let i = 0; i < files.length; i++) {
    const src = await PDFDocument.load(files[i], { ignoreEncryption: true })
    const total = src.getPageCount()
    const r = ranges?.[i]
    const indices: number[] = r ? [] : src.getPageIndices()
    if (r) {
      const from = Math.max(1, r[0])
      const to = Math.min(total, r[1])
      for (let p = from; p <= to; p++) indices.push(p - 1)
    }
    const pages = await out.copyPages(src, indices)
    for (const page of pages) out.addPage(page)
  }
  return out.save({ useObjectStreams: true })
}

export async function splitPdf(bytes: ArrayBuffer, ranges: Array<[number, number]>): Promise<ArrayBuffer[]> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const results: ArrayBuffer[] = []
  for (const [from, to] of ranges) {
    const doc = await PDFDocument.create()
    const indices: number[] = []
    for (let p = from; p <= to; p++) indices.push(p - 1)
    const pages = await doc.copyPages(src, indices)
    for (const page of pages) doc.addPage(page)
    results.push(await doc.save({ useObjectStreams: true }))
  }
  return results
}

export async function splitEveryN(bytes: ArrayBuffer, n: number): Promise<ArrayBuffer[]> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const count = src.getPageCount()
  const ranges: Array<[number, number]> = []
  for (let from = 1; from <= count; from += n) {
    ranges.push([from, Math.min(from + n - 1, count)])
  }
  return splitPdf(bytes, ranges)
}

/** Split into parts each estimated to stay under maxBytes (page-count estimate). */
export async function splitByMaxSize(bytes: ArrayBuffer, maxBytes: number): Promise<ArrayBuffer[]> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const total = src.getPageCount()
  if (total <= 1 || maxBytes <= 0) return [bytes.slice(0)]
  // 25% safety margin: re-encoding each part adds structure overhead.
  const perPage = (bytes.byteLength / total) * 1.25
  const pagesPerFile = Math.max(1, Math.floor(maxBytes / perPage))
  const ranges: Array<[number, number]> = []
  for (let from = 1; from <= total; from += pagesPerFile) {
    ranges.push([from, Math.min(from + pagesPerFile - 1, total)])
  }
  return splitPdf(bytes, ranges)
}

export async function extractPages(bytes: ArrayBuffer, pages: number[]): Promise<ArrayBuffer> {
  return rebuildPdf(bytes, { order: pages })
}

export async function rebuildPdf(bytes: ArrayBuffer, opts: RebuildOptions): Promise<ArrayBuffer> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const out = await PDFDocument.create()

  const blankCount = opts.order.filter((p) => p === 0).length
  let blanks: PDFPage[] = []
  if (blankCount > 0) {
    const tmp = await PDFDocument.create()
    const size = src.getPageCount() > 0 ? src.getPage(0).getSize() : { width: 595, height: 842 }
    for (let i = 0; i < blankCount; i++) tmp.addPage([size.width, size.height])
    blanks = await out.copyPages(tmp, tmp.getPageIndices())
  }

  const copyIndices = opts.order.filter((p) => p !== 0).map((p) => p - 1)
  const copies = await out.copyPages(src, copyIndices)
  let ci = 0
  let bi = 0
  for (const original of opts.order) {
    if (original === 0) {
      out.addPage(blanks[bi++])
      continue
    }
    const page = copies[ci++]
    const rotation = opts.rotations?.get(original)
    if (rotation) page.setRotation(degrees(rotation))
    const crop = opts.crops?.get(original)
    if (crop) {
      const size = src.getPage(original - 1).getSize()
      const x = crop.x
      const y = size.height - crop.y - crop.height
      page.setMediaBox(x, y, crop.width, crop.height)
      page.setCropBox(x, y, crop.width, crop.height)
    }
    out.addPage(page)
  }
  return out.save({ useObjectStreams: true })
}

/** Re-encode the PDF via pdf-lib (strips structure overhead; keeps text layer). */
export async function compressLight(bytes: ArrayBuffer): Promise<ArrayBuffer> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  return doc.save({ useObjectStreams: true })
}

export interface ImageInput {
  bytes: ArrayBuffer
  name: string
}

export type PageSizeMode = 'auto' | 'a4' | 'letter'

export async function imagesToPdf(images: ImageInput[], pageSize: PageSizeMode = 'auto'): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create()
  for (const img of images) {
    const isJpg = /\.jpe?g$/i.test(img.name)
    const embedded = isJpg ? await doc.embedJpg(img.bytes) : await doc.embedPng(img.bytes)
    if (pageSize === 'auto') {
      const page = doc.addPage([embedded.width, embedded.height])
      page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height })
    } else {
      const size: [number, number] = pageSize === 'a4' ? [595.28, 841.89] : [612, 792]
      const page = doc.addPage(size)
      const margin = 36
      const maxW = size[0] - margin * 2
      const maxH = size[1] - margin * 2
      const scale = Math.min(maxW / embedded.width, maxH / embedded.height, 1)
      const w = embedded.width * scale
      const h = embedded.height * scale
      page.drawImage(embedded, { x: (size[0] - w) / 2, y: (size[1] - h) / 2, width: w, height: h })
    }
  }
  return doc.save({ useObjectStreams: true })
}

/** Insert a blank page (or several) after the given 1-based page. */
export async function insertBlankPages(bytes: ArrayBuffer, afterPage: number, count: number): Promise<ArrayBuffer> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const total = src.getPageCount()
  const tmp = await PDFDocument.create()
  const size = src.getPage(0).getSize()
  for (let i = 0; i < count; i++) tmp.addPage([size.width, size.height])
  const out = await PDFDocument.create()
  const copies = await out.copyPages(src, src.getPageIndices())
  const blanks = await out.copyPages(tmp, tmp.getPageIndices())
  let bi = 0
  for (let p = 1; p <= total; p++) {
    out.addPage(copies[p - 1])
    if (p === afterPage) for (let i = 0; i < count; i++) out.addPage(blanks[bi++])
  }
  return out.save({ useObjectStreams: true })
}

/** Insert a single image page after the given 1-based page. */
export async function insertImagePage(
  bytes: ArrayBuffer,
  image: ImageInput,
  afterPage: number,
): Promise<ArrayBuffer> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const total = src.getPageCount()
  const tmp = await PDFDocument.create()
  const isJpg = /\.jpe?g$/i.test(image.name)
  const embedded = isJpg ? await tmp.embedJpg(image.bytes) : await tmp.embedPng(image.bytes)
  const imgPage = tmp.addPage([embedded.width, embedded.height])
  imgPage.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height })

  const out = await PDFDocument.create()
  const copies = await out.copyPages(src, src.getPageIndices())
  const [imgCopy] = await out.copyPages(tmp, [0])
  for (let p = 1; p <= total; p++) {
    out.addPage(copies[p - 1])
    if (p === afterPage) out.addPage(imgCopy)
  }
  return out.save({ useObjectStreams: true })
}

export async function getPageSize(bytes: ArrayBuffer, page: number): Promise<{ width: number; height: number }> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const size = doc.getPage(page - 1).getSize()
  return { width: size.width, height: size.height }
}

export async function pdfPageCount(bytes: ArrayBuffer): Promise<number> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  return doc.getPageCount()
}
