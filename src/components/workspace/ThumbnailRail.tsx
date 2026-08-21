import { useEffect, useRef, useState, type MouseEvent } from 'react'
import type { DocApi } from '../../hooks/useDocument'
import { PageThumb } from './PageThumb'

// Virtualized rail: only thumbs near the viewport are rendered, so opening
// 100+ page documents stays fast (PRD performance target).
const ITEM_H = 200 // estimated px per row incl. padding/gap

export function ThumbnailRail({ doc }: { doc: DocApi }) {
  const { pageCount, currentPage, selectedPages, setCurrentPage, setSelectedPages } = doc
  const listRef = useRef<HTMLDivElement>(null)
  const [win, setWin] = useState({ start: 0, end: 30 })
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 900px)').matches)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const updateWindow = () => {
    const el = listRef.current
    if (!el) return
    const start = Math.max(0, Math.floor(el.scrollTop / ITEM_H) - 6)
    const end = Math.min(pageCount, Math.ceil((el.scrollTop + el.clientHeight) / ITEM_H) + 6)
    setWin((w) => (w.start === start && w.end === end ? w : { start, end }))
  }

  useEffect(() => {
    updateWindow()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageCount])

  const pages = []
  if (mobile) {
    for (let p = 1; p <= pageCount; p++) pages.push(p)
  } else {
    for (let p = win.start + 1; p <= win.end; p++) pages.push(p)
  }

  const select = (page: number, e: MouseEvent<HTMLButtonElement>) => {
    setCurrentPage(page)
    const additive = e.ctrlKey || e.metaKey || e.shiftKey
    setSelectedPages((prev) => {
      const next = new Set(additive ? prev : [])
      if (additive && prev.has(page)) next.delete(page)
      else next.add(page)
      return next
    })
  }

  return (
    <aside className="rail" aria-label="Pages">
      <div className="rail-header">
        Pages <span className="rail-count">{pageCount}</span>
      </div>
      <div className={`rail-list${mobile ? ' rail-list--mobile' : ''}`} ref={listRef} onScroll={updateWindow}>
        {!mobile && <div style={{ height: win.start * ITEM_H }} aria-hidden="true" />}
        {pages.map((p) => (
          <PageThumb
            key={p}
            doc={doc}
            page={p}
            width={mobile ? 84 : 116}
            label={String(p)}
            selected={selectedPages.has(p) || currentPage === p}
            onClick={(e) => select(p, e)}
          />
        ))}
        {!mobile && <div style={{ height: Math.max(0, pageCount - win.end) * ITEM_H }} aria-hidden="true" />}
      </div>
    </aside>
  )
}
