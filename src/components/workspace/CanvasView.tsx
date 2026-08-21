import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { renderPageToCanvas } from '../../lib/pdf'
import { downloadBytes } from '../../lib/download'
import type { DocApi } from '../../hooks/useDocument'
import { nextId, type EditElement, type EditSession, type MarkType } from '../../lib/editTypes'
import { Icon } from '../Icon'

interface Draft {
  kind: 'mark' | 'shape' | 'line' | 'ink'
  markType: MarkType
  x0: number
  y0: number
  x: number
  y: number
  points: number[]
}

interface BBox {
  x: number
  y: number
  w: number
  h: number
}

const imgCache = new Map<string, HTMLImageElement>()

function bboxOf(el: EditElement): BBox {
  switch (el.kind) {
    case 'text':
      return { x: el.x, y: el.y, w: Math.max(24, el.text.length * el.size * 0.55), h: el.size }
    case 'signature':
    case 'image':
      return { x: el.x, y: el.y, w: el.w, h: el.h }
    case 'mark':
    case 'shape':
      return { x: el.x, y: el.y, w: el.w, h: el.h }
    case 'note':
      return { x: el.x, y: el.y, w: 18, h: 18 }
    case 'line':
      return {
        x: Math.min(el.x1, el.x2),
        y: Math.min(el.y1, el.y2),
        w: Math.abs(el.x2 - el.x1),
        h: Math.abs(el.y2 - el.y1),
      }
    case 'ink': {
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (let i = 0; i < el.points.length; i += 2) {
        minX = Math.min(minX, el.points[i])
        minY = Math.min(minY, el.points[i + 1])
        maxX = Math.max(maxX, el.points[i])
        maxY = Math.max(maxY, el.points[i + 1])
      }
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
    }
  }
}

function getImage(dataUrl: string, onLoad: () => void): HTMLImageElement | null {
  const cached = imgCache.get(dataUrl)
  if (cached) return cached
  const img = new Image()
  img.onload = onLoad
  img.src = dataUrl
  imgCache.set(dataUrl, img)
  return null
}

export function CanvasView({
  doc,
  onHome,
  edit,
}: {
  doc: DocApi
  onHome: () => void
  edit: EditSession
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const busyRef = useRef(false)
  const tokenRef = useRef(0)
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null)
  const drawingRef = useRef(false)
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  // Draft mirror in a ref: pointermove can fire before React commits the
  // state, so event handlers read/write the ref and state mirrors it.
  const draftRef = useRef<Draft | null>(null)
  const [, setTick] = useState(0)
  const { active, currentPage, pageCount, zoom } = doc

  // Images decode asynchronously; redraw the overlay when they are ready.
  useEffect(() => {
    const onRedraw = () => setTick((t) => t + 1)
    window.addEventListener('pdfly-overlay-redraw', onRedraw)
    return () => window.removeEventListener('pdfly-overlay-redraw', onRedraw)
  }, [])

  // Render the base page; capture page size in points (scale 1).
  useEffect(() => {
    if (!active || !canvasRef.current || busyRef.current) return
    busyRef.current = true
    const token = ++tokenRef.current
    renderPageToCanvas(active.id, active.bytes, currentPage, canvasRef.current, zoom)
      .then((size) => {
        if (token === tokenRef.current) setPageSize(size)
      })
      .catch((err) => {
        if (token === tokenRef.current && err?.name !== 'PasswordException') {
          console.error('page render failed', err)
        }
      })
      .finally(() => {
        busyRef.current = false
      })
  }, [active, active?.id, active?.bytes, doc.rev, currentPage, zoom])

  // Size the overlay canvas to match the page at the current zoom.
  useEffect(() => {
    const overlay = overlayRef.current
    if (!overlay || !pageSize) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    overlay.width = Math.floor(pageSize.width * zoom * dpr)
    overlay.height = Math.floor(pageSize.height * zoom * dpr)
    overlay.style.width = `${Math.floor(pageSize.width * zoom)}px`
    overlay.style.height = `${Math.floor(pageSize.height * zoom)}px`
  }, [pageSize, zoom])

  // Draw all edit elements + the draft on the overlay.
  useEffect(() => {
    const overlay = overlayRef.current
    const ctx = overlay?.getContext('2d')
    if (!overlay || !ctx || !pageSize) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, 0, 0)
    ctx.clearRect(0, 0, pageSize.width, pageSize.height)
    for (const el of edit.elements) {
      if (el.page === currentPage) drawElement(ctx, el, edit.selection === el.id)
    }
    // Existing-text editing: outline the detected text lines.
    if (edit.editMode === 'editText' && edit.textItems) {
      ctx.strokeStyle = 'rgba(43, 68, 255, 0.55)'
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      for (const it of edit.textItems) {
        ctx.strokeRect(it.x, it.y, it.w, it.h)
      }
      ctx.setLineDash([])
    }
    if (draft) drawDraft(ctx, draft, edit.editColor, edit.editWidth)
  }, [
    edit.elements,
    edit.selection,
    draft,
    pageSize,
    zoom,
    currentPage,
    edit.editColor,
    edit.editWidth,
    edit.editMode,
    edit.textItems,
  ])

  const toPt = (e: ReactPointerEvent): { x: number; y: number } => {
    const rect = overlayRef.current!.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom }
  }

  const addElement = (el: EditElement) => {
    edit.setElements((prev) => [...prev, el])
    edit.setSelection(el.id)
  }

  const hitTest = (p: { x: number; y: number }): { id: string; x: number; y: number } | null => {
    const els = edit.elements.filter((el) => el.page === currentPage)
    for (let i = els.length - 1; i >= 0; i--) {
      const el = els[i]
      if (el.kind === 'line') {
        const d = distToSegment(p, { x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 })
        if (d < 8) return { id: el.id, x: el.x1, y: el.y1 }
        continue
      }
      const b = bboxOf(el)
      if (p.x >= b.x - 3 && p.x <= b.x + b.w + 3 && p.y >= b.y - 3 && p.y <= b.y + b.h + 3) {
        return { id: el.id, x: b.x, y: b.y }
      }
    }
    return null
  }

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const p = toPt(e)
    if (edit.editMode === 'select') {
      const hit = hitTest(p)
      if (hit) {
        edit.setSelection(hit.id)
        dragRef.current = { id: hit.id, dx: p.x - hit.x, dy: p.y - hit.y }
      } else {
        edit.setSelection(null)
        dragRef.current = null
      }
      return
    }
    if (edit.editMode === 'editText') {
      // Click a detected text line to edit it.
      const items = edit.textItems ?? []
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i]
        if (p.x >= it.x && p.x <= it.x + it.w && p.y >= it.y && p.y <= it.y + it.h) {
          edit.setEditTarget({ item: it, page: currentPage })
          return
        }
      }
      edit.setEditTarget(null)
      return
    }
    if (!pageSize) return
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Pointer capture can fail for synthetic/edge-case events; drawing still works.
    }
    drawingRef.current = true
    switch (edit.editMode) {
      case 'text':
        addElement({
          kind: 'text',
          id: nextId(),
          page: currentPage,
          x: p.x,
          y: p.y,
          text: '',
          size: edit.editSize,
          color: '#17141b',
          align: 'left',
        })
        break
      case 'note':
        addElement({ kind: 'note', id: nextId(), page: currentPage, x: p.x, y: p.y, text: '' })
        break
      case 'sign':
        if (edit.signature) {
          const w = Math.max(80, pageSize.width * 0.22)
          const h = w * 0.4
          addElement({
            kind: 'signature',
            id: nextId(),
            page: currentPage,
            x: p.x - w / 2,
            y: p.y - h / 2,
            w,
            h,
            dataUrl: edit.signature.dataUrl,
            name: edit.signature.name,
          })
        }
        break
      case 'image':
        if (edit.pendingImage) {
          const w = Math.min(pageSize.width * 0.35, 300)
          const h = w * 0.75
          addElement({
            kind: 'image',
            id: nextId(),
            page: currentPage,
            x: p.x - w / 2,
            y: p.y - h / 2,
            w,
            h,
            dataUrl: edit.pendingImage.dataUrl,
            name: edit.pendingImage.name,
          })
        }
        break
      case 'highlight':
      case 'underline':
      case 'strikethrough':
      case 'squiggly':
        draftRef.current = {
          kind: 'mark',
          markType: edit.editMode,
          x0: p.x,
          y0: p.y,
          x: p.x,
          y: p.y,
          points: [],
        }
        setDraft(draftRef.current)
        break
      case 'rect':
      case 'ellipse':
        draftRef.current = {
          kind: 'shape',
          markType: 'highlight',
          x0: p.x,
          y0: p.y,
          x: p.x,
          y: p.y,
          points: [],
        }
        setDraft(draftRef.current)
        break
      case 'line':
        draftRef.current = {
          kind: 'line',
          markType: 'highlight',
          x0: p.x,
          y0: p.y,
          x: p.x,
          y: p.y,
          points: [],
        }
        setDraft(draftRef.current)
        break
      case 'pen':
        draftRef.current = {
          kind: 'ink',
          markType: 'highlight',
          x0: p.x,
          y0: p.y,
          x: p.x,
          y: p.y,
          points: [p.x, p.y],
        }
        setDraft(draftRef.current)
        break
    }
  }

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const p = toPt(e)
    if (dragRef.current) {
      const drag = dragRef.current
      edit.setElements((prev) =>
        prev.map((el) => {
          if (el.id !== drag.id) return el
          const anchorX =
            el.kind === 'line' ? el.x1 : el.kind === 'ink' ? (el.points[0] ?? 0) : el.x
          const anchorY =
            el.kind === 'line' ? el.y1 : el.kind === 'ink' ? (el.points[1] ?? 0) : el.y
          const dx = p.x - drag.dx - anchorX
          const dy = p.y - drag.dy - anchorY
          if (el.kind === 'line') {
            return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy }
          }
          if (el.kind === 'ink') {
            const points = el.points.map((v, i) => v + (i % 2 === 0 ? dx : dy))
            return { ...el, points }
          }
          return { ...el, x: el.x + dx, y: el.y + dy }
        }),
      )
      return
    }
    if (!drawingRef.current || !draftRef.current) return
    const next = {
      ...draftRef.current,
      x: p.x,
      y: p.y,
      points:
        draftRef.current.kind === 'ink'
          ? [...draftRef.current.points, p.x, p.y]
          : draftRef.current.points,
    }
    draftRef.current = next
    setDraft(next)
  }

  const finishDraft = () => {
    const activeDraft = draftRef.current
    if (!activeDraft || !pageSize) return
    const x = Math.min(activeDraft.x0, activeDraft.x)
    const y = Math.min(activeDraft.y0, activeDraft.y)
    const w = Math.abs(activeDraft.x - activeDraft.x0)
    const h = Math.abs(activeDraft.y - activeDraft.y0)
    if (activeDraft.kind === 'mark' && w > 3 && h > 3) {
      addElement({
        kind: 'mark',
        id: nextId(),
        page: currentPage,
        type: activeDraft.markType,
        x,
        y,
        w,
        h,
        color: edit.editColor,
      })
    } else if (activeDraft.kind === 'shape' && w > 3 && h > 3) {
      addElement({
        kind: 'shape',
        id: nextId(),
        page: currentPage,
        shape: edit.editMode === 'ellipse' ? 'ellipse' : 'rect',
        x,
        y,
        w,
        h,
        color: edit.editColor,
        width: edit.editWidth,
      })
    } else if (activeDraft.kind === 'line' && w + h > 5) {
      addElement({
        kind: 'line',
        id: nextId(),
        page: currentPage,
        x1: activeDraft.x0,
        y1: activeDraft.y0,
        x2: activeDraft.x,
        y2: activeDraft.y,
        color: edit.editColor,
        width: edit.editWidth,
      })
    } else if (activeDraft.kind === 'ink' && activeDraft.points.length >= 4) {
      addElement({
        kind: 'ink',
        id: nextId(),
        page: currentPage,
        points: activeDraft.points,
        color: edit.editColor,
        width: edit.editWidth,
      })
    }
    draftRef.current = null
    setDraft(null)
  }

  const onPointerUp = () => {
    drawingRef.current = false
    dragRef.current = null
    finishDraft()
  }

  if (!active) {
    return (
      <section className="canvas-pane canvas-empty" aria-label="Document">
        <p>No document open.</p>
        <button type="button" className="btn btn-primary btn-lg" onClick={onHome}>
          <Icon name="file" size={18} strokeWidth={2.1} /> Open a PDF
        </button>
      </section>
    )
  }

  return (
    <section className="canvas-pane" aria-label="Document">
      <div className="canvas-toolbar">
        <button
          type="button"
          className="btn btn-sm"
          onClick={onHome}
          title="Back to start"
          aria-label="Back to start"
        >
          <Icon name="home" size={15} strokeWidth={2.1} />
        </button>
        <span className="toolbar-sep" />
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => doc.undo()}
          disabled={!doc.canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <Icon name="undo" size={15} strokeWidth={2.1} />
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => doc.redo()}
          disabled={!doc.canRedo}
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          <Icon name="redo" size={15} strokeWidth={2.1} />
        </button>
        <span className="toolbar-sep" />
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => doc.setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          <Icon name="chevronLeft" size={15} strokeWidth={2.4} />
        </button>
        <span className="page-indicator">
          {currentPage} / {pageCount}
        </span>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => doc.setCurrentPage((p) => Math.min(pageCount, p + 1))}
          disabled={currentPage >= pageCount}
          aria-label="Next page"
        >
          <Icon name="chevronRight" size={15} strokeWidth={2.4} />
        </button>
        <span className="toolbar-sep" />
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => doc.setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
          aria-label="Zoom out"
        >
          <Icon name="zoomOut" size={15} strokeWidth={2.1} />
        </button>
        <span className="page-indicator">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => doc.setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
          aria-label="Zoom in"
        >
          <Icon name="zoomIn" size={15} strokeWidth={2.1} />
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => doc.setZoom(1)}
          title="Reset zoom"
          aria-label="Reset zoom"
        >
          <Icon name="fit" size={15} strokeWidth={2.1} />
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => edit.setPaletteOpen(true)}
          title="Command palette (Ctrl+K)"
          aria-label="Command palette"
        >
          <Icon name="command" size={15} strokeWidth={2} />
        </button>
        <div className="help-wrap">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setHelpOpen((o) => !o)}
            aria-expanded={helpOpen}
            title="Shortcuts"
            aria-label="Keyboard shortcuts"
          >
            <Icon name="help" size={15} strokeWidth={2.1} />
          </button>
          {helpOpen && (
            <div className="help-popover">
              <strong>Shortcuts</strong>
              <ul>
                <li>
                  <kbd>Ctrl/⌘ + Z</kbd> Undo
                </li>
                <li>
                  <kbd>Ctrl/⌘ + Shift + Z</kbd> Redo
                </li>
                <li>
                  <kbd>Ctrl/⌘ + K</kbd> Command palette
                </li>
                <li>
                  <kbd>←</kbd> <kbd>→</kbd> Change page
                </li>
                <li>
                  <kbd>Delete</kbd> Remove selected element
                </li>
                <li>
                  <kbd>Esc</kbd> Close popovers / deselect
                </li>
              </ul>
            </div>
          )}
        </div>
        <span className="toolbar-spacer" />
        <button
          type="button"
          className="btn btn-sm btn-primary"
          onClick={() => downloadBytes(active.bytes, active.name)}
        >
          <Icon name="download" size={15} strokeWidth={2.1} /> Download
        </button>
      </div>
      <div className="canvas-scroll">
        <div
          className="page-wrap"
          style={{ width: pageSize?.width ?? 0, height: pageSize?.height ?? 0 }}
        >
          <canvas ref={canvasRef} className="page-canvas" />
          <canvas
            ref={overlayRef}
            className="overlay-canvas"
            aria-label="Editing canvas — draw with the selected tool"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          />
        </div>
      </div>
    </section>
  )
}

function distToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

function drawElement(ctx: CanvasRenderingContext2D, el: EditElement, selected: boolean): void {
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  switch (el.kind) {
    case 'text':
      ctx.font = `${el.size}px Helvetica, Arial, sans-serif`
      ctx.fillStyle = el.color
      ctx.textBaseline = 'top'
      el.text.split('\n').forEach((line, i) => {
        const lw = ctx.measureText(line).width
        const x = el.align === 'center' ? el.x - lw / 2 : el.align === 'right' ? el.x - lw : el.x
        ctx.fillText(line, x, el.y + el.size * i)
      })
      break
    case 'signature':
    case 'image': {
      const img = getImage(el.dataUrl, () => {
        // Trigger a redraw once the image is decodable.
        document.dispatchEvent(new CustomEvent('pdfly-overlay-redraw'))
      })
      if (img) ctx.drawImage(img, el.x, el.y, el.w, el.h)
      break
    }
    case 'mark': {
      const [r, g, b] = hexToRgb(el.color)
      ctx.globalAlpha = 0.35
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
      ctx.fillRect(el.x, el.y, el.w, el.h)
      ctx.globalAlpha = 1
      ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`
      ctx.lineWidth = 2
      if (el.type === 'underline') {
        ctx.beginPath()
        ctx.moveTo(el.x, el.y + el.h)
        ctx.lineTo(el.x + el.w, el.y + el.h)
        ctx.stroke()
      } else if (el.type === 'strikethrough') {
        ctx.beginPath()
        ctx.moveTo(el.x, el.y + el.h / 2)
        ctx.lineTo(el.x + el.w, el.y + el.h / 2)
        ctx.stroke()
      } else if (el.type === 'squiggly') {
        ctx.beginPath()
        for (let px = el.x; px <= el.x + el.w; px += 3) {
          const py = el.y + el.h - 2 + (Math.floor((px - el.x) / 6) % 2 === 0 ? -2 : 2)
          if (px === el.x) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.stroke()
      }
      break
    }
    case 'note': {
      // Hand-drawn sticky note with a turned-up corner.
      ctx.fillStyle = '#ffc803'
      ctx.strokeStyle = '#17141b'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(el.x, el.y)
      ctx.lineTo(el.x + 18, el.y)
      ctx.lineTo(el.x + 18, el.y + 12)
      ctx.lineTo(el.x + 12, el.y + 18)
      ctx.lineTo(el.x, el.y + 18)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(el.x + 18, el.y + 12)
      ctx.lineTo(el.x + 12, el.y + 12)
      ctx.lineTo(el.x + 12, el.y + 18)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(el.x + 4, el.y + 6)
      ctx.lineTo(el.x + 14, el.y + 6)
      ctx.moveTo(el.x + 4, el.y + 9.5)
      ctx.lineTo(el.x + 11, el.y + 9.5)
      ctx.stroke()
      break
    }
    case 'shape':
      ctx.strokeStyle = el.color
      ctx.lineWidth = el.width
      if (el.shape === 'rect') ctx.strokeRect(el.x, el.y, el.w, el.h)
      else {
        ctx.beginPath()
        ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, el.w / 2, el.h / 2, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      break
    case 'line': {
      ctx.strokeStyle = el.color
      ctx.lineWidth = el.width
      ctx.beginPath()
      ctx.moveTo(el.x1, el.y1)
      ctx.lineTo(el.x2, el.y2)
      ctx.stroke()
      // arrowhead
      const angle = Math.atan2(el.y2 - el.y1, el.x2 - el.x1)
      const head = 8
      ctx.beginPath()
      ctx.moveTo(el.x2, el.y2)
      ctx.lineTo(el.x2 - head * Math.cos(angle - 0.4), el.y2 - head * Math.sin(angle - 0.4))
      ctx.moveTo(el.x2, el.y2)
      ctx.lineTo(el.x2 - head * Math.cos(angle + 0.4), el.y2 - head * Math.sin(angle + 0.4))
      ctx.stroke()
      break
    }
    case 'ink':
      ctx.strokeStyle = el.color
      ctx.lineWidth = el.width
      ctx.beginPath()
      for (let i = 0; i < el.points.length; i += 2) {
        if (i === 0) ctx.moveTo(el.points[i], el.points[i + 1])
        else ctx.lineTo(el.points[i], el.points[i + 1])
      }
      ctx.stroke()
      break
  }
  if (selected) {
    const b = bboxOf(el)
    ctx.strokeStyle = '#2b44ff'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 3])
    ctx.strokeRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6)
    ctx.setLineDash([])
    ctx.fillStyle = '#2b44ff'
    ctx.beginPath()
    ctx.arc(b.x + b.w + 3, b.y - 3, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 9px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('×', b.x + b.w + 3, b.y - 0.5)
    ctx.textAlign = 'start'
  }
  ctx.restore()
}

function drawDraft(
  ctx: CanvasRenderingContext2D,
  draft: Draft,
  color: string,
  width: number,
): void {
  const x = Math.min(draft.x0, draft.x)
  const y = Math.min(draft.y0, draft.y)
  const w = Math.abs(draft.x - draft.x0)
  const h = Math.abs(draft.y - draft.y0)
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  if (draft.kind === 'mark') {
    ctx.globalAlpha = 0.35
    ctx.fillStyle = color
    ctx.fillRect(x, y, w, h)
  } else if (draft.kind === 'shape') {
    if (w > 0 && h > 0) ctx.strokeRect(x, y, w, h)
  } else if (draft.kind === 'line') {
    ctx.beginPath()
    ctx.moveTo(draft.x0, draft.y0)
    ctx.lineTo(draft.x, draft.y)
    ctx.stroke()
  } else {
    ctx.beginPath()
    for (let i = 0; i < draft.points.length; i += 2) {
      if (i === 0) ctx.moveTo(draft.points[i], draft.points[i + 1])
      else ctx.lineTo(draft.points[i], draft.points[i + 1])
    }
    ctx.stroke()
  }
  ctx.restore()
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  const h = m ? m[1] : '000000'
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
