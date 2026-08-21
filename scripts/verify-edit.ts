// Headless verification of Phase 2 edit/annotation/forms pipeline via mupdf.
// Run: node --experimental-strip-types scripts/verify-edit.ts
import { readFileSync } from 'node:fs'
import { PDFDocument } from 'pdf-lib'
import { applyEdits } from '../src/lib/edit.ts'
import { applyTextEdit } from '../src/lib/textEdit.ts'
import { mupdfOutToArrayBuffer, type MupdfOutBuffer } from '../src/lib/security.ts'

let failures = 0
function check(cond: boolean, label: string) {
  if (cond) console.log(`  ok  ${label}`)
  else {
    failures++
    console.error(`FAIL  ${label}`)
  }
}

// Minimal mupdf view types for verification.
interface MupdfAnnot {
  getType(): string
  getContents(): string
  setContents(text: string): void
  destroy(): void
}
interface MupdfWidget {
  getType(): string
  getFieldType(): string
  setTextValue(v: string): void
  getValue(): string
  toggle(): void
  destroy(): void
}
interface MupdfPage {
  createAnnotation(type: string): MupdfAnnot
  getAnnotations(): MupdfAnnot[]
  getWidgets(): MupdfWidget[]
  destroy(): void
}
interface MupdfDoc {
  loadPage(index: number): MupdfPage
  saveToBuffer(options?: Record<string, unknown>): MupdfOutBuffer
  bake(): void
  destroy(): void
}

async function open(bytes: ArrayBuffer): Promise<MupdfDoc> {
  const mupdf = await import('mupdf')
  return mupdf.PDFDocument.openDocument(new Uint8Array(bytes), 'application/pdf') as unknown as MupdfDoc
}

async function main() {
  const a = readFileSync('test-data/sample-a.pdf')
  const pageSizes = new Map<number, { width: number; height: number }>([
    [1, { width: 400, height: 600 }],
  ])

  console.log('Apply edits (pdf-lib stamp + mupdf annots):')
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  )
  const sigDataUrl = `data:image/png;base64,${png.toString('base64')}`

  const edited = await applyEdits(a, [
    { kind: 'text', id: 't1', page: 1, x: 40, y: 60, text: 'Hello PDFly', size: 18, color: '#4338ca' },
    { kind: 'signature', id: 's1', page: 1, x: 40, y: 400, w: 120, h: 48, dataUrl: sigDataUrl, name: 'sig' },
    { kind: 'mark', id: 'm1', page: 1, type: 'highlight', x: 40, y: 250, w: 160, h: 20, color: '#fde047' },
    { kind: 'note', id: 'n1', page: 1, x: 300, y: 100, text: 'Review this clause' },
    { kind: 'line', id: 'l1', page: 1, x1: 40, y1: 500, x2: 200, y2: 520, color: '#b91c1c', width: 2 },
    { kind: 'ink', id: 'i1', page: 1, points: [100, 100, 120, 120, 140, 110, 160, 130], color: '#1a2033', width: 2 },
    { kind: 'shape', id: 'r1', page: 1, shape: 'rect', x: 240, y: 300, w: 100, h: 60, color: '#0e7490', width: 2 },
  ], pageSizes)

  const mdoc = await open(edited)
  const page = mdoc.loadPage(0)
  const annots = page.getAnnotations()
  const types = annots.map((x) => x.getType()).sort()
  check(types.includes('Highlight'), 'highlight annot created')
  check(types.includes('Text'), 'note annot created (Text type)')
  check(types.includes('Line'), 'line annot created')
  check(types.includes('Ink'), 'ink annot created')
  check(types.includes('Square'), 'rect annot created')
  const note = annots.find((x) => x.getType() === 'Text')
  check(note?.getContents() === 'Review this clause', 'note contents set')
  const saved = mupdfOutToArrayBuffer(mdoc.saveToBuffer())
  check(saved.byteLength > 0, 'annotated PDF saves')
  page.destroy()
  mdoc.destroy()

  console.log('Form fill via mupdf widgets:')
  const formDoc = await PDFDocument.create()
  const fpage = formDoc.addPage([400, 600])
  const form = formDoc.getForm()
  const nameField = form.createTextField('fullname')
  nameField.addToPage(fpage, { x: 50, y: 500, width: 200, height: 24 })
  const agree = form.createCheckBox('agree')
  agree.addToPage(fpage, { x: 50, y: 450, width: 20, height: 20 })
  const formBytes = await formDoc.save()

  const fdoc = await open(formBytes)
  const fpage2 = fdoc.loadPage(0)
  const widgets = fpage2.getWidgets()
  check(widgets.length === 2, '2 form widgets detected')
  const textW = widgets.find((w) => w.getFieldType() === 'text')
  const checkW = widgets.find((w) => w.getFieldType() === 'checkbox')
  check(!!textW && !!checkW, 'text + checkbox widget types detected')
  if (textW) {
    textW.setTextValue('Ada Lovelace')
    check(textW.getValue() === 'Ada Lovelace', 'text widget filled')
  }
  if (checkW) {
    checkW.toggle()
    check(checkW.getValue() === 'Yes', 'checkbox toggled on')
  }
  const filled = mupdfOutToArrayBuffer(fdoc.saveToBuffer())
  fpage2.destroy()
  fdoc.destroy()

  const re = await open(filled)
  const rpage = re.loadPage(0)
  const rw = rpage.getWidgets()
  check(rw.find((w) => w.getFieldType() === 'text')?.getValue() === 'Ada Lovelace', 'filled value persists after save')
  rpage.destroy()
  re.destroy()

  console.log('Text edit via redaction:')
  const editedText = await applyTextEdit(
    a,
    1,
    { str: 'sample-a.pdf page 1', x: 50, y: 280, w: 300, h: 31, fontSize: 24 },
    'NEW TITLE HERE',
    { width: 400, height: 600 },
  )
  const tdoc = await open(editedText)
  const tpage = tdoc.loadPage(0)
  const text = tpage.toStructuredText().asText()
  check(text.includes('NEW TITLE HERE'), 'replacement text is in the PDF')
  check(!text.includes('sample-a.pdf page 1'), 'original text physically removed (redaction)')
  tpage.destroy()
  tdoc.destroy()

  console.log(failures === 0 ? '\nALL EDIT CHECKS PASSED ✅' : `\n${failures} CHECK(S) FAILED ❌`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
