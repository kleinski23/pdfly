import { useEffect, useRef, useState } from 'react'
import { applyEdits } from '../../../lib/edit'
import { applyTextEdit } from '../../../lib/textEdit'
import { getPageSize } from '../../../lib/operations'
import { extractPageImages, getPageTextItems, imageFileToPngBytes } from '../../../lib/pdf'
import { downloadBlob } from '../../../lib/download'
import { nextId, type EditElement, type EditSession, type EditToolMode } from '../../../lib/editTypes'
import type { DocApi } from '../../../hooks/useDocument'

const MODES: Array<{ id: EditToolMode; label: string }> = [
  { id: 'select', label: '✋ Select' },
  { id: 'text', label: 'T Text' },
  { id: 'editText', label: '✎ Edit text' },
  { id: 'highlight', label: '🖍 Highlight' },
  { id: 'underline', label: '〰 Underline' },
  { id: 'strikethrough', label: '␣ Strike' },
  { id: 'squiggly', label: '~ Squiggle' },
  { id: 'note', label: '📝 Note' },
  { id: 'rect', label: '▭ Rect' },
  { id: 'ellipse', label: '◯ Ellipse' },
  { id: 'line', label: '➖ Line' },
  { id: 'pen', label: '✏️ Pen' },
  { id: 'sign', label: '✍️ Sign' },
  { id: 'image', label: '🖼 Image' },
]

const MARK_MODES = new Set<EditToolMode>(['highlight', 'underline', 'strikethrough', 'squiggly'])

export function EditTool({ doc, edit }: { doc: DocApi; edit: EditSession }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string>()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const selected = edit.elements.find((el) => el.id === edit.selection) ?? null
  const [newText, setNewText] = useState('')

  // Detect text lines when the edit-text mode is active.
  useEffect(() => {
    if (edit.editMode !== 'editText' || !doc.active) return
    let cancelled = false
    edit.setTextItems(null)
    getPageTextItems(doc.active.id, doc.active.bytes, doc.currentPage)
      .then((items) => {
        if (!cancelled) edit.setTextItems(items)
      })
      .catch(() => {
        if (!cancelled) edit.setTextItems([])
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit.editMode, doc.active?.id, doc.active?.bytes, doc.rev, doc.currentPage])

  // Reset the draft text when a new target is picked.
  useEffect(() => {
    setNewText(edit.editTarget?.item.str ?? '')
  }, [edit.editTarget?.item.str])

  const apply = async () => {
    if (!doc.active || edit.elements.length === 0) return
    setBusy(true)
    setMsg(undefined)
    try {
      const pageSizes = new Map<number, { width: number; height: number }>()
      for (const el of edit.elements) {
        if (!pageSizes.has(el.page)) {
          pageSizes.set(el.page, await getPageSize(doc.active.bytes, el.page))
        }
      }
      const result = await applyEdits(doc.active.bytes, edit.elements, pageSizes)
      doc.mutate(result)
      edit.setElements(() => [])
      edit.setSelection(null)
      setMsg('Edits applied to the PDF — Undo available.')
    } catch (err) {
      console.error('apply edits failed', err)
      setMsg('Apply failed — try removing the last element.')
    } finally {
      setBusy(false)
    }
  }

  const updateSelected = (patch: Partial<EditElement>) => {
    if (!edit.selection) return
    edit.setElements((prev) => prev.map((el) => (el.id === edit.selection ? ({ ...el, ...patch } as EditElement) : el)))
  }

  const applyTextEditTarget = async () => {
    if (!doc.active || !edit.editTarget) return
    setBusy(true)
    setMsg(undefined)
    try {
      const size = await getPageSize(doc.active.bytes, edit.editTarget.page)
      const result = await applyTextEdit(doc.active.bytes, edit.editTarget.page, edit.editTarget.item, newText, size)
      doc.mutate(result)
      edit.setEditTarget(null)
      edit.setTextItems(null)
      setMsg('Text replaced — the original text was removed from the PDF.')
    } catch (err) {
      console.error('text edit failed', err)
      setMsg('Text edit failed — try a shorter replacement.')
    } finally {
      setBusy(false)
    }
  }

  const placeSignatureOnAllPages = () => {
    const sigs = edit.elements.filter((el) => el.kind === 'signature')
    if (sigs.length === 0 || !doc.active) return
    const copies = sigs.flatMap((sig) =>
      Array.from({ length: doc.pageCount }, (_, i) => i + 1)
        .filter((p) => p !== sig.page)
        .map((p) => ({ ...sig, id: nextId(), page: p }) as EditElement),
    )
    edit.setElements((prev) => [...prev, ...copies])
    setMsg(`Signature placed on all ${doc.pageCount} pages.`)
  }

  const extractImages = async () => {
    if (!doc.active) return
    setBusy(true)
    setMsg(undefined)
    try {
      const images = await extractPageImages(doc.active.id, doc.active.bytes, doc.currentPage)
      if (images.length === 0) {
        setMsg('No images found on this page.')
      } else {
        images.forEach((img) => downloadBlob(img.blob, img.name))
        setMsg(`Extracted ${images.length} image(s) — check your downloads.`)
      }
    } catch {
      setMsg('Image extraction failed.')
    } finally {
      setBusy(false)
    }
  }

  const pickImage = async (file: File) => {
    try {
      const png = await imageFileToPngBytes(file)
      edit.setPendingImage({ dataUrl: await pngToDataUrl(png.bytes), name: png.name })
      edit.setEditMode('image')
    } catch {
      setMsg('Could not read that image.')
    }
  }

  return (
    <div className="tool">
      <h3>Edit page</h3>
      <p className="tool-hint">
        {edit.elements.length} element{edit.elements.length === 1 ? '' : 's'} on the canvas. Click the page to add, drag to
        move, then Apply.
      </p>

      <div className="mode-grid">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`tool-btn${edit.editMode === m.id ? ' active' : ''}`}
            onClick={() => edit.setEditMode(m.id)}
            title={m.label}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="tool-actions wrap">
        <label className="field-row">
          <span className="tool-hint">Color</span>
          <input
            type="color"
            value={edit.editColor}
            onChange={(e) => edit.setEditColor(e.target.value)}
            aria-label="Edit color"
          />
        </label>
        {(edit.editMode === 'text' || edit.editMode === 'sign') && (
          <label className="field-row">
            <span className="tool-hint">Size</span>
            <input
              className="input input-sm"
              type="number"
              min={8}
              max={72}
              value={edit.editSize}
              onChange={(e) => edit.setEditSize(Number(e.target.value) || 16)}
              aria-label="Text size"
            />
          </label>
        )}
        {['rect', 'ellipse', 'line', 'pen'].includes(edit.editMode) && (
          <label className="field-row">
            <span className="tool-hint">Width</span>
            <input
              className="input input-sm"
              type="number"
              min={1}
              max={12}
              value={edit.editWidth}
              onChange={(e) => edit.setEditWidth(Number(e.target.value) || 2)}
              aria-label="Stroke width"
            />
          </label>
        )}
      </div>

      {edit.editMode === 'sign' && (
        <div className="seg">
          <p className="tool-hint">
            {edit.signature ? (
              <>Using “{edit.signature.name}” — click the page to place it.</>
            ) : (
              <>Pick or create a signature first, then click the page to place it.</>
            )}
          </p>
          <div className="tool-actions">
            <button type="button" className="btn btn-sm" onClick={edit.openSignatureModal}>
              {edit.signature ? 'Change signature' : '✍️ Create signature'}
            </button>
            {edit.signature && (
              <button type="button" className="btn btn-sm" onClick={() => edit.setSignature(null)}>
                Clear
              </button>
            )}
          </div>
          {edit.elements.some((el) => el.kind === 'signature') && (
            <div className="tool-actions">
              <button type="button" className="btn btn-sm" onClick={placeSignatureOnAllPages}>
                ⧉ Place on all pages
              </button>
            </div>
          )}
        </div>
      )}

      {edit.editMode === 'image' && (
        <div className="seg">
          <p className="tool-hint">
            {edit.pendingImage ? (
              <>“{edit.pendingImage.name}” ready — click the page to place it.</>
            ) : (
              <>Choose an image, then click the page to place it.</>
            )}
          </p>
          <div className="tool-actions">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                if (e.target.files?.[0]) void pickImage(e.target.files[0])
                e.currentTarget.value = ''
              }}
            />
            <button type="button" className="btn btn-sm" onClick={() => imageInputRef.current?.click()}>
              🖼 Choose image
            </button>
            {edit.pendingImage && (
              <button type="button" className="btn btn-sm" onClick={() => edit.setPendingImage(null)}>
                Clear
              </button>
            )}
          </div>
          <div className="tool-actions">
            <button type="button" className="btn btn-sm" onClick={() => void extractImages()} disabled={busy}>
              📤 Extract images on this page
            </button>
          </div>
        </div>
      )}

      {selected && (
        <div className="seg">
          <h4>Selected element</h4>
          {(selected.kind === 'text' || selected.kind === 'note') && (
            <label className="field">
              {selected.kind === 'text' ? 'Text' : 'Note text'}
              <textarea
                className="input"
                rows={3}
                value={selected.text}
                onChange={(e) => updateSelected({ text: e.target.value })}
                autoFocus
              />
            </label>
          )}
          {selected.kind === 'text' && (
            <label className="field">
              Align
              <select
                className="input"
                value={selected.align}
                onChange={(e) => updateSelected({ align: e.target.value as 'left' | 'center' | 'right' })}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>
          )}
          {MARK_MODES.has(edit.editMode) && selected.kind === 'mark' && (
            <div className="tool-actions">
              <label className="field-row">
                <span className="tool-hint">Color</span>
                <input
                  type="color"
                  value={selected.color}
                  onChange={(e) => updateSelected({ color: e.target.value } as Partial<EditElement>)}
                />
              </label>
            </div>
          )}
          <div className="tool-actions">
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                edit.setElements((prev) => prev.filter((el) => el.id !== edit.selection))
                edit.setSelection(null)
              }}
            >
              🗑 Delete
            </button>
          </div>
        </div>
      )}

      {edit.editMode === 'editText' && (
        <div className="seg">
          {edit.textItems !== null && edit.textItems.length === 0 && (
            <p className="msg error">
              No text layer found on this page — it may be a scan. Use OCR or the Add Text tool instead.
            </p>
          )}
          {edit.editTarget ? (
            <>
              <p className="tool-hint">Replace text on page {edit.editTarget.page} (original is removed).</p>
              <label className="field">
                New text
                <textarea
                  className="input"
                  rows={3}
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  autoFocus
                />
              </label>
              <div className="tool-actions">
                <button type="button" className="btn btn-sm" onClick={() => edit.setEditTarget(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void applyTextEditTarget()}
                  disabled={busy || !newText.trim()}
                >
                  {busy ? 'Replacing…' : 'Replace text'}
                </button>
              </div>
            </>
          ) : (
            <p className="tool-hint">Click a highlighted text line on the page to edit it.</p>
          )}
        </div>
      )}

      <div className="tool-actions">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => {
            edit.setElements(() => [])
            edit.setSelection(null)
          }}
          disabled={edit.elements.length === 0}
        >
          Clear all
        </button>
        <button type="button" className="btn btn-primary" onClick={() => void apply()} disabled={busy || edit.elements.length === 0}>
          {busy ? 'Applying…' : 'Apply to PDF'}
        </button>
      </div>
      {msg && <p className="msg ok">{msg}</p>}
    </div>
  )
}

async function pngToDataUrl(bytes: ArrayBuffer): Promise<string> {
  const blob = new Blob([bytes], { type: 'image/png' })
  return await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(blob)
  })
}
