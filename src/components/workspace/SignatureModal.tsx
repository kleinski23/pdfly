import { useCallback, useEffect, useRef, useState } from 'react'
import { nextId } from '../../lib/editTypes'
import type { SignatureRecord } from '../../lib/db'
import { useSignatures } from '../../hooks/useSignatures'
import { Icon } from '../Icon'

const W = 320
const H = 130
// The backing store is drawn at 2x so strokes stay crisp on HiDPI screens.
// Every drawing helper works in W/H user units and lets the context scale.
const SCALE = 2

export function SignatureModal({
  onClose,
  onSelect,
}: {
  onClose: () => void
  onSelect: (sig: { dataUrl: string; name: string }) => void
}) {
  const { signatures, addSignature, deleteSignature } = useSignatures()
  const [tab, setTab] = useState<'draw' | 'type' | 'upload'>('draw')
  const [name, setName] = useState('')
  const [typed, setTyped] = useState('')
  const [drawing, setDrawing] = useState(false)
  const drawRef = useRef<HTMLCanvasElement>(null)
  const lastRef = useRef<{ x: number; y: number } | null>(null)

  /** Context with W/H user units mapped across the whole 2x backing store. */
  const ctx2d = useCallback(() => {
    const ctx = drawRef.current!.getContext('2d')!
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0)
    return ctx
  }, [])

  const clearCanvas = useCallback(() => {
    // Clear to transparent rather than painting a white plate: toDataURL bakes
    // whatever is on the canvas into the saved PNG, and an opaque background
    // would sit on the page as a white box over the document. The white card
    // and its border come from `.sig-canvas` in CSS.
    ctx2d().clearRect(0, 0, W, H)
  }, [ctx2d])

  useEffect(() => {
    clearCanvas()
  }, [clearCanvas])

  const pos = (e: React.PointerEvent) => {
    const rect = drawRef.current!.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top) * (H / rect.height),
    }
  }

  const lineTo = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const ctx = ctx2d()
    ctx.strokeStyle = '#17141b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }

  const renderTyped = (text: string) => {
    clearCanvas()
    const ctx = ctx2d()
    ctx.fillStyle = '#17141b'
    ctx.font = '44px "Segoe Script", "Brush Script MT", "Comic Sans MS", cursive'
    ctx.textBaseline = 'middle'
    ctx.fillText(text || 'Signature', 16, H / 2)
  }

  const save = async () => {
    const dataUrl = drawRef.current!.toDataURL('image/png')
    const sig: SignatureRecord = {
      id: nextId(),
      name: name.trim() || 'Signature',
      dataUrl,
      createdAt: Date.now(),
    }
    await addSignature(sig)
    onSelect({ dataUrl: sig.dataUrl, name: sig.name })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-label="Create signature"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Signature</h3>
        <div className="seg-list">
          {(['draw', 'type', 'upload'] as const).map((t) => (
            <label key={t} className={`preset${tab === t ? ' active' : ''}`}>
              <input type="radio" name="sigtab" checked={tab === t} onChange={() => setTab(t)} />
              <Icon
                name={t === 'draw' ? 'sign' : t === 'type' ? 'keyboard' : 'folder'}
                size={17}
                strokeWidth={2}
              />
              <span className="preset-label">
                {t === 'draw' ? 'Draw' : t === 'type' ? 'Type' : 'Upload'}
              </span>
            </label>
          ))}
        </div>

        <canvas
          ref={drawRef}
          width={W * SCALE}
          height={H * SCALE}
          className="sig-canvas"
          style={{ width: W, height: H }}
          onPointerDown={(e) => {
            try {
              e.currentTarget.setPointerCapture(e.pointerId)
            } catch {
              // Synthetic events may not support pointer capture.
            }
            const p = pos(e)
            lastRef.current = p
            lineTo(p, p)
            setDrawing(true)
          }}
          onPointerMove={(e) => {
            if (!drawing) return
            const p = pos(e)
            if (lastRef.current) lineTo(lastRef.current, p)
            lastRef.current = p
          }}
          onPointerUp={() => {
            setDrawing(false)
            lastRef.current = null
          }}
        />
        <div className="tool-actions">
          <button type="button" className="btn btn-sm" onClick={clearCanvas}>
            Clear
          </button>
        </div>

        {tab === 'type' && (
          <label className="field">
            Type your name
            <input
              className="input"
              type="text"
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value)
                renderTyped(e.target.value)
              }}
            />
          </label>
        )}
        {tab === 'upload' && (
          <label className="field">
            Upload an image
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = () => {
                  const img = new Image()
                  img.onload = () => {
                    const ctx = ctx2d()
                    // Keep the alpha channel of the uploaded image intact.
                    ctx.clearRect(0, 0, W, H)
                    const scale = Math.min((W - 20) / img.width, (H - 20) / img.height, 1)
                    const w = img.width * scale
                    const h = img.height * scale
                    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h)
                  }
                  img.src = String(reader.result)
                }
                reader.readAsDataURL(file)
              }}
            />
          </label>
        )}

        {signatures.length > 0 && (
          <div className="sig-library">
            <p className="tool-hint">Saved signatures (click to reuse)</p>
            <div className="sig-grid">
              {signatures.map((s) => (
                <div className="sig-item" key={s.id}>
                  <button
                    type="button"
                    className="sig-thumb"
                    onClick={() => {
                      onSelect({ dataUrl: s.dataUrl, name: s.name })
                      onClose()
                    }}
                    title={s.name}
                  >
                    <img src={s.dataUrl} alt={s.name} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    aria-label={`Delete ${s.name}`}
                    onClick={() => void deleteSignature(s.id)}
                  >
                    <Icon name="trash" size={14} strokeWidth={2.1} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <label className="field">
          Name
          <input
            className="input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <div className="tool-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void save()}>
            Save signature
          </button>
        </div>
      </div>
    </div>
  )
}
