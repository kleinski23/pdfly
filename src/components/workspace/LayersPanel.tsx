import { useEffect, useRef } from 'react'
import type { DocApi } from '../../hooks/useDocument'
import { elementLabel, type EditElement, type EditSession } from '../../lib/editTypes'
import { Icon, type IconName } from '../Icon'

function layerIcon(el: EditElement): IconName {
  switch (el.kind) {
    case 'text':
      return 'text'
    case 'signature':
      return 'sign'
    case 'image':
      return 'image'
    case 'mark':
      return el.type === 'strikethrough' ? 'strike' : el.type
    case 'note':
      return 'note'
    case 'shape':
      return el.shape === 'rect' ? 'square' : 'circle'
    case 'line':
      return 'line'
    case 'ink':
      return 'pen'
  }
}

/**
 * Layers panel: every edit element on the document, grouped by page.
 * Clicking a layer selects it on the canvas (and jumps to its page);
 * layers can be reordered (z-order) or deleted from here.
 */
export function LayersPanel({ doc, edit }: { doc: DocApi; edit: EditSession }) {
  const selRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Keep the selected layer visible by scrolling ONLY the layers list — a plain
  // scrollIntoView would also scroll the page and shift the canvas under the cursor.
  useEffect(() => {
    if (!edit.selection) return
    const list = listRef.current
    const row = selRef.current
    if (!list || !row) return
    const lr = list.getBoundingClientRect()
    const rr = row.getBoundingClientRect()
    if (rr.top < lr.top) list.scrollTop += rr.top - lr.top
    else if (rr.bottom > lr.bottom) list.scrollTop += rr.bottom - lr.bottom
  }, [edit.selection])

  const byPage = new Map<number, EditElement[]>()
  for (const el of edit.elements) {
    const list = byPage.get(el.page)
    if (list) list.push(el)
    else byPage.set(el.page, [el])
  }

  // Elements render in array order, later = on top. "Forward" = later.
  const move = (id: string, dir: 1 | -1) => {
    edit.setElements((prev) => {
      const i = prev.findIndex((el) => el.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= prev.length) return prev
      const next = [...prev]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  const select = (el: EditElement) => {
    if (el.page !== doc.currentPage) doc.setCurrentPage(el.page)
    edit.setSelection(el.id)
  }

  const remove = (el: EditElement) => {
    edit.setElements((prev) => prev.filter((x) => x.id !== el.id))
    if (edit.selection === el.id) edit.setSelection(null)
  }

  return (
    <aside className="layers-panel" aria-label="Layers">
      <div className="rail-header">
        <span>Layers</span>
        <span className="rail-count">{edit.elements.length}</span>
      </div>
      <div className="layers-list" ref={listRef}>
        {edit.elements.length === 0 ? (
          <p className="layers-empty">
            Nothing here yet — use the Edit tool to add text, a signature, an image, or shapes, and
            they will show up as layers you can move, resize, and reorder.
          </p>
        ) : (
          [...byPage.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([page, els]) => (
              <div key={page} className="layer-group">
                <div className="layer-group-label">Page {page}</div>
                {[...els].reverse().map((el) => {
                  const idx = edit.elements.findIndex((e) => e.id === el.id)
                  const above = edit.elements[idx + 1] // drawn later = on top
                  const below = edit.elements[idx - 1]
                  const canRaise = idx >= 0 && idx < edit.elements.length - 1 && above?.page === el.page
                  const canLower = idx > 0 && below?.page === el.page
                  const label = elementLabel(el)
                  return (
                    <div
                      key={el.id}
                      ref={el.id === edit.selection ? selRef : undefined}
                      className={`layer-row${el.id === edit.selection ? ' selected' : ''}`}
                      onClick={() => select(el)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          select(el)
                        }
                      }}
                    >
                      <span className="layer-ico">
                        <Icon name={layerIcon(el)} size={14} strokeWidth={2} />
                      </span>
                      <span className="layer-name" title={label}>
                        {label}
                      </span>
                      <span className="layer-actions">
                        <button
                          type="button"
                          title="Bring forward"
                          aria-label="Bring forward"
                          disabled={!canRaise}
                          onClick={(e) => {
                            e.stopPropagation()
                            move(el.id, 1)
                          }}
                        >
                          <Icon name="chevronUp" size={13} strokeWidth={2.4} />
                        </button>
                        <button
                          type="button"
                          title="Send backward"
                          aria-label="Send backward"
                          disabled={!canLower}
                          onClick={(e) => {
                            e.stopPropagation()
                            move(el.id, -1)
                          }}
                        >
                          <Icon name="chevronDown" size={13} strokeWidth={2.4} />
                        </button>
                        <button
                          type="button"
                          title="Delete layer"
                          aria-label="Delete layer"
                          onClick={(e) => {
                            e.stopPropagation()
                            remove(el)
                          }}
                        >
                          <Icon name="trash" size={13} strokeWidth={2.2} />
                        </button>
                      </span>
                    </div>
                  )
                })}
              </div>
            ))
        )}
      </div>
    </aside>
  )
}
