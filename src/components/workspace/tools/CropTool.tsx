import { useEffect, useState } from 'react'
import { getPageSize, rebuildPdf, type CropBox } from '../../../lib/operations'
import type { DocApi } from '../../../hooks/useDocument'

function clampPct(v: string): number {
  const n = Number(v)
  if (Number.isNaN(n)) return 0
  return Math.min(100, Math.max(0, n))
}

export function CropTool({ doc }: { doc: DocApi }) {
  const [page, setPage] = useState(1)
  const [left, setLeft] = useState('0')
  const [top, setTop] = useState('0')
  const [width, setWidth] = useState('100')
  const [height, setHeight] = useState('100')
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string>()

  useEffect(() => {
    setPage(doc.currentPage)
  }, [doc.currentPage])

  useEffect(() => {
    if (!doc.active) return
    let cancelled = false
    getPageSize(doc.active.bytes, page).then((s) => {
      if (!cancelled) setSize(s)
    })
    return () => {
      cancelled = true
    }
  }, [doc.active, doc.active?.bytes, page])

  const apply = async () => {
    if (!doc.active || !size) return
    const crop: CropBox = {
      x: (clampPct(left) / 100) * size.width,
      y: (clampPct(top) / 100) * size.height,
      width: (clampPct(width) / 100) * size.width,
      height: (clampPct(height) / 100) * size.height,
    }
    if (crop.width <= 0 || crop.height <= 0) {
      setMsg('Crop must have positive width and height.')
      return
    }
    setBusy(true)
    setMsg(undefined)
    try {
      const result = await rebuildPdf(doc.active.bytes, {
        order: Array.from({ length: doc.pageCount }, (_, i) => i + 1),
        crops: new Map([[page, crop]]),
      })
      doc.mutate(result)
      setMsg(`Page ${page} cropped.`)
    } catch {
      setMsg('Crop failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tool">
      <h3>Crop page</h3>
      <p className="tool-hint">Values are percent of the page, measured from the top-left. Applies to one page.</p>

      <label className="field">
        Page
        <input
          className="input"
          type="number"
          min={1}
          max={doc.pageCount}
          value={page}
          onChange={(e) => setPage(Math.min(doc.pageCount, Math.max(1, Number(e.target.value) || 1)))}
        />
      </label>
      {size && (
        <p className="tool-hint">
          Page size: {Math.round(size.width)} × {Math.round(size.height)} pt
        </p>
      )}

      <div className="field-grid">
        <label className="field">
          Left %
          <input className="input" type="number" min={0} max={100} value={left} onChange={(e) => setLeft(e.target.value)} />
        </label>
        <label className="field">
          Top %
          <input className="input" type="number" min={0} max={100} value={top} onChange={(e) => setTop(e.target.value)} />
        </label>
        <label className="field">
          Width %
          <input className="input" type="number" min={1} max={100} value={width} onChange={(e) => setWidth(e.target.value)} />
        </label>
        <label className="field">
          Height %
          <input className="input" type="number" min={1} max={100} value={height} onChange={(e) => setHeight(e.target.value)} />
        </label>
      </div>

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={() => void apply()} disabled={busy || !size}>
          {busy ? 'Applying…' : 'Apply crop'}
        </button>
      </div>
      {msg && <p className={msg.startsWith('Crop') && !msg.includes('failed') ? 'msg ok' : 'msg error'}>{msg}</p>}
    </div>
  )
}
