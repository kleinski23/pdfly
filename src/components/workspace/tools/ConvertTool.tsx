import { useRef, useState } from 'react'
import { downloadBlob } from '../../../lib/download'
import { imageFileToPngBytes, pdfToImages } from '../../../lib/pdf'
import { imagesToPdf, type PageSizeMode } from '../../../lib/operations'
import { formatBytes } from '../../../lib/format'
import type { DocApi } from '../../../hooks/useDocument'

interface ImageItem {
  id: string
  name: string
  bytes: ArrayBuffer
}

function parsePages(text: string, max: number): number[] {
  if (!text.trim() || text.trim() === 'all') return Array.from({ length: max }, (_, i) => i + 1)
  const out: number[] = []
  for (const part of text.split(',')) {
    const m = part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/)
    if (!m) return []
    const a = Number(m[1])
    const b = m[2] ? Number(m[2]) : a
    if (a < 1 || b < a || b > max) return []
    for (let p = a; p <= b; p++) out.push(p)
  }
  return out
}

export function ConvertTool({ doc }: { doc: DocApi }) {
  const [tab, setTab] = useState<'toPdf' | 'toImages'>('toPdf')
  const [imgs, setImgs] = useState<ImageItem[]>([])
  const [pageSize, setPageSize] = useState<PageSizeMode>('auto')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string>()
  const [format, setFormat] = useState<'jpeg' | 'png'>('jpeg')
  const [dpi, setDpi] = useState('150')
  const [range, setRange] = useState('all')
  const [outImages, setOutImages] = useState<Array<{ page: number; blob: Blob }> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const addImages = async (list: FileList | null) => {
    if (!list?.length) return
    setMsg(undefined)
    const added: ImageItem[] = []
    for (const file of Array.from(list)) {
      try {
        const png = await imageFileToPngBytes(file)
        added.push({ id: crypto.randomUUID(), name: png.name, bytes: png.bytes })
      } catch {
        setMsg(`"${file.name}" could not be read — unsupported image format.`)
      }
    }
    setImgs((prev) => [...prev, ...added])
  }

  const toPdf = async () => {
    if (!imgs.length) return
    setBusy(true)
    setMsg(undefined)
    try {
      const result = await imagesToPdf(
        imgs.map((i) => ({ bytes: i.bytes, name: i.name })),
        pageSize,
      )
      doc.mutate(result, 'images.pdf')
      setMsg(`Created images.pdf (${formatBytes(result.byteLength)}) — now the active document.`)
    } catch {
      setMsg('Conversion failed.')
    } finally {
      setBusy(false)
    }
  }

  const toImages = async () => {
    if (!doc.active) return
    const pages = parsePages(range, doc.pageCount)
    if (!pages.length) {
      setMsg('Invalid page range.')
      return
    }
    setBusy(true)
    setMsg(undefined)
    try {
      const results = await pdfToImages(doc.active.id, doc.active.bytes, pages, {
        dpi: Number(dpi) || 150,
        format,
        quality: 0.85,
      })
      setOutImages(results)
    } catch {
      setMsg('Export failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tool">
      <h3>Convert</h3>
      <div className="seg-list">
        <label className={`preset${tab === 'toPdf' ? ' active' : ''}`}>
          <input type="radio" name="tab" checked={tab === 'toPdf'} onChange={() => setTab('toPdf')} />
          <span className="preset-label">Images → PDF</span>
        </label>
        <label className={`preset${tab === 'toImages' ? ' active' : ''}`}>
          <input type="radio" name="tab" checked={tab === 'toImages'} onChange={() => setTab('toImages')} />
          <span className="preset-label">PDF → Images</span>
        </label>
      </div>

      {tab === 'toPdf' ? (
        <>
          <p className="tool-hint">JPG / PNG / WebP / BMP supported. Drag to reorder.</p>
          <div className="merge-list">
            {imgs.map((img, idx) => (
              <div key={img.id} className="merge-row">
                <span className="merge-name" title={img.name}>
                  {img.name}
                </span>
                <span className="merge-size">{formatBytes(img.bytes.byteLength)}</span>
                <button
                  type="button"
                  className="btn btn-sm"
                  aria-label={`Move ${img.name} up`}
                  onClick={() => setImgs((prev) => (idx === 0 ? prev : prev.map((x, i) => (i === idx ? prev[idx - 1] : i === idx - 1 ? prev[idx] : x))))}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  aria-label={`Move ${img.name} down`}
                  onClick={() => setImgs((prev) => (idx === prev.length - 1 ? prev : prev.map((x, i) => (i === idx ? prev[idx + 1] : i === idx + 1 ? prev[idx] : x))))}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  aria-label={`Remove ${img.name}`}
                  onClick={() => setImgs((prev) => prev.filter((_, i) => i !== idx))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div className="tool-actions">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                void addImages(e.target.files)
                e.currentTarget.value = ''
              }}
            />
            <button type="button" className="btn" onClick={() => inputRef.current?.click()}>
              + Add images
            </button>
            <select
              className="input"
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value as PageSizeMode)}
              aria-label="Page size"
            >
              <option value="auto">Page = image size</option>
              <option value="a4">A4</option>
              <option value="letter">Letter</option>
            </select>
            <button type="button" className="btn btn-primary" onClick={() => void toPdf()} disabled={!imgs.length || busy}>
              {busy ? 'Converting…' : 'Create PDF'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="tool-hint">Export the current document ({doc.pageCount} pages) as images.</p>
          <div className="field-grid">
            <label className="field">
              Format
              <select className="input" value={format} onChange={(e) => setFormat(e.target.value as 'jpeg' | 'png')}>
                <option value="jpeg">JPG</option>
                <option value="png">PNG</option>
              </select>
            </label>
            <label className="field">
              DPI
              <select className="input" value={dpi} onChange={(e) => setDpi(e.target.value)}>
                <option value="72">72</option>
                <option value="150">150</option>
                <option value="300">300</option>
              </select>
            </label>
          </div>
          <label className="field">
            Pages
            <input
              className="input"
              type="text"
              placeholder="all, or e.g. 1-3, 5"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            />
          </label>
          <div className="tool-actions">
            <button type="button" className="btn btn-primary" onClick={() => void toImages()} disabled={busy}>
              {busy ? 'Exporting…' : 'Export images'}
            </button>
          </div>
          {outImages && (
            <div className="results">
              <p className="msg ok">{outImages.length} image(s) ready.</p>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  const base = doc.active?.name.replace(/\.pdf$/i, '') ?? 'document'
                  outImages.forEach((r) =>
                    downloadBlob(r.blob, `${base}-page-${r.page}.${format === 'png' ? 'png' : 'jpg'}`),
                  )
                }}
              >
                ⬇️ Download all
              </button>
            </div>
          )}
        </>
      )}

      {msg && <p className="msg ok">{msg}</p>}
    </div>
  )
}
