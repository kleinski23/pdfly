import { useEffect, useMemo, useState } from 'react'
import type { DocApi } from '../../hooks/useDocument'
import type { EditElement, EditSession, EditToolMode } from '../../lib/editTypes'
import { ThumbnailRail } from './ThumbnailRail'
import { CanvasView } from './CanvasView'
import { ToolPanel } from './ToolPanel'
import { SignatureModal } from './SignatureModal'
import { CommandPalette } from './CommandPalette'

export function Workspace({ doc, onHome }: { doc: DocApi; onHome: () => void }) {
  const [toolId, setToolId] = useState('organize')
  const [editMode, setEditMode] = useState<EditToolMode>('select')
  const [elements, setElements] = useState<EditElement[]>([])
  const [selection, setSelection] = useState<string | null>(null)
  const [editColor, setEditColor] = useState('#fde047')
  const [editSize, setEditSize] = useState(16)
  const [editWidth, setEditWidth] = useState(2)
  const [signature, setSignature] = useState<{ dataUrl: string; name: string } | null>(null)
  const [pendingImage, setPendingImage] = useState<{ dataUrl: string; name: string } | null>(null)
  const [sigModalOpen, setSigModalOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [textItems, setTextItems] = useState<EditSession['textItems']>(null)
  const [editTarget, setEditTarget] = useState<EditSession['editTarget']>(null)

  const edit: EditSession = useMemo(
    () => ({
      editMode,
      setEditMode,
      elements,
      setElements,
      selection,
      setSelection,
      editColor,
      setEditColor,
      editSize,
      setEditSize,
      editWidth,
      setEditWidth,
      signature,
      setSignature,
      pendingImage,
      setPendingImage,
      openSignatureModal: () => setSigModalOpen(true),
      paletteOpen,
      setPaletteOpen,
      toolId,
      setToolId,
      textItems,
      setTextItems,
      editTarget,
      setEditTarget,
    }),
    [
      editMode,
      elements,
      selection,
      editColor,
      editSize,
      editWidth,
      signature,
      pendingImage,
      paletteOpen,
      toolId,
      textItems,
      editTarget,
    ],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inField = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((open) => !open)
        return
      }
      if (e.key === 'Escape') {
        setPaletteOpen(false)
        setSelection(null)
        return
      }
      if (inField) return
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) doc.redo()
        else doc.undo()
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection) {
          e.preventDefault()
          setElements((prev) => prev.filter((el) => el.id !== selection))
          setSelection(null)
        }
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        doc.setCurrentPage((p) => Math.min(p + 1, doc.pageCount))
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        doc.setCurrentPage((p) => Math.max(p - 1, 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doc, selection])

  if (!doc.active) {
    return (
      <div className="workspace-empty">
        <p>No document open.</p>
        <button type="button" className="btn btn-primary" onClick={onHome}>
          Open a PDF
        </button>
      </div>
    )
  }

  return (
    <div className="workspace">
      {doc.loadError && (
        <div className="workspace-banner" role="alert">
          <span>⚠️ {doc.loadError}</span>
          <button type="button" className="btn btn-sm" onClick={onHome}>
            Open another file
          </button>
        </div>
      )}
      <ThumbnailRail doc={doc} />
      <CanvasView doc={doc} onHome={onHome} edit={edit} />
      <ToolPanel doc={doc} edit={edit} toolId={toolId} setToolId={setToolId} />
      {sigModalOpen && (
        <SignatureModal
          onClose={() => setSigModalOpen(false)}
          onSelect={(sig) => {
            setSignature(sig)
            setEditMode('sign')
          }}
        />
      )}
      {paletteOpen && (
        <CommandPalette doc={doc} edit={edit} onClose={() => setPaletteOpen(false)} />
      )}
    </div>
  )
}

export default Workspace
