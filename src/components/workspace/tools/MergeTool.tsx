import { useCallback, useRef, useState, type DragEvent } from 'react'
import { imageFileToPngBytes } from '../../../lib/pdf'
import { imagesToPdf, mergePdfs } from '../../../lib/operations'
import { formatBytes } from '../../../lib/format'
import type { DocApi } from '../../../hooks/useDocument'
import { Icon } from '../../Icon'

interface MergeItem {
  id: string
  name: string
  bytes: ArrayBuffer
}

export function MergeTool({ doc }: { doc: DocApi }) {
  const [items, setItems] = useState<MergeItem[]>(() =>
    doc.files.map((f) => ({ id: f.id, name: f.name, bytes: f.bytes })),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [done, setDone] = useState(false)
  // Per-file page ranges (e.g. "1-3"); empty = all pages.
  const [ranges, setRanges] = useState<Record<string, string>>({})
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback(async (list: FileList | null) => {
    if (!list?.length) return
    setError(undefined)
    const extra: MergeItem[] = []
    for (const file of Array.from(list)) {
      try {
        if (/\.pdf$/i.test(file.name)) {
          extra.push({ id: crypto.randomUUID(), name: file.name, bytes: await file.arrayBuffer() })
        } else if (file.type.startsWith('image/')) {
          const png = await imageFileToPngBytes(file)
          extra.push({ id: crypto.randomUUID(), name: png.name, bytes: png.bytes })
        }
      } catch {
        setError(`Could not read "${file.name}" — unsupported format.`)
      }
    }
    setItems((prev) => [...prev, ...extra])
  }, [])

  const move = (from: number, to: number) => {
    setItems((prev) => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  const onDragStart = (e: DragEvent, idx: number) => {
    e.dataTransfer.setData('text/plain', String(idx))
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDrop = (e: DragEvent, to: number) => {
    e.preventDefault()
    const from = Number(e.dataTransfer.getData('text/plain'))
    if (!Number.isNaN(from) && from !== to) move(from, to)
  }

  const parseRange = (text: string): [number, number] | null => {
    const m = text.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/)
    if (!m) return null
    const a = Number(m[1])
    return [a, m[2] ? Number(m[2]) : a]
  }

  const merge = async () => {
    if (items.length < 2) return
    setBusy(true)
    setError(undefined)
    setDone(false)
    try {
      const pdfItems = items.filter((i) => /\.pdf$/i.test(i.name))
      const imageItems = items.filter((i) => !/\.pdf$/i.test(i.name))
      const imagePdfs = await Promise.all(
        imageItems.map(async (i) => imagesToPdf([{ bytes: i.bytes, name: i.name }])),
      )
      const fileRanges = pdfItems.map((i) => {
        const text = ranges[i.id] ?? ''
        if (!text.trim()) return null
        const r = parseRange(text)
        if (!r) throw new Error(`Invalid page range for "${i.name}" — use e.g. "1-3".`)
        return r
      })
      const result = await mergePdfs(
        [...pdfItems.map((i) => i.bytes), ...imagePdfs],
        [...fileRanges, ...imageItems.map(() => null)],
      )
      doc.mutate(result, 'merged.pdf')
      setDone(true)
    } catch (err) {
      console.error('merge failed', err)
      setError(
        err instanceof Error ? err.message : 'Merge failed — one of the files could not be read.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="tool">
      <h3>Merge PDFs</h3>
      <p className="tool-hint">
        Combine files into one PDF. Drag rows to reorder. Images are supported.
      </p>

      <div className="merge-list">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="merge-row"
            draggable
            onDragStart={(e) => onDragStart(e, idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, idx)}
          >
            <span className="merge-grip" aria-hidden="true">
              <Icon name="grip" size={16} strokeWidth={2.6} />
            </span>
            <span className="merge-name" title={item.name}>
              {item.name}
            </span>
            {/\.pdf$/i.test(item.name) && (
              <input
                className="input merge-pages"
                type="text"
                placeholder="pages (e.g. 1-3)"
                aria-label={`Pages to take from ${item.name}`}
                value={ranges[item.id] ?? ''}
                onChange={(e) => setRanges((prev) => ({ ...prev, [item.id]: e.target.value }))}
              />
            )}
            <span className="merge-size">{formatBytes(item.bytes.byteLength)}</span>
            <button
              type="button"
              className="btn btn-sm"
              aria-label={`Remove ${item.name}`}
              onClick={() => {
                setItems((prev) => prev.filter((_, i) => i !== idx))
                setRanges((prev) => {
                  const next = { ...prev }
                  delete next[item.id]
                  return next
                })
              }}
            >
              <Icon name="close" size={13} strokeWidth={2.4} />
            </button>
          </div>
        ))}
      </div>

      <div className="tool-actions">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,image/*"
          multiple
          hidden
          onChange={(e) => {
            void addFiles(e.target.files)
            e.currentTarget.value = ''
          }}
        />
        <button type="button" className="btn" onClick={() => inputRef.current?.click()}>
          + Add files
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void merge()}
          disabled={items.length < 2 || busy}
        >
          {busy ? 'Merging…' : 'Merge into one PDF'}
        </button>
      </div>

      {done && <p className="msg ok">Merged — now the active document. Use Undo to revert.</p>}
      {error && <p className="msg error">{error}</p>}
    </div>
  )
}
