// Edit EXISTING text on a page: MuPDF redaction physically removes the old
// glyphs from the content stream, then pdf-lib stamps the replacement text.
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { mupdfOutToArrayBuffer } from './security.ts'

export interface TextItemInfo {
  str: string
  x: number
  y: number // top of the text line, y-down
  w: number
  h: number
  fontSize: number
}

interface MupdfRedactDoc {
  loadPage(index: number): {
    createAnnotation(type: string): { setRect(rect: number[]): void }
    applyRedactions(blackBoxes: boolean, imageMethod: number, lineArtMethod: number, textMethod: number): void
    destroy(): void
  }
  saveToBuffer(options?: Record<string, unknown>): { length: number; asUint8Array(): Uint8Array; destroy(): void }
  destroy(): void
}

export async function applyTextEdit(
  bytes: ArrayBuffer,
  pageNumber: number,
  item: TextItemInfo,
  newText: string,
  pageSize: { width: number; height: number },
  color = '#1a2033',
): Promise<ArrayBuffer> {
  // 1. MuPDF redaction removes the original text (text_method = remove).
  const mupdf = await import('mupdf')
  const doc = mupdf.PDFDocument.openDocument(new Uint8Array(bytes), 'application/pdf') as unknown as MupdfRedactDoc
  let mid: ArrayBuffer
  try {
    const page = doc.loadPage(pageNumber - 1)
    const pad = 2
    const x1 = item.x - pad
    const y2 = pageSize.height - item.y + pad
    const x2 = item.x + item.w + pad
    const y1 = pageSize.height - (item.y + item.h) - pad
    const annot = page.createAnnotation('Redact')
    annot.setRect([x1, y1, x2, y2])
    page.applyRedactions(false, 2, 1, 0)
    page.destroy()
    mid = mupdfOutToArrayBuffer(doc.saveToBuffer())
  } finally {
    doc.destroy()
  }

  // 2. pdf-lib stamps the replacement at the same position/size.
  const pdf = await PDFDocument.load(mid, { ignoreEncryption: true })
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const page = pdf.getPage(pageNumber - 1)
  const fontSize = item.fontSize || 12
  const [r, g, b] = hexToRgb01(color)
  page.drawText(newText, {
    x: item.x,
    y: pageSize.height - item.y - fontSize,
    size: fontSize,
    font,
    color: rgb(r, g, b),
  })
  return pdf.save({ useObjectStreams: true })
}

function hexToRgb01(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  const h = m ? m[1] : '000000'
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ]
}
