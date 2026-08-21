import { useState } from 'react'
import { rebuildPdf, type Rotation } from '../../../lib/operations'
import type { DocApi } from '../../../hooks/useDocument'

export function RotateTool({ doc }: { doc: DocApi }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string>()
  const targets = doc.selectedPages.size ? [...doc.selectedPages] : [doc.currentPage]

  const run = async (deg: Rotation) => {
    if (!doc.active) return
    setBusy(true)
    setMsg(undefined)
    try {
      const rotations = new Map(targets.map((p) => [p, deg] as const))
      const result = await rebuildPdf(doc.active.bytes, {
        order: Array.from({ length: doc.pageCount }, (_, i) => i + 1),
        rotations,
      })
      doc.mutate(result)
      setMsg(`Rotated ${targets.length} page${targets.length > 1 ? 's' : ''} by ${deg}°.`)
    } catch {
      setMsg('Rotate failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tool">
      <h3>Rotate pages</h3>
      <p className="tool-hint">
        Rotating page{targets.length > 1 ? 's' : ''}: <strong>{targets.join(', ')}</strong>.
        {doc.selectedPages.size === 0 && ' (click pages in the left rail with Ctrl/Cmd to select more)'}
      </p>
      <div className="tool-actions">
        {([90, 180, 270] as Rotation[]).map((deg) => (
          <button key={deg} type="button" className="btn btn-primary" onClick={() => void run(deg)} disabled={busy}>
            {busy ? '…' : `Rotate ${deg}°`}
          </button>
        ))}
      </div>
      {msg && <p className="msg ok">{msg}</p>}
    </div>
  )
}
