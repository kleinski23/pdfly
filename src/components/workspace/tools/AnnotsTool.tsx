import { useEffect, useState } from 'react'
import {
  annotationsToText,
  deleteAnnotation,
  listAnnotations,
  type AnnotInfo,
} from '../../../lib/annots'
import { downloadBlob } from '../../../lib/download'
import type { DocApi } from '../../../hooks/useDocument'
import { Icon } from '../../Icon'

export function AnnotsTool({ doc }: { doc: DocApi }) {
  const [annots, setAnnots] = useState<AnnotInfo[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string>()

  const refresh = async () => {
    if (!doc.active) return
    setBusy(true)
    try {
      const list = await listAnnotations(doc.active.bytes)
      setAnnots(list)
      setMsg(list.length === 0 ? 'No annotations in this document.' : undefined)
    } catch {
      setMsg('Could not read annotations.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.active?.id, doc.active?.bytes, doc.rev])

  const remove = async (a: AnnotInfo) => {
    if (!doc.active) return
    setBusy(true)
    setMsg(undefined)
    try {
      const result = await deleteAnnotation(doc.active.bytes, a.page, a.index)
      doc.mutate(result)
    } catch {
      setMsg('Delete failed.')
    } finally {
      setBusy(false)
    }
  }

  const exportSummary = () => {
    const text = annotationsToText(annots)
    downloadBlob(new Blob([text], { type: 'text/plain' }), 'annotations.txt')
    setMsg('Summary downloaded.')
  }

  return (
    <div className="tool">
      <h3>Annotations</h3>
      <p className="tool-hint">
        {annots.length > 0
          ? `${annots.length} annotation(s) in this document.`
          : 'List of highlights, notes and shapes.'}
      </p>

      <div className="merge-list">
        {annots.map((a, i) => (
          <div className="merge-row" key={`${a.page}-${a.index}-${i}`}>
            <span className="merge-name" title={a.contents}>
              P{a.page} · {a.type}
              {a.contents ? ` · ${a.contents.slice(0, 40)}` : ''}
            </span>
            <button
              type="button"
              className="btn btn-sm"
              aria-label={`Delete annotation on page ${a.page}`}
              onClick={() => void remove(a)}
            >
              <Icon name="trash" size={14} strokeWidth={2.1} />
            </button>
          </div>
        ))}
      </div>

      <div className="tool-actions">
        <button type="button" className="btn" onClick={() => void refresh()} disabled={busy}>
          Refresh
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={exportSummary}
          disabled={annots.length === 0}
        >
          <Icon name="download" size={15} strokeWidth={2.1} /> Export summary
        </button>
      </div>
      {msg && <p className={msg.includes('failed') ? 'msg error' : 'msg ok'}>{msg}</p>}
    </div>
  )
}
