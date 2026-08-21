// Annotation inventory: list, delete, and export summaries (PRD EDT-002).
import { mupdfOutToArrayBuffer } from './security.ts'

export interface AnnotInfo {
  page: number
  index: number
  type: string
  contents: string
}

interface MupdfAnnotsDoc {
  countPages(): number
  loadPage(index: number): {
    getAnnotations(): Array<{
      getType(): string
      getContents(): string
      destroy(): void
    }>
    deleteAnnotation(annot: { destroy(): void }): void
    destroy(): void
  }
  saveToBuffer(options?: Record<string, unknown>): { length: number; asUint8Array(): Uint8Array; destroy(): void }
  destroy(): void
}

async function openDoc(bytes: ArrayBuffer): Promise<MupdfAnnotsDoc> {
  const mupdf = await import('mupdf')
  return mupdf.PDFDocument.openDocument(new Uint8Array(bytes), 'application/pdf') as unknown as MupdfAnnotsDoc
}

export async function listAnnotations(bytes: ArrayBuffer): Promise<AnnotInfo[]> {
  const doc = await openDoc(bytes)
  try {
    const out: AnnotInfo[] = []
    const count = doc.countPages()
    for (let p = 0; p < count; p++) {
      const page = doc.loadPage(p)
      try {
        const annots = page.getAnnotations()
        annots.forEach((a, i) => {
          let type = ''
          let contents = ''
          try {
            type = a.getType()
          } catch {
            /* no type */
          }
          try {
            contents = a.getContents() ?? ''
          } catch {
            /* no contents */
          }
          out.push({ page: p + 1, index: i, type, contents })
        })
      } finally {
        page.destroy()
      }
    }
    return out
  } finally {
    doc.destroy()
  }
}

export async function deleteAnnotation(bytes: ArrayBuffer, page: number, index: number): Promise<ArrayBuffer> {
  const doc = await openDoc(bytes)
  try {
    const p = doc.loadPage(page - 1)
    try {
      const annots = p.getAnnotations()
      const target = annots[index]
      if (target) p.deleteAnnotation(target)
    } finally {
      p.destroy()
    }
    return mupdfOutToArrayBuffer(doc.saveToBuffer())
  } finally {
    doc.destroy()
  }
}

export function annotationsToText(list: AnnotInfo[]): string {
  if (list.length === 0) return 'No annotations in this document.\n'
  const lines = list.map((a) => `Page ${a.page} — ${a.type}${a.contents ? `: ${a.contents}` : ''}`)
  return lines.join('\n') + '\n'
}
