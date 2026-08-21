// Form auto-detection + filling via MuPDF widgets (all local, free).
import { mupdfOutToArrayBuffer } from './security.ts'

export interface FormFieldInfo {
  page: number
  index: number
  type: string
  name: string
  value: string
  options: string[]
}

interface MupdfWidget {
  getFieldType(): string
  getValue(): string
  getOptions(): string[]
  fieldName: string
  setTextValue(v: string): void
  setChoiceValue(v: string): void
  toggle(): void
  destroy(): void
}

interface MupdfFormsDoc {
  countPages(): number
  loadPage(index: number): {
    getWidgets(): MupdfWidget[]
    destroy(): void
  }
  saveToBuffer(options?: Record<string, unknown>): { length: number; asUint8Array(): Uint8Array; destroy(): void }
  bake(): void
  destroy(): void
}

async function openDoc(bytes: ArrayBuffer): Promise<MupdfFormsDoc> {
  const mupdf = await import('mupdf')
  return mupdf.PDFDocument.openDocument(new Uint8Array(bytes), 'application/pdf') as unknown as MupdfFormsDoc
}

export async function getFormFields(bytes: ArrayBuffer): Promise<FormFieldInfo[]> {
  const doc = await openDoc(bytes)
  try {
    const out: FormFieldInfo[] = []
    const count = doc.countPages()
    for (let p = 0; p < count; p++) {
      const page = doc.loadPage(p)
      try {
        const widgets = page.getWidgets()
        widgets.forEach((w, i) => {
          let type = ''
          let value = ''
          let name = ''
          let options: string[] = []
          try {
            type = w.getFieldType()
          } catch {
            /* non-standard widget */
          }
          try {
            value = w.getValue()
          } catch {
            /* not filled */
          }
          try {
            options = w.getOptions()
          } catch {
            /* not a choice field */
          }
          try {
            name = w.fieldName
          } catch {
            /* unnamed */
          }
          out.push({ page: p + 1, index: i, type, name, value, options })
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

export interface FieldUpdate {
  page: number
  index: number
  value: string
}

export async function fillFormFields(bytes: ArrayBuffer, updates: FieldUpdate[]): Promise<ArrayBuffer> {
  if (updates.length === 0) return bytes.slice(0)
  const doc = await openDoc(bytes)
  try {
    for (const u of updates) {
      const page = doc.loadPage(u.page - 1)
      try {
        const widgets = page.getWidgets()
        const w = widgets[u.index]
        if (!w) continue
        const type = w.getFieldType()
        if (type === 'text') {
          w.setTextValue(u.value)
        } else if (type === 'choice' || type === 'radio') {
          try {
            w.setChoiceValue(u.value)
          } catch {
            /* choice may not accept the value */
          }
        } else if (type === 'checkbox') {
          const on = u.value === 'On' || u.value === 'Yes' || u.value === 'true' || u.value === '1'
          const currentlyOn = w.getValue() === 'Yes'
          if (on && !currentlyOn) w.toggle()
          if (!on && currentlyOn) w.toggle()
        }
      } finally {
        page.destroy()
      }
    }
    return mupdfOutToArrayBuffer(doc.saveToBuffer())
  } finally {
    doc.destroy()
  }
}

/** Flatten (bake) widgets/annotations into fixed page content. */
export async function flattenForm(bytes: ArrayBuffer): Promise<ArrayBuffer> {
  const doc = await openDoc(bytes)
  try {
    doc.bake()
    return mupdfOutToArrayBuffer(doc.saveToBuffer())
  } finally {
    doc.destroy()
  }
}
