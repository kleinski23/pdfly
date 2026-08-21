import { useEffect, useMemo, useRef, useState } from 'react'
import { downloadBytes } from '../../lib/download'
import type { DocApi } from '../../hooks/useDocument'
import type { EditSession, EditToolMode } from '../../lib/editTypes'
import { Icon, type IconName } from '../Icon'

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
    const list: Array<{ id: string; label: string; icon: IconName; run: () => void }> = [
      ...editTools.map((t) => ({
        id: `mode:${t.id}`,
        label: t.label,
        icon: t.icon,
        run: () => {
          edit.setToolId('edit')
          edit.setEditMode(t.id)
          onClose()
        },
      })),
      ...panelTools.map((t) => ({
        id: `tool:${t.id}`,
        label: `${t.label} tool`,
        icon: t.icon,
        run: () => {
          edit.setToolId(t.id)
          onClose()
        },
      })),
      ...Array.from({ length: doc.pageCount }, (_, i) => i + 1).map((p) => ({
        id: `page:${p}`,
        label: `Go to page ${p}`,
        icon: 'file' as IconName,
        run: () => {
          doc.setCurrentPage(p)
          onClose()
        },
      })),
      {
        id: 'undo',
        label: 'Undo',
        icon: 'undo',
        run: () => {
          doc.undo()
          onClose()
        },
      },
      {
        id: 'redo',
        label: 'Redo',
        icon: 'redo',
        run: () => {
          doc.redo()
          onClose()
        },
      },
      {
        id: 'download',
        label: 'Download PDF',
        icon: 'download',
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
      <div
        className="palette"
        role="dialog"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
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
              <Icon name={item.icon} size={17} strokeWidth={2} />
              {item.label}
            </button>
          ))}
          {items.length === 0 && <p className="palette-empty">No matches</p>}
        </div>
      </div>
    </div>
  )
}

const editTools: Array<{ id: EditToolMode; label: string; icon: IconName }> = [
  { id: 'select', label: 'Select', icon: 'cursor' },
  { id: 'text', label: 'Add text', icon: 'text' },
  { id: 'editText', label: 'Edit existing text', icon: 'editText' },
  { id: 'highlight', label: 'Highlight', icon: 'highlight' },
  { id: 'note', label: 'Sticky note', icon: 'note' },
  { id: 'sign', label: 'Sign', icon: 'sign' },
  { id: 'pen', label: 'Freehand pen', icon: 'pen' },
]

const panelTools: Array<{ id: string; label: string; icon: IconName }> = [
  { id: 'merge', label: 'Merge', icon: 'merge' },
  { id: 'split', label: 'Split', icon: 'split' },
  { id: 'organize', label: 'Organize', icon: 'organize' },
  { id: 'rotate', label: 'Rotate', icon: 'rotate' },
  { id: 'crop', label: 'Crop', icon: 'crop' },
  { id: 'compress', label: 'Compress', icon: 'compress' },
  { id: 'convert', label: 'Convert', icon: 'convert' },
  { id: 'protect', label: 'Protect', icon: 'protect' },
  { id: 'forms', label: 'Forms', icon: 'forms' },
  { id: 'annots', label: 'Annotations', icon: 'annots' },
  { id: 'ocr', label: 'OCR', icon: 'ocr' },
]
