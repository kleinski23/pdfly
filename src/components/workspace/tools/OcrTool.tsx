import { useRef, useState } from 'react'
import { OCR_LANGS, runOcr } from '../../../lib/ocr'
import { renderPageToCanvas } from '../../../lib/pdf'
import { downloadBlob, downloadBytes } from '../../../lib/download'
import { formatBytes } from '../../../lib/format'
import type { DocApi } from '../../../hooks/useDocument'
import { Icon } from '../../Icon'

export function OcrTool({ doc }: { doc: DocApi }) {
  const [lang, setLang] = useState('eng')
  const [pagesMode, setPagesMode] = useState<'all' | 'current'>('all')
  const [enhance, setEnhance] = useState(true)
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState<string>()
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ bytes: ArrayBuffer; texts: string[] } | null>(null)
  const [msg, setMsg] = useState<string>()
  const cancelRef = useRef(false)

  const run = async () => {
    if (!doc.active || running) return
    const pages =
      pagesMode === 'current'
        ? [doc.currentPage]
        : Array.from({ length: doc.pageCount }, (_, i) => i + 1)
    cancelRef.current = false
    setRunning(true)
    setProgress(0)
    setResult(null)
    setMsg(undefined)
    try {
      const out = await runOcr({
        lang,
        pages,
        enhance,
        renderPage: async (p) => {
          const canvas = document.createElement('canvas')
          await renderPageToCanvas(doc.active!.id, doc.active!.bytes, p, canvas, 2)
          return canvas
        },
        onProgress: (p) => {
          setStatus(`${p.status} (page ${p.page}/${p.total})`)
          setProgress(p.progress)
        },
        isCancelled: () => cancelRef.current,
      })
      setResult({ bytes: out.searchablePdf, texts: out.texts })
      setMsg(
        cancelRef.current
          ? 'Cancelled.'
          : `OCR complete — ${out.texts.length} page(s) processed (${formatBytes(out.searchablePdf.byteLength)}).`,
      )
    } catch (err) {
      console.error('ocr failed', err)
      setMsg('OCR failed — the language pack may still be loading, try again.')
    } finally {
      setRunning(false)
      setProgress(1)
    }
  }

  return (
    <div className="tool">
      <h3>OCR</h3>
      <p className="tool-hint">
        Make scans searchable — 100% in your browser, files never uploaded. Language packs load on
        demand.
      </p>

      <label className="field">
        Language
        <select className="input" value={lang} onChange={(e) => setLang(e.target.value)}>
          {OCR_LANGS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </label>

      <div className="seg-list">
        <label className="radio-row">
          <input type="radio" checked={pagesMode === 'all'} onChange={() => setPagesMode('all')} />
          All pages ({doc.pageCount})
        </label>
        <label className="radio-row">
          <input
            type="radio"
            checked={pagesMode === 'current'}
            onChange={() => setPagesMode('current')}
          />
          Current page only
        </label>
      </div>

      <label className="check-row">
        <input type="checkbox" checked={enhance} onChange={(e) => setEnhance(e.target.checked)} />
        Enhance low-quality scans (contrast)
      </label>

      <div className="tool-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void run()}
          disabled={running}
        >
          {running ? (
            'Working…'
          ) : (
            <>
              <Icon name="ocr" size={15} strokeWidth={2.1} /> Start OCR
            </>
          )}
        </button>
        {running && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              cancelRef.current = true
            }}
          >
            Cancel
          </button>
        )}
      </div>

      {running && (
        <div
          className="ocr-progress"
          role="progressbar"
          aria-label="OCR progress"
          aria-valuenow={Math.round(progress * 100)}
        >
          <div className="demo-track">
            <div className="ocr-bar" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="tool-hint">{status}</p>
        </div>
      )}

      {result && (
        <div className="results">
          <div className="tool-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                doc.mutate(
                  result.bytes,
                  `${doc.active?.name.replace(/\.pdf$/i, '') ?? 'document'}-ocr.pdf`,
                )
              }
            >
              Open searchable PDF
            </button>
            <button
              type="button"
              className="btn"
              onClick={() =>
                downloadBytes(
                  result.bytes,
                  `${doc.active?.name.replace(/\.pdf$/i, '') ?? 'document'}-ocr.pdf`,
                )
              }
            >
              <Icon name="download" size={15} strokeWidth={2.1} /> Download PDF
            </button>
            <button
              type="button"
              className="btn"
              onClick={() =>
                downloadBlob(
                  new Blob([result.texts.join('\n\n')], { type: 'text/plain' }),
                  `${doc.active?.name.replace(/\.pdf$/i, '') ?? 'document'}-text.txt`,
                )
              }
            >
              <Icon name="download" size={15} strokeWidth={2.1} /> Download text
            </button>
          </div>
          {result.texts[0] && (
            <details className="ocr-preview">
              <summary>Preview extracted text</summary>
              <pre className="ocr-text">{result.texts.join('\n\n').slice(0, 2000)}</pre>
            </details>
          )}
        </div>
      )}

      {msg && (
        <p className={msg.includes('failed') || msg === 'Cancelled.' ? 'msg error' : 'msg ok'}>
          {msg}
        </p>
      )}
    </div>
  )
}
