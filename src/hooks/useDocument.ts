import { useCallback, useEffect, useRef, useState } from 'react'
import { getPdfPageCount, invalidateDoc } from '../lib/pdf'
import { dbLoadSession, dbSaveSession } from '../lib/db'

export interface SessionFile {
  id: string
  name: string
  bytes: ArrayBuffer
}

const MAX_UNDO = 20

export function useDocument() {
  const [files, setFiles] = useState<SessionFile[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [rev, setRev] = useState(0) // bumped on every active-doc mutation
  const [pageCount, setPageCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set())
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const undoStackRef = useRef<ArrayBuffer[]>([])
  const redoStackRef = useRef<ArrayBuffer[]>([])
  const activeBytesRef = useRef<ArrayBuffer | null>(null)

  const active = files.find((f) => f.id === activeId) ?? null

  useEffect(() => {
    activeBytesRef.current = active?.bytes ?? null
  }, [active?.bytes])

  const loadFiles = useCallback(async (list: File[]) => {
    if (list.length === 0) return
    try {
      const loaded: SessionFile[] = await Promise.all(
        list.map(async (file) => ({
          id: crypto.randomUUID(),
          name: file.name,
          bytes: await file.arrayBuffer(),
        })),
      )
      // Clear any banner left over from the file we were looking at before.
      setLoadError(null)
      setFiles((prev) => [...prev, ...loaded])
      setActiveId(loaded[0].id)
    } catch {
      setLoadError('That file could not be read from your device. Try opening it again.')
    }
  }, [])

  // Undo history is per-document: opening or switching files starts a clean stack,
  // so an undo can never write a different document's bytes over this one.
  useEffect(() => {
    undoStackRef.current = []
    redoStackRef.current = []
    setCanUndo(false)
    setCanRedo(false)
  }, [activeId])

  // Session recovery (PRD PLT-010): debounced snapshot of open files.
  useEffect(() => {
    if (files.length === 0) return
    const t = setTimeout(() => {
      void dbSaveSession(files.map((f) => ({ name: f.name, bytes: f.bytes })))
    }, 800)
    return () => clearTimeout(t)
  }, [files])

  const tryRestoreSession = useCallback(async (): Promise<boolean> => {
    const session = await dbLoadSession()
    if (!session || session.length === 0) return false
    const restored: SessionFile[] = session.map((s) => ({
      id: crypto.randomUUID(),
      name: s.name,
      bytes: s.bytes,
    }))
    setFiles(restored)
    setActiveId(restored[0].id)
    return true
  }, [])

  // Track page count for the active document (re-runs after every mutation).
  useEffect(() => {
    const file = files.find((f) => f.id === activeId)
    if (!file) return
    let cancelled = false
    getPdfPageCount(file.id, file.bytes)
      .then((n) => {
        if (!cancelled) {
          setLoadError(null)
          setPageCount(n)
          setCurrentPage((p) => Math.min(p, n))
          setSelectedPages(new Set())
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Drop the previous document's page count rather than leaving a stale
          // one on screen for a file that never opened.
          setPageCount(0)
          setCurrentPage(1)
          setSelectedPages(new Set())
          setLoadError('This PDF could not be opened — it may be corrupt, password-protected, or not a real PDF file.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [activeId, rev, files])

  const applyBytes = useCallback(
    (bytes: ArrayBuffer) => {
      if (!activeId) return
      invalidateDoc(activeId)
      setFiles((prev) => prev.map((f) => (f.id === activeId ? { ...f, bytes } : f)))
      setRev((r) => r + 1)
    },
    [activeId],
  )

  /** Apply a mutation with an undo snapshot. */
  const mutate = useCallback(
    (nextBytes: ArrayBuffer, name?: string) => {
      if (!activeId) return
      const current = activeBytesRef.current
      if (current) {
        const stack = undoStackRef.current
        stack.push(current)
        if (stack.length > MAX_UNDO) stack.shift()
      }
      redoStackRef.current = []
      setCanUndo(undoStackRef.current.length > 0)
      setCanRedo(false)
      applyBytes(nextBytes)
      if (name) {
        setFiles((prev) => prev.map((f) => (f.id === activeId ? { ...f, name } : f)))
      }
    },
    [activeId, applyBytes],
  )

  const undo = useCallback(() => {
    const stack = undoStackRef.current
    if (stack.length === 0 || !activeId) return
    const prev = stack.pop()!
    const current = activeBytesRef.current
    if (current) redoStackRef.current.push(current)
    setCanUndo(stack.length > 0)
    setCanRedo(redoStackRef.current.length > 0)
    applyBytes(prev)
  }, [activeId, applyBytes])

  const redo = useCallback(() => {
    const stack = redoStackRef.current
    if (stack.length === 0 || !activeId) return
    const next = stack.pop()!
    const current = activeBytesRef.current
    if (current) undoStackRef.current.push(current)
    setCanUndo(undoStackRef.current.length > 0)
    setCanRedo(stack.length > 0)
    applyBytes(next)
  }, [activeId, applyBytes])

  return {
    files,
    active,
    activeId,
    rev,
    pageCount,
    currentPage,
    zoom,
    selectedPages,
    canUndo,
    canRedo,
    loadError,
    loadFiles,
    tryRestoreSession,
    mutate,
    undo,
    redo,
    setActiveId,
    setCurrentPage,
    setZoom,
    setSelectedPages,
  }
}

export type DocApi = ReturnType<typeof useDocument>
