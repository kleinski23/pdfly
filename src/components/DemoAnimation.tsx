const STEPS = [
  { label: 'contract.pdf', action: 'Drop it in', icon: '📄' },
  { label: 'Sign here', action: 'Add signature', icon: '✍️' },
  { label: 'final.pdf', action: 'Download', icon: '⬇️' },
]

export function DemoAnimation() {
  return (
    <div className="demo" role="img" aria-label="Demo: drop a PDF, sign it, download the result">
      {STEPS.map((step, i) => (
        <div className={`demo-row demo-row--${i + 1}`} key={step.label}>
          <span>
            {step.icon} {step.label}
          </span>
          <span className="demo-check">✓ {step.action}</span>
        </div>
      ))}
      <div className="demo-track" aria-hidden="true">
        <div className="demo-progress" />
      </div>
    </div>
  )
}
