import type { DocApi } from '../../hooks/useDocument'
import type { EditSession } from '../../lib/editTypes'
import { MergeTool } from './tools/MergeTool'
import { SplitTool } from './tools/SplitTool'
import { OrganizeTool } from './tools/OrganizeTool'
import { RotateTool } from './tools/RotateTool'
import { CropTool } from './tools/CropTool'
import { CompressTool } from './tools/CompressTool'
import { ConvertTool } from './tools/ConvertTool'
import { ProtectTool } from './tools/ProtectTool'
import { EditTool } from './tools/EditTool'
import { FormsTool } from './tools/FormsTool'
import { AnnotsTool } from './tools/AnnotsTool'
import { OcrTool } from './tools/OcrTool'

export const TOOLS = [
  { id: 'edit', label: 'Edit', icon: '✏️', el: EditTool },
  { id: 'ocr', label: 'OCR', icon: '🔍', el: OcrTool },
  { id: 'forms', label: 'Forms', icon: '📋', el: FormsTool },
  { id: 'annots', label: 'Annots', icon: '💬', el: AnnotsTool },
  { id: 'merge', label: 'Merge', icon: '📚', el: MergeTool },
  { id: 'split', label: 'Split', icon: '✂️', el: SplitTool },
  { id: 'organize', label: 'Organize', icon: '🗂️', el: OrganizeTool },
  { id: 'rotate', label: 'Rotate', icon: '🔄', el: RotateTool },
  { id: 'crop', label: 'Crop', icon: '🎯', el: CropTool },
  { id: 'compress', label: 'Compress', icon: '🗜️', el: CompressTool },
  { id: 'convert', label: 'Convert', icon: '🔁', el: ConvertTool },
  { id: 'protect', label: 'Protect', icon: '🔒', el: ProtectTool },
] as const

export function ToolPanel({
  doc,
  edit,
  toolId,
  setToolId,
}: {
  doc: DocApi
  edit: EditSession
  toolId: string
  setToolId: (id: string) => void
}) {
  const Tool = TOOLS.find((t) => t.id === toolId)?.el

  return (
    <aside className="toolpanel" aria-label="Tools">
      <div className="tool-list">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tool-btn${t.id === toolId ? ' active' : ''}`}
            onClick={() => setToolId(t.id)}
          >
            <span aria-hidden="true">{t.icon}</span> {t.label}
          </button>
        ))}
      </div>
      <div className="tool-body">{Tool && <Tool doc={doc} edit={edit} />}</div>
    </aside>
  )
}
