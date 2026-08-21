import { DropZone } from '../components/DropZone'
import { DemoAnimation } from '../components/DemoAnimation'
import { Icon, type IconName } from '../components/Icon'

const FEATURES: Array<{ icon: IconName; title: string; desc: string }> = [
  { icon: 'compress', title: 'Compress', desc: 'Shrink PDFs with live before/after sizes.' },
  { icon: 'sign', title: 'Sign', desc: 'Draw or type a signature in seconds.' },
  { icon: 'organize', title: 'Organize', desc: 'Merge, split, reorder, rotate, crop.' },
  { icon: 'ocr', title: 'OCR', desc: 'Make scans searchable — right in your browser.' },
  { icon: 'pen', title: 'Edit', desc: 'Add and edit text, annotations, and forms.' },
  { icon: 'convert', title: 'Convert', desc: 'Images to PDF, and PDF to JPG or PNG.' },
]

export function Home({ onFiles }: { onFiles: (files: File[]) => void }) {
  return (
    <div className="page">
      <section className="hero">
        <span className="kicker">
          <Icon name="bolt" size={16} strokeWidth={2.2} />
          No upload · No account · No cost
        </span>
        <h1 className="hero-title">
          Edit PDFs
          <br />
          like a <em>pro</em>
        </h1>
        <p className="hero-sub">
          Drag in a file, use the tools, download the result. Every page is processed on your own
          machine — nothing is ever sent anywhere.
        </p>
        <div className="hero-grid">
          <DropZone onFiles={onFiles} />
          <DemoAnimation />
        </div>
      </section>

      <section className="features-section" aria-label="Features">
        <div className="section-head">
          <h2>Everything in one workspace</h2>
          <span className="section-note">Twelve tools. One tab. Zero waiting rooms.</span>
        </div>
        <div className="features">
          {FEATURES.map((f) => (
            <div className="feature" key={f.title}>
              <div className="feature-icon">
                <Icon name={f.icon} size={26} strokeWidth={1.9} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="privacy-banner">
        <h2>Your files never leave your device</h2>
        <p>
          All processing happens locally in your browser. There is no server to trust, because there
          is no server. Free forever, and built to stay that way.
        </p>
        <div className="privacy-marks">
          <span>
            <Icon name="cloudOff" size={16} strokeWidth={2.1} /> No uploads
          </span>
          <span>
            <Icon name="shield" size={16} strokeWidth={2.1} /> No tracking
          </span>
          <span>
            <Icon name="bolt" size={16} strokeWidth={2.1} /> Works offline
          </span>
        </div>
      </section>
    </div>
  )
}
