import { useCallback, useEffect, useRef, useState } from 'react'
import { formatBytes } from '../lib/format'
import { Icon } from './Icon'

interface PickedFile {
  name: string
  size: number
}

const WARN_SIZE = 100 * 1024 * 1024 // 100 MB soft warning

function isAccepted(file: File): boolean {
  return file.name.toLowerCase().endsWith('.pdf') || file.type.startsWith('image/')
}

export function DropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [dragging, setDragging] = useState(false)
  const [files, setFiles] = useState<PickedFile[]>([])
  const [skipped, setSkipped] = useState<string[]>([])
  const [warning, setWarning] = useState<string>()
  const inputRef = useRef<HTMLInputElement>(null)

  const accept = useCallback(
    (list: FileList | null) => {
      if (!list) return
      const all = Array.from(list)
      const picked = all.filter(isAccepted)
      const rejected = all.filter((f) => !isAccepted(f))
      setSkipped(rejected.map((f) => f.name))
      const big = picked.filter((f) => f.size > WARN_SIZE)
      setWarning(
        big.length > 0
          ? `Large file${big.length > 1 ? 's' : ''} (${big.map((f) => formatBytes(f.size)).join(', ')}) may be slow — that's normal.`
          : undefined,
      )
      if (picked.length > 0) {
        setFiles(picked.map((f) => ({ name: f.name, size: f.size })))
        onFiles(picked)
      }
    },
    [onFiles],
  )

  // Paste / Cmd+V import (PRD PLT-001)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (e.clipboardData?.files?.length) accept(e.clipboardData.files)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [accept])

  return (
    <div
      className={`dropzone${dragging ? ' dragging' : ''}`}
      role="button"
      tabIndex={0}
      aria-label="Drop a PDF here, click to browse, or paste to import"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        accept(e.dataTransfer.files)
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf,image/*"
        multiple
        hidden
        onChange={(e) => {
          accept(e.target.files)
          e.currentTarget.value = ''
        }}
      />
      <div className="dropzone-icon" aria-hidden="true">
        <Icon name="file" size={30} strokeWidth={2} />
      </div>
      <p>
        <strong>Drop your PDF here</strong>, or click to browse.
      </p>
      <p className="dropzone-note">
        Paste (Ctrl+V) works too. Images welcome for merge &amp; convert.
      </p>

      {files.length > 0 && (
        <ul className="file-list">
          {files.map((f) => (
            <li key={f.name}>
              <Icon name="file" size={16} strokeWidth={2.1} />
              {f.name} · {formatBytes(f.size)}
            </li>
          ))}
        </ul>
      )}

      {skipped.length > 0 && (
        <p className="msg error" role="alert">
          Skipped: {skipped.join(', ')} — only PDF and image files are supported.
        </p>
      )}
      {warning && <p className="msg">{warning}</p>}

      <span className="coming-soon">
        <Icon name="lock" size={14} strokeWidth={2.2} />
        Files never leave your device
      </span>
    </div>
  )
}
