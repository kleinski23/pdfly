import { Icon, type IconName } from '../components/Icon'

/** Three-panel comic strip: drop it, sign it, done. */
const STEPS: Array<{ label: string; action: string; icon: IconName }> = [
  { label: 'contract.pdf', action: 'Dropped', icon: 'file' },
  { label: 'Sign here →', action: 'Signed', icon: 'sign' },
  { label: 'final.pdf', action: 'Saved', icon: 'download' },
]

export function DemoAnimation() {
  return (
    <div className="demo" role="img" aria-label="Demo: drop a PDF, sign it, download the result">
      {STEPS.map((step, i) => (
        <div className={`demo-row demo-row--${i + 1}`} key={step.label}>
          <span className="demo-panelno" aria-hidden="true">
            {i + 1}
          </span>
          <span className="demo-glyph" aria-hidden="true">
            <Icon name={step.icon} size={20} strokeWidth={2} />
          </span>
          <span className="demo-label">{step.label}</span>
          <span className="demo-check">
            <Icon name="check" size={13} strokeWidth={3} />
            {step.action}
          </span>
        </div>
      ))}
      <div className="demo-track" aria-hidden="true">
        <div className="demo-progress" />
      </div>
    </div>
  )
}
