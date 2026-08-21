import { useEffect, useState } from 'react'
import { compressLight } from '../../../lib/operations'
import { rasterizePdf } from '../../../lib/pdf'
import { formatBytes } from '../../../lib/format'
import type { DocApi } from '../../../hooks/useDocument'

type Preset = 'light' | 'recommended' | 'max'

const PRESETS: Array<{ id: Preset; label: string; desc: string; raster: boolean }> = [
  { id: 'light', label: 'Light', desc: 'Fast — keeps text & quality, small gains', raster: false },
  { id: 'recommended', label: 'Recommended', desc: 'Rebuilds pages as images — best for scans', raster: true },
  { id: 'max', label: 'Max', desc: 'Smallest size — lower image quality', raster: true },
]

interface Result {
  bytes: ArrayBuffer
  before: number
  after: number
  rasterized: boolean
}

export function CompressTool({ doc }: { doc: DocApi }) {
  const [preset, setPreset] = useState<Preset>('light')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [targetMb, setTargetMb] = useState('5')
  const [targetBusy, setTargetBusy] = useState(false)
  const [targetMsg, setTargetMsg] = useState<string>()

  const estimate = async (p: Preset) => {
    if (!doc.active) return
    setBusy(true)
    setResult(null)
    try {
      const before = doc.active.bytes.byteLength
      const meta = PRESETS.find((x) => x.id === p)!
      let bytes: ArrayBuffer
      if (!meta.raster) {
        bytes = await compressLight(doc.active.bytes)
      } else if (p === 'recommended') {
        bytes = await rasterizePdf(doc.active.id, doc.active.bytes, 1.5, 0.72)
      } else {
        bytes = await rasterizePdf(doc.active.id, doc.active.bytes, 1.0, 0.5)
      }
      setResult({ bytes, before, after: bytes.byteLength, rasterized: meta.raster })
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void estimate(preset)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, doc.active?.bytes])

  const compressToTarget = async () => {
    if (!doc.active) return
    const target = Number(targetMb) * 1024 * 1024
    if (!target || target <= 0) return
    setTargetBusy(true)
    setTargetMsg(undefined)
    try {
      const before = doc.active.bytes.byteLength
      let best = await compressLight(doc.active.bytes)
      let rasterized = false
      if (best.byteLength > target) {
        for (const [scale, quality] of [
          [1.5, 0.72],
          [1.0, 0.5],
          [0.75, 0.35],
        ] as const) {
          const out = await rasterizePdf(doc.active.id, doc.active.bytes, scale, quality)
          best = out
          rasterized = true
          if (out.byteLength <= target) break
        }
      }
      setResult({ bytes: best, before, after: best.byteLength, rasterized })
      setTargetMsg(
        best.byteLength <= target
          ? `Under ${targetMb} MB ✓`
          : `Could not get under ${targetMb} MB — this is the smallest achievable.`,
      )
    } finally {
      setTargetBusy(false)
    }
  }

  const apply = () => {
    if (!result || !doc.active) return
    doc.mutate(result.bytes)
    setTargetMsg('Applied — the active document is now the compressed version.')
  }

  const pct = result && result.before > 0 ? Math.round(((result.before - result.after) / result.before) * 100) : 0

  return (
    <div className="tool">
      <h3>Compress PDF</h3>
      <p className="tool-hint">Choose a preset — the estimated result is computed live.</p>

      <div className="seg-list">
        {PRESETS.map((p) => (
          <label key={p.id} className={`preset${preset === p.id ? ' active' : ''}`}>
            <input type="radio" name="preset" checked={preset === p.id} onChange={() => setPreset(p.id)} />
            <span className="preset-label">{p.label}</span>
            <span className="preset-desc">{p.desc}</span>
          </label>
        ))}
      </div>

      {busy && <p className="msg">Computing estimate…</p>}

      {result && (
        <div className="compress-result">
          <p className="msg ok">
            {formatBytes(result.before)} → {formatBytes(result.after)} ({pct > 0 ? `−${pct}%` : 'no change'})
          </p>
          {result.rasterized && (
            <p className="tool-hint">
              ⚠️ This preset converts pages to images — text becomes non-selectable (best for scans).
            </p>
          )}
          <div className="tool-actions">
            <button type="button" className="btn btn-primary" onClick={apply}>
              Apply compression
            </button>
          </div>
        </div>
      )}

      <div className="seg">
        <h4>Target size</h4>
        <div className="row">
          <input
            className="input"
            type="number"
            min={0.1}
            step={0.1}
            value={targetMb}
            onChange={(e) => setTargetMb(e.target.value)}
            aria-label="Target size in MB"
          />
          <span className="tool-hint">MB</span>
          <button type="button" className="btn" onClick={() => void compressToTarget()} disabled={targetBusy}>
            {targetBusy ? 'Working…' : 'Compress under target'}
          </button>
        </div>
        {targetMsg && <p className="msg ok">{targetMsg}</p>}
      </div>
    </div>
  )
}
