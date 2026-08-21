import { DropZone } from '../components/DropZone'
import { DemoAnimation } from '../components/DemoAnimation'

const FEATURES = [
  { icon: '🗜️', title: 'Compress', desc: 'Shrink PDFs with live before/after sizes.' },
  { icon: '✍️', title: 'Sign', desc: 'Draw or type a signature in seconds.' },
  { icon: '📑', title: 'Organize', desc: 'Merge, split, reorder, rotate, crop.' },
  { icon: '🔍', title: 'OCR', desc: 'Make scans searchable — right in your browser.' },
  { icon: '✏️', title: 'Edit', desc: 'Add and edit text, annotations, and forms.' },
  { icon: '🔁', title: 'Convert', desc: 'Images ↔ PDF, and PDF → JPG/PNG.' },
]

export function Home({ onFiles }: { onFiles: (files: File[]) => void }) {
  return (
    <div className="page">
      <section className="hero">
        <h1 className="hero-title">
          Edit PDFs like a pro.
          <br />
          Privately, instantly, everywhere.
        </h1>
        <p className="hero-sub">
          Drag in a file, use the tools, download the result. No uploads, no accounts, no cost —
          ever.
        </p>
        <div className="hero-grid">
          <DropZone onFiles={onFiles} />
          <DemoAnimation />
        </div>
      </section>

      <section className="features-section" aria-label="Features">
        <h2>Everything you need, in one workspace</h2>
        <div className="features">
          {FEATURES.map((f) => (
            <div className="feature" key={f.title}>
              <div className="feature-icon" aria-hidden="true">
                {f.icon}
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="privacy-banner">
        <h2>Your files never leave your device.</h2>
        <p>
          All processing happens locally in your browser. Free forever, and built to stay that way.
        </p>
      </section>
    </div>
  )
}
