import { useState } from 'react'
import { downloadBytes } from '../../../lib/download'
import { splitByMaxSize, splitEveryN, splitPdf } from '../../../lib/operations'
import type { DocApi } from '../../../hooks/useDocument'

function parseRanges(text: string): Array<[number, number]> | null {
  const parts = text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const ranges: Array<[number, number]> = []
  for (const part of parts) {
    const m = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/)
    if (!m) return null
    const a = Number(m[1])
    const b = m[2] ? Number(m[2]) : a
    if (a < 1 || b < a) return null
    ranges.push([a, b])
  }
  return ranges.length ? ranges : null
}

export function SplitTool({ doc }: { doc: DocApi }) {
  const [mode, setMode] = useState<'everyN' | 'ranges' | 'bySize'>('everyN')
  const [n, setN] = useState('2')
  const [rangesText, setRangesText] = useState('')
  const [sizeMb, setSizeMb] = useState('5')
  const [parts, setParts] = useState<ArrayBuffer[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const run = async () => {
    if (!doc.active) return
    setBusy(true)
    setError(undefined)
    setParts(null)
    try {
      let out: ArrayBuffer[]
      if (mode === 'everyN') {
        out = await splitEveryN(doc.active.bytes, Math.max(1, Number(n) || 1))
      } else if (mode === 'bySize') {
        const maxBytes = Number(sizeMb) * 1024 * 1024
        if (!maxBytes || maxBytes <= 0) throw new Error('Enter a max size in MB.')
        out = await splitByMaxSize(doc.active.bytes, maxBytes)
      } else {
        const r = parseRanges(rangesText || '1')
        if (!r) throw new Error('Invalid ranges — use e.g. "1-3, 5, 7-9".')
        out = await splitPdf(doc.active.bytes, r)
      }
      setParts(out)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Split failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tool">
      <h3>Split PDF</h3>
      <p className="tool-hint">
        {doc.pageCount} pages in the current document.
      </p>

      <div className="seg">
        <label className="radio-row">
          <input type="radio" checked={mode === 'everyN'} onChange={() => setMode('everyN')} />
          Every N pages
        </label>
        {mode === 'everyN' && (
          <input
            className="input"
            type="number"
            min={1}
            value={n}
            onChange={(e) => setN(e.target.value)}
            aria-label="Pages per file"
          />
        )}
      </div>

      <div className="seg">
        <label className="radio-row">
          <input type="radio" checked={mode === 'bySize'} onChange={() => setMode('bySize')} />
          By max size
        </label>
        {mode === 'bySize' && (
          <div className="row">
            <input
              className="input"
              type="number"
              min={0.1}
              step={0.1}
              value={sizeMb}
              onChange={(e) => setSizeMb(e.target.value)}
              aria-label="Max size per part in MB"
            />
            <span className="tool-hint">MB per part</span>
          </div>
        )}
      </div>

      <div className="seg">
        <label className="radio-row">
          <input type="radio" checked={mode === 'ranges'} onChange={() => setMode('ranges')} />
          By ranges
        </label>
        {mode === 'ranges' && (
          <input
            className="input"
            type="text"
            placeholder="e.g. 1-3, 5, 7-9"
            value={rangesText}
            onChange={(e) => setRangesText(e.target.value)}
            aria-label="Page ranges"
          />
        )}
      </div>

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={() => void run()} disabled={busy}>
          {busy ? 'Splitting…' : 'Split'}
        </button>
      </div>

      {error && <p className="msg error">{error}</p>}

      {parts && (
        <div className="results">
          <p className="msg ok">{parts.length} part{parts.length > 1 ? 's' : ''} created.</p>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              const base = doc.active?.name.replace(/\.pdf$/i, '') ?? 'document'
              parts.forEach((p, i) => downloadBytes(p, `${base}-part-${i + 1}.pdf`))
            }}
          >
            ⬇️ Download all ({parts.length})
          </button>
          {parts.map((p, i) => (
            <div className="merge-row" key={i}>
              <span className="merge-name">Part {i + 1}</span>
              <button type="button" className="btn btn-sm" onClick={() => downloadBytes(p, `part-${i + 1}.pdf`)}>
                Download
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  doc.mutate(p, `part-${i + 1}.pdf`)
                }}
              >
                Open
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
