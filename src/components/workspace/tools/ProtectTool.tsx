import { useState } from 'react'
import { rasterizePdf } from '../../../lib/pdf'
import { encryptPdf, unlockPdf } from '../../../lib/security'
import type { DocApi } from '../../../hooks/useDocument'

function strength(password: string): { label: string; cls: string } {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++
  if (score <= 1) return { label: 'Weak', cls: 'weak' }
  if (score <= 3) return { label: 'Okay', cls: 'ok' }
  return { label: 'Strong', cls: 'strong' }
}

export function ProtectTool({ doc }: { doc: DocApi }) {
  const [tab, setTab] = useState<'encrypt' | 'unlock'>('encrypt')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [allowPrinting, setAllowPrinting] = useState(true)
  const [allowCopying, setAllowCopying] = useState(false)
  const [allowModifying, setAllowModifying] = useState(false)
  const [unlockPw, setUnlockPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string>()
  const [error, setError] = useState<string>()

  const encrypt = async () => {
    if (!doc.active) return
    setError(undefined)
    setMsg(undefined)
    if (password.length < 4) {
      setError('Password must be at least 4 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const result = await encryptPdf(doc.active.bytes, {
        userPassword: password,
        allowPrinting,
        allowCopying,
        allowModifying,
      })
      doc.mutate(result)
      setMsg('Encrypted — the active document now requires a password to open.')
    } catch {
      setError('Encryption failed.')
    } finally {
      setBusy(false)
    }
  }

  const unlock = async () => {
    if (!doc.active) return
    setError(undefined)
    setMsg(undefined)
    setBusy(true)
    try {
      const result = await unlockPdf(doc.active.bytes, unlockPw)
      doc.mutate(result)
      setMsg('Unlocked — password restrictions removed from the active document.')
    } catch {
      setError('Wrong password, or this document is not protected.')
    } finally {
      setBusy(false)
    }
  }

  const flatten = async () => {
    if (!doc.active) return
    setError(undefined)
    setMsg(undefined)
    setBusy(true)
    try {
      const result = await rasterizePdf(doc.active.id, doc.active.bytes, 2, 0.92)
      doc.mutate(result)
      setMsg('Flattened — pages are now fixed images (forms/annotations cannot be changed).')
    } catch {
      setError('Flatten failed.')
    } finally {
      setBusy(false)
    }
  }

  const st = strength(password)

  return (
    <div className="tool">
      <h3>Protect</h3>
      <div className="seg-list">
        <label className={`preset${tab === 'encrypt' ? ' active' : ''}`}>
          <input type="radio" name="tab" checked={tab === 'encrypt'} onChange={() => setTab('encrypt')} />
          <span className="preset-label">Encrypt</span>
        </label>
        <label className={`preset${tab === 'unlock' ? ' active' : ''}`}>
          <input type="radio" name="tab" checked={tab === 'unlock'} onChange={() => setTab('unlock')} />
          <span className="preset-label">Unlock</span>
        </label>
      </div>

      {tab === 'encrypt' ? (
        <>
          <p className="tool-hint">Password-protect the document (AES-256). Passwords cannot be recovered.</p>
          <label className="field">
            Password
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          {password && (
            <p className={`strength ${st.cls}`}>
              Strength: {st.label}
            </p>
          )}
          <label className="field">
            Confirm password
            <input
              className="input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <div className="check-list">
            <label className="check-row">
              <input type="checkbox" checked={allowPrinting} onChange={(e) => setAllowPrinting(e.target.checked)} />
              Allow printing
            </label>
            <label className="check-row">
              <input type="checkbox" checked={allowCopying} onChange={(e) => setAllowCopying(e.target.checked)} />
              Allow copying text
            </label>
            <label className="check-row">
              <input type="checkbox" checked={allowModifying} onChange={(e) => setAllowModifying(e.target.checked)} />
              Allow editing
            </label>
          </div>
          <div className="tool-actions">
            <button type="button" className="btn btn-primary" onClick={() => void encrypt()} disabled={busy}>
              {busy ? 'Encrypting…' : 'Encrypt PDF'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="tool-hint">Remove restrictions with the known password.</p>
          <label className="field">
            Password
            <input
              className="input"
              type="password"
              value={unlockPw}
              onChange={(e) => setUnlockPw(e.target.value)}
              autoComplete="off"
            />
          </label>
          <div className="tool-actions">
            <button type="button" className="btn btn-primary" onClick={() => void unlock()} disabled={busy}>
              {busy ? 'Unlocking…' : 'Unlock PDF'}
            </button>
          </div>
        </>
      )}

      <div className="seg">
        <h4>Flatten</h4>
        <p className="tool-hint">Renders all pages as images — forms and annotations can no longer be edited.</p>
        <div className="tool-actions">
          <button type="button" className="btn" onClick={() => void flatten()} disabled={busy}>
            {busy ? 'Working…' : 'Flatten PDF'}
          </button>
        </div>
      </div>

      {msg && <p className="msg ok">{msg}</p>}
      {error && <p className="msg error">{error}</p>}
    </div>
  )
}
