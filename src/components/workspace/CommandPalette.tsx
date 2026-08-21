import { useEffect, useMemo, useRef, useState } from 'react'
import { downloadBytes } from '../../lib/download'
import type { DocApi } from '../../hooks/useDocument'
import type { EditSession, EditToolMode } from '../../lib/editTypes'

export function CommandPalette({
  doc,
  edit,
  onClose,
}: {
  doc: DocApi
  edit: EditSession
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list: Array<{ id: string; label: string; run: () => void }> = [
      ...editTools.map((t) => ({
        id: `mode:${t.id}`,
        label: `${t.icon} ${t.label}`,
        run: () => {
          edit.setToolId('edit')
          edit.setEditMode(t.id)
          onClose()
        },
      })),
      ...panelTools.map((t) => ({
        id: `tool:${t.id}`,
        label: `${t.icon} ${t.label} tool`,
        run: () => {
          edit.setToolId(t.id)
          onClose()
        },
      })),
      ...Array.from({ length: doc.pageCount }, (_, i) => i + 1).map((p) => ({
        id: `page:${p}`,
        label: `📄 Go to page ${p}`,
        run: () => {
          doc.setCurrentPage(p)
          onClose()
        },
      })),
      {
        id: 'undo',
        label: '↩️ Undo',
        run: () => {
          doc.undo()
          onClose()
        },
      },
      {
        id: 'redo',
        label: '↪️ Redo',
        run: () => {
          doc.redo()
          onClose()
        },
      },
      {
        id: 'download',
        label: '⬇️ Download PDF',
        run: () => {
          if (doc.active) downloadBytes(doc.active.bytes, doc.active.name)
          onClose()
        },
      },
    ]
    if (!q) return list
    return list.filter((i) => i.label.toLowerCase().includes(q))
  }, [query, doc, edit, onClose])

  useEffect(() => {
    inputRef.current?.focus()
    setCursor(0)
  }, [query])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="palette" role="dialog" aria-label="Command palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette-input"
          type="text"
          placeholder="Search tools, pages, actions…  (Esc to close)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setCursor(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setCursor((c) => Math.min(c + 1, items.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setCursor((c) => Math.max(c - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              items[cursor]?.run()
            } else if (e.key === 'Escape') {
              onClose()
            }
          }}
        />
        <div className="palette-list">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              className={`palette-item${i === cursor ? ' active' : ''}`}
              onMouseEnter={() => setCursor(i)}
              onClick={item.run}
            >
              {item.label}
            </button>
          ))}
          {items.length === 0 && <p className="palette-empty">No matches</p>}
        </div>
      </div>
    </div>
  )
}

const editTools: Array<{ id: EditToolMode; label: string; icon: string }> = [
  { id: 'select', label: 'Select', icon: '✋' },
  { id: 'text', label: 'Add text', icon: 'T' },
  { id: 'editText', label: 'Edit existing text', icon: '✎' },
  { id: 'highlight', label: 'Highlight', icon: '🖍' },
  { id: 'note', label: 'Sticky note', icon: '📝' },
  { id: 'sign', label: 'Sign', icon: '✍️' },
  { id: 'pen', label: 'Freehand pen', icon: '✏️' },
]

const panelTools: Array<{ id: string; label: string; icon: string }> = [
  { id: 'merge', label: 'Merge', icon: '📚' },
  { id: 'split', label: 'Split', icon: '✂️' },
  { id: 'organize', label: 'Organize', icon: '🗂️' },
  { id: 'rotate', label: 'Rotate', icon: '🔄' },
  { id: 'crop', label: 'Crop', icon: '🎯' },
  { id: 'compress', label: 'Compress', icon: '🗜️' },
  { id: 'convert', label: 'Convert', icon: '🔁' },
  { id: 'protect', label: 'Protect', icon: '🔒' },
  { id: 'forms', label: 'Forms', icon: '📋' },
  { id: 'annots', label: 'Annots', icon: '💬' },
  { id: 'ocr', label: 'OCR', icon: '🔍' },
]
