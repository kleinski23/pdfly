import { useEffect, useState } from 'react'
import { fillFormFields, flattenForm, getFormFields, type FormFieldInfo } from '../../../lib/forms'
import type { DocApi } from '../../../hooks/useDocument'

export function FormsTool({ doc }: { doc: DocApi }) {
  const [fields, setFields] = useState<FormFieldInfo[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string>()
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!doc.active) return
    let cancelled = false
    setLoaded(false)
    setMsg(undefined)
    getFormFields(doc.active.bytes)
      .then((list) => {
        if (cancelled) return
        setFields(list)
        const initial: Record<string, string> = {}
        for (const f of list) {
          if (f.type === 'checkbox') initial[`${f.page}:${f.index}`] = f.value === 'Yes' ? 'On' : 'Off'
          else initial[`${f.page}:${f.index}`] = f.value
        }
        setValues(initial)
        setLoaded(true)
        if (list.length === 0) setMsg('No form fields detected in this document.')
      })
      .catch(() => {
        if (!cancelled) {
          setLoaded(true)
          setMsg('Could not read form fields.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [doc.active, doc.active?.id, doc.active?.bytes, doc.rev])

  const apply = async () => {
    if (!doc.active) return
    setBusy(true)
    setMsg(undefined)
    try {
      const updates = fields
        .filter((f) => f.type !== 'checkbox' || values[`${f.page}:${f.index}`] === 'On')
        .map((f) => ({ page: f.page, index: f.index, value: values[`${f.page}:${f.index}`] ?? '' }))
      const result = await fillFormFields(doc.active.bytes, updates)
      doc.mutate(result)
      setMsg('Form filled — fields remain editable. Use Flatten to lock them.')
    } catch (err) {
      console.error('form fill failed', err)
      setMsg('Form fill failed.')
    } finally {
      setBusy(false)
    }
  }

  const flatten = async () => {
    if (!doc.active) return
    setBusy(true)
    setMsg(undefined)
    try {
      const result = await flattenForm(doc.active.bytes)
      doc.mutate(result)
      setMsg('Form flattened — fields are now fixed content.')
    } catch {
      setMsg('Flatten failed.')
    } finally {
      setBusy(false)
    }
  }

  const key = (f: FormFieldInfo) => `${f.page}:${f.index}`

  return (
    <div className="tool">
      <h3>Form filling</h3>
      <p className="tool-hint">
        {loaded && fields.length > 0
          ? `${fields.length} field(s) detected. Fill below, then apply.`
          : 'Detecting form fields…'}
      </p>

      <div className="merge-list">
        {fields.map((f) => (
          <div className="merge-row" key={key(f)}>
            <span className="merge-name" title={f.name}>
              P{f.page} · {f.type}
              {f.name ? ` · ${f.name}` : ''}
            </span>
            {f.type === 'checkbox' ? (
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={values[key(f)] === 'On'}
                  onChange={(e) => setValues((prev) => ({ ...prev, [key(f)]: e.target.checked ? 'On' : 'Off' }))}
                />
                {values[key(f)] === 'On' ? 'On' : 'Off'}
              </label>
            ) : f.type === 'choice' || f.type === 'radio' ? (
              <select
                className="input input-sm"
                value={values[key(f)] ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [key(f)]: e.target.value }))}
                aria-label={`Value for ${f.name || f.type}`}
              >
                <option value="">—</option>
                {(f.options.length ? f.options : [values[key(f)] ?? '']).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="input input-sm"
                type="text"
                value={values[key(f)] ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [key(f)]: e.target.value }))}
                aria-label={`Value for ${f.name || f.type}`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="tool-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void apply()}
          disabled={busy || fields.length === 0}
        >
          {busy ? 'Filling…' : 'Apply to PDF'}
        </button>
        <button type="button" className="btn" onClick={() => void flatten()} disabled={busy || fields.length === 0}>
          Flatten fields
        </button>
      </div>
      {msg && <p className={msg.startsWith('No form') || msg.includes('failed') ? 'msg error' : 'msg ok'}>{msg}</p>}
    </div>
  )
}
