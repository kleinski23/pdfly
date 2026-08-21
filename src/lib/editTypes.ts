// Edit elements live in page coordinates (PDF points, y measured from the top).

export type EditToolMode =
  | 'select'
  | 'text'
  | 'editText'
  | 'highlight'
  | 'underline'
  | 'strikethrough'
  | 'squiggly'
  | 'note'
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'pen'
  | 'sign'
  | 'image'

export type MarkType = 'highlight' | 'underline' | 'strikethrough' | 'squiggly'

export type EditElement =
  | {
      kind: 'text'
      id: string
      page: number
      x: number
      y: number
      text: string
      size: number
      color: string
      align: 'left' | 'center' | 'right'
    }
  | {
      kind: 'signature' | 'image'
      id: string
      page: number
      x: number
      y: number
      w: number
      h: number
      dataUrl: string
      name: string
    }
  | {
      kind: 'mark'
      id: string
      page: number
      type: MarkType
      x: number
      y: number
      w: number
      h: number
      color: string
    }
  | { kind: 'note'; id: string; page: number; x: number; y: number; text: string }
  | {
      kind: 'shape'
      id: string
      page: number
      shape: 'rect' | 'ellipse'
      x: number
      y: number
      w: number
      h: number
      color: string
      width: number
    }
  | {
      kind: 'line'
      id: string
      page: number
      x1: number
      y1: number
      x2: number
      y2: number
      color: string
      width: number
    }
  | { kind: 'ink'; id: string; page: number; points: number[]; color: string; width: number }

export interface EditSession {
  editMode: EditToolMode
  setEditMode: (m: EditToolMode) => void
  elements: EditElement[]
  setElements: (fn: (prev: EditElement[]) => EditElement[]) => void
  selection: string | null
  setSelection: (id: string | null) => void
  editColor: string
  setEditColor: (c: string) => void
  editSize: number
  setEditSize: (n: number) => void
  editWidth: number
  setEditWidth: (n: number) => void
  signature: { dataUrl: string; name: string } | null
  setSignature: (s: { dataUrl: string; name: string } | null) => void
  pendingImage: { dataUrl: string; name: string } | null
  setPendingImage: (i: { dataUrl: string; name: string } | null) => void
  openSignatureModal: () => void
  paletteOpen: boolean
  setPaletteOpen: (open: boolean) => void
  toolId: string
  setToolId: (id: string) => void
  // Existing-text editing (PRD EDT-001).
  textItems: Array<{ str: string; x: number; y: number; w: number; h: number; fontSize: number }> | null
  setTextItems: (items: Array<{ str: string; x: number; y: number; w: number; h: number; fontSize: number }> | null) => void
  editTarget: { item: { str: string; x: number; y: number; w: number; h: number; fontSize: number }; page: number } | null
  setEditTarget: (t: { item: { str: string; x: number; y: number; w: number; h: number; fontSize: number }; page: number } | null) => void
}

export function nextId(): string {
  return crypto.randomUUID()
}
