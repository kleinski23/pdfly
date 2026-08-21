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
import { Icon, type IconName } from '../Icon'

export const TOOLS = [
  { id: 'edit', label: 'Edit', icon: 'pen', el: EditTool },
  { id: 'ocr', label: 'OCR', icon: 'ocr', el: OcrTool },
  { id: 'forms', label: 'Forms', icon: 'forms', el: FormsTool },
  { id: 'annots', label: 'Notes', icon: 'annots', el: AnnotsTool },
  { id: 'merge', label: 'Merge', icon: 'merge', el: MergeTool },
  { id: 'split', label: 'Split', icon: 'split', el: SplitTool },
  { id: 'organize', label: 'Organize', icon: 'organize', el: OrganizeTool },
  { id: 'rotate', label: 'Rotate', icon: 'rotate', el: RotateTool },
  { id: 'crop', label: 'Crop', icon: 'crop', el: CropTool },
  { id: 'compress', label: 'Squeeze', icon: 'compress', el: CompressTool },
  { id: 'convert', label: 'Convert', icon: 'convert', el: ConvertTool },
  { id: 'protect', label: 'Protect', icon: 'protect', el: ProtectTool },
] as const satisfies ReadonlyArray<{ id: string; label: string; icon: IconName; el: unknown }>

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
      <div className="panel-head">
        <span>Toolbox</span>
      </div>
      <div className="tool-list">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tool-btn${t.id === toolId ? ' active' : ''}`}
            onClick={() => setToolId(t.id)}
          >
            <Icon name={t.icon} size={20} strokeWidth={1.9} />
            {t.label}
          </button>
        ))}
      </div>
      <div className="tool-body">{Tool && <Tool doc={doc} edit={edit} />}</div>
    </aside>
  )
}
