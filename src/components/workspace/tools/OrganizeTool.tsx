import { useEffect, useRef, useState, type DragEvent, type MouseEvent } from 'react'
import { downloadBytes } from '../../../lib/download'
import { imageFileToPngBytes } from '../../../lib/pdf'
import { extractPages, insertImagePage, rebuildPdf, type Rotation } from '../../../lib/operations'
import { formatBytes } from '../../../lib/format'
import type { DocApi } from '../../../hooks/useDocument'
import { PageThumb } from '../PageThumb'
import { Icon } from '../../Icon'

export function OrganizeTool({ doc }: { doc: DocApi }) {
  const [order, setOrder] = useState<number[]>([])
  const [rotated, setRotated] = useState<Map<number, Rotation>>(new Map())
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string>()
  const imageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setOrder(Array.from({ length: doc.pageCount }, (_, i) => i + 1))
    setRotated(new Map())
    setSelected(new Set())
  }, [doc.activeId, doc.rev, doc.pageCount])

  const insertImage = async (file: File) => {
    if (!doc.active || selected.size === 0) return
    setBusy(true)
    setMsg(undefined)
    try {
      const img = await imageFileToPngBytes(file)
      const afterPage = order[Math.min(...selected)] // original page number of first selected entry
      const result = await insertImagePage(doc.active.bytes, img, afterPage)
      doc.mutate(result)
      setMsg(`Inserted "${file.name}" after page ${afterPage}.`)
    } catch {
      setMsg('Could not read that image.')
    } finally {
      setBusy(false)
    }
  }

  const toggle = (idx: number, e: MouseEvent) => {
    e.stopPropagation()
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  const move = (from: number, to: number) => {
    setOrder((prev) => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  const rotateSel = () => {
    setRotated((prev) => {
      const next = new Map(prev)
      for (const idx of selected) {
        const p = order[idx]
        if (p === 0) continue
        next.set(p, (((next.get(p) ?? 0) + 90) % 360) as Rotation)
      }
      return next
    })
  }

  const duplicateSel = () => {
    const idxs = [...selected].sort((a, b) => b - a)
    setOrder((prev) => {
      const next = [...prev]
      for (const i of idxs) next.splice(i + 1, 0, next[i])
      return next
    })
  }

  const deleteSel = () => {
    setOrder((prev) => prev.filter((_, i) => !selected.has(i)))
    setSelected(new Set())
  }

  const insertBlank = () => {
    if (selected.size === 0) return
    const at = Math.min(...selected)
    setOrder((prev) => {
      const next = [...prev]
      next.splice(at + 1, 0, 0)
      return next
    })
  }

  const extractSel = async () => {
    if (!doc.active) return
    const pages = [...selected]
      .map((i) => order[i])
      .filter((p): p is number => p > 0)
      .sort((a, b) => a - b)
    if (!pages.length) return
    try {
      const result = await extractPages(doc.active.bytes, pages)
      downloadBytes(result, 'extracted.pdf')
      setMsg(`Extracted ${pages.length} page(s) — check your downloads.`)
    } catch {
      setMsg('Extract failed.')
    }
  }

  const apply = async () => {
    if (!doc.active) return
    setBusy(true)
    setMsg(undefined)
    try {
      const result = await rebuildPdf(doc.active.bytes, { order, rotations: rotated })
      doc.mutate(result)
    } catch {
      setMsg('Apply failed.')
    } finally {
      setBusy(false)
    }
  }

  const onDragStart = (e: DragEvent, idx: number) => {
    e.dataTransfer.setData('text/plain', String(idx))
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDrop = (e: DragEvent, to: number) => {
    e.preventDefault()
    const from = Number(e.dataTransfer.getData('text/plain'))
    if (!Number.isNaN(from) && from !== to) move(from, to)
  }

  return (
    <div className="tool">
      <h3>Organize pages</h3>
      <p className="tool-hint">
        Click to select, drag to reorder. Then apply — or extract selected pages.
      </p>

      <div className="tool-actions wrap">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setSelected(new Set(order.map((_, i) => i)))}
        >
          Select all
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setSelected(new Set())}
          disabled={!selected.size}
        >
          Clear
        </button>
        <button type="button" className="btn btn-sm" onClick={rotateSel} disabled={!selected.size}>
          <Icon name="rotate" size={15} strokeWidth={2.1} /> Rotate 90°
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={duplicateSel}
          disabled={!selected.size}
        >
          <Icon name="pages" size={15} strokeWidth={2.1} /> Duplicate
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={insertBlank}
          disabled={!selected.size}
        >
          <Icon name="file" size={15} strokeWidth={2.1} /> Insert blank
        </button>
        <button type="button" className="btn btn-sm" onClick={deleteSel} disabled={!selected.size}>
          <Icon name="trash" size={15} strokeWidth={2.1} /> Delete
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => imageInputRef.current?.click()}
          disabled={selected.size === 0}
        >
          <Icon name="image" size={15} strokeWidth={2.1} /> Insert image
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            if (e.target.files?.[0]) void insertImage(e.target.files[0])
            e.currentTarget.value = ''
          }}
        />
      </div>

      <div className="organize-grid">
        {order.map((page, idx) => (
          <div
            key={`${idx}-${page}`}
            className={`organize-item${selected.has(idx) ? ' selected' : ''}`}
            draggable
            onDragStart={(e) => onDragStart(e, idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, idx)}
          >
            {page === 0 ? (
              <div className="thumb thumb-blank" role="img" aria-label="Blank page">
                Blank
              </div>
            ) : (
              <PageThumb doc={doc} page={page} width={88} onClick={(e) => toggle(idx, e)} />
            )}
            <span className="organize-label">{page === 0 ? '—' : page}</span>
          </div>
        ))}
      </div>

      <div className="tool-actions">
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => void extractSel()}
          disabled={!selected.size}
        >
          <Icon name="upload" size={15} strokeWidth={2.1} /> Extract selected
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void apply()}
          disabled={busy}
        >
          {busy ? 'Applying…' : 'Apply changes'}
        </button>
      </div>

      {msg && <p className="msg ok">{msg}</p>}
      {doc.active && (
        <p className="tool-hint">
          Result: {order.length} page{order.length > 1 ? 's' : ''} ·{' '}
          {formatBytes(doc.active.bytes.byteLength)}
        </p>
      )}
    </div>
  )
}
