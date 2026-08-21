// Applies overlay edits to a PDF in two passes:
// 1. pdf-lib stamps vector content (text, signature/image bitmaps).
// 2. MuPDF WASM adds real annotations (highlight family, notes, shapes, ink).
import { PDFDocument, rgb, StandardFonts, type PDFPage } from 'pdf-lib'
import type { EditElement } from './editTypes.ts'
import { mupdfOutToArrayBuffer, type MupdfOutBuffer } from './security.ts'

function hexToRgb01(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  const h = m ? m[1] : '000000'
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ]
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] ?? ''
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

const MARK_TYPE: Record<string, string> = {
  highlight: 'Highlight',
  underline: 'Underline',
  strikethrough: 'StrikeOut',
  squiggly: 'Squiggly',
}

interface MupdfAnnot {
  setRect(rect: number[]): void
  setQuadPoints(quadlist: number[][]): void
  setColor(color: number[]): void
  setInteriorColor(color: number[]): void
  setOpacity(opacity: number): void
  setContents(text: string): void
  setLine(a: number[], b: number[]): void
  setLineEndingStyles(start: string, end: string): void
  setInkList(list: number[][][]): void
  setBorderWidth(width: number): void
  destroy(): void
}

interface MupdfPage {
  createAnnotation(type: string): MupdfAnnot
  destroy(): void
}

interface MupdfDoc {
  loadPage(index: number): MupdfPage
  saveToBuffer(options?: Record<string, unknown>): MupdfOutBuffer
  destroy(): void
}

export async function applyEdits(
  bytes: ArrayBuffer,
  elements: EditElement[],
  pageSizes: Map<number, { width: number; height: number }>,
): Promise<ArrayBuffer> {
  // ---- Pass 1: pdf-lib stamps ----
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()

  for (const el of elements) {
    if (el.kind !== 'text' && el.kind !== 'signature' && el.kind !== 'image') continue
    const page: PDFPage = pages[el.page - 1]
    const size = pageSizes.get(el.page) ?? { width: page.getWidth(), height: page.getHeight() }
    if (el.kind === 'text') {
      const [r, g, b] = hexToRgb01(el.color)
      const lines = el.text.split('\n')
      lines.forEach((line, i) => {
        const lineWidth = font.widthOfTextAtSize(line, el.size)
        const x =
          el.align === 'center'
            ? el.x - lineWidth / 2
            : el.align === 'right'
              ? el.x - lineWidth
              : el.x
        page.drawText(line, {
          x,
          y: size.height - el.y - el.size * (i + 1),
          size: el.size,
          font,
          color: rgb(r, g, b),
        })
      })
    } else {
      const img = await doc.embedPng(dataUrlToBytes(el.dataUrl))
      page.drawImage(img, {
        x: el.x,
        y: size.height - el.y - el.h,
        width: el.w,
        height: el.h,
      })
    }
  }
  const stamped = await doc.save({ useObjectStreams: true })

  // ---- Pass 2: mupdf annotations ----
  const annots = elements.filter((el) => el.kind !== 'text' && el.kind !== 'signature' && el.kind !== 'image')
  if (annots.length === 0) return stamped

  const mupdf = await import('mupdf')
  const mdoc = mupdf.PDFDocument.openDocument(new Uint8Array(stamped), 'application/pdf') as unknown as MupdfDoc
  try {
    for (const el of annots) {
      const size = pageSizes.get(el.page)
      if (!size) continue
      const page = mdoc.loadPage(el.page - 1)
      try {
        if (el.kind === 'mark') {
          // Highlight-family annotations use QuadPoints rather than a Rect.
          const y1 = size.height - el.y - el.h
          const annot = page.createAnnotation(MARK_TYPE[el.type])
          annot.setQuadPoints([
            [el.x, y1, el.x + el.w, y1, el.x + el.w, y1 + el.h, el.x, y1 + el.h],
          ])
          annot.setColor(hexToRgb01(el.color))
          annot.setOpacity(0.35)
        } else if (el.kind === 'note') {
          const y1 = size.height - el.y - 18
          const annot = page.createAnnotation('Text')
          annot.setRect([el.x, y1, el.x + 18, y1 + 18])
          annot.setContents(el.text)
        } else if (el.kind === 'shape') {
          const y1 = size.height - el.y - el.h
          const annot = page.createAnnotation(el.shape === 'rect' ? 'Square' : 'Circle')
          annot.setRect([el.x, y1, el.x + el.w, y1 + el.h])
          annot.setColor(hexToRgb01(el.color))
          annot.setBorderWidth(el.width)
        } else if (el.kind === 'line') {
          const annot = page.createAnnotation('Line')
          annot.setLine(
            [el.x1, size.height - el.y1],
            [el.x2, size.height - el.y2],
          )
          annot.setColor(hexToRgb01(el.color))
          annot.setBorderWidth(el.width)
          annot.setLineEndingStyles('None', 'ClosedArrow')
        } else if (el.kind === 'ink') {
          const stroke: number[][] = []
          for (let i = 0; i < el.points.length; i += 2) {
            stroke.push([el.points[i], size.height - el.points[i + 1]])
          }
          const annot = page.createAnnotation('Ink')
          annot.setInkList([stroke])
          annot.setColor(hexToRgb01(el.color))
          annot.setBorderWidth(el.width)
        }
      } finally {
        page.destroy()
      }
    }
    return mupdfOutToArrayBuffer(mdoc.saveToBuffer())
  } finally {
    mdoc.destroy()
  }
}
