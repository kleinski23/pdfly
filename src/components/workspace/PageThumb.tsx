import { useEffect, useState, type MouseEvent } from 'react'
import { renderThumbnail } from '../../lib/pdf'
import type { DocApi } from '../../hooks/useDocument'

export function PageThumb({
  doc,
  page,
  width = 100,
  label,
  selected,
  onClick,
}: {
  doc: DocApi
  page: number
  width?: number
  label?: string
  selected?: boolean
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
}) {
  const [src, setSrc] = useState<string>()
  const active = doc.active

  useEffect(() => {
    if (!active) return
    let cancelled = false
    setSrc(undefined)
    renderThumbnail(active.id, active.bytes, page, width)
      .then((data) => {
        if (!cancelled) setSrc(data)
      })
      // In-flight renders on a doc being replaced are expected and harmless.
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [active, active?.id, active?.bytes, doc.rev, page, width])

  return (
    <button
      type="button"
      className={`thumb${selected ? ' selected' : ''}`}
      onClick={onClick}
      title={`Page ${page}`}
      aria-label={`Page ${page}`}
    >
      {src ? (
        <img src={src} alt={`Page ${page}`} width={width} />
      ) : (
        <div className="thumb-skeleton" style={{ width }} />
      )}
      {label && <span className="thumb-label">{label}</span>}
    </button>
  )
}
