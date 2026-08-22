import { DropZone } from '../components/DropZone'
import { DemoAnimation } from '../components/DemoAnimation'
import { Icon, type IconName } from '../components/Icon'

// The twelve tools, written the way people search for them. Each card is a real
// H3 with descriptive copy — this doubles as the long-tail landing content, so
// keep the wording honest about what the tool actually does.
const FEATURES: Array<{ icon: IconName; title: string; desc: string }> = [
  {
    icon: 'compress',
    title: 'Compress PDF',
    desc: 'Shrink a PDF with live before/after sizes, or set a target like “under 5 MB” and let it find the setting for you.',
  },
  {
    icon: 'merge',
    title: 'Merge PDF',
    desc: 'Combine PDFs into one file. Drag to reorder, pick page ranges per file, and mix in JPG or PNG images.',
  },
  {
    icon: 'split',
    title: 'Split PDF',
    desc: 'Split by page ranges, every N pages, or a maximum file size — then download the parts in one go.',
  },
  {
    icon: 'sign',
    title: 'Sign PDF',
    desc: 'Draw, type, or upload a signature, drop it anywhere on the page, and reuse it later from your signature library.',
  },
  {
    icon: 'ocr',
    title: 'OCR a scanned PDF',
    desc: 'Turn scans into searchable, selectable text in English, Chinese, German, French, Spanish, or Japanese.',
  },
  {
    icon: 'editText',
    title: 'Edit PDF text',
    desc: 'Change wording already in the document. The original text is physically removed, not just painted over.',
  },
  {
    icon: 'organize',
    title: 'Organize pages',
    desc: 'Reorder, duplicate, delete, and insert blank or image pages, with a thumbnail rail that handles 100+ pages.',
  },
  {
    icon: 'rotate',
    title: 'Rotate & crop',
    desc: 'Straighten sideways scans and trim margins — one page, a selection, or the whole document at once.',
  },
  {
    icon: 'convert',
    title: 'Convert PDF',
    desc: 'Images to PDF with page setup and sorting, or PDF to JPG and PNG at 72–300 DPI.',
  },
  {
    icon: 'annots',
    title: 'Annotate & comment',
    desc: 'Highlight, underline, strike through, add sticky notes, shapes, and freehand pen marks as real PDF annotations.',
  },
  {
    icon: 'forms',
    title: 'Fill PDF forms',
    desc: 'Auto-detect form fields, fill text, checkboxes, and dropdowns, then flatten so the answers stay put.',
  },
  {
    icon: 'protect',
    title: 'Protect PDF',
    desc: 'Add AES-256 encryption with permissions, remove a password you already know, or flatten a file for sharing.',
  },
]

// Answers shown on the page and mirrored in the FAQPage JSON-LD in index.html —
// change one and change the other, or the structured data stops matching.
const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'Is PDFly actually free?',
    a: 'Yes — every tool, with no account, no watermark, no page limits, and no trial. There is no server to pay for, so there is nothing to charge you for.',
  },
  {
    q: 'Are my files uploaded anywhere?',
    a: 'No. Every page is opened, edited, and saved by your own browser. Nothing is sent to a server, because PDFly does not have one. You can confirm it by opening your browser’s network tab, or by going offline before you start.',
  },
  {
    q: 'Can I compress a PDF to a specific file size?',
    a: 'Yes. Pick a target such as “under 5 MB” and the compressor iterates through quality settings until it lands under your limit, showing the before and after size.',
  },
  {
    q: 'Can I edit text that is already in a PDF?',
    a: 'Yes. Select the text you want to change and type the replacement — the original characters are removed from the file rather than covered with a white box, so they cannot be recovered by copying the text.',
  },
  {
    q: 'Does the OCR work offline?',
    a: 'Yes. OCR runs on Tesseract compiled to WebAssembly, in a background worker. Language packs download once and are cached, so after the first run the whole thing works with no connection.',
  },
  {
    q: 'How large a PDF can I open?',
    a: 'There is no fixed limit — it depends on your device’s memory. Files over 100 MB show a heads-up that things may be slow, but they still open; a 22 MB scan and a 100-page document both work comfortably on an ordinary laptop.',
  },
  {
    q: 'Does it work on a phone or tablet?',
    a: 'Yes. The workspace stacks into a mobile layout with a horizontal thumbnail rail, and every tool works with touch.',
  },
  {
    q: 'Which browsers are supported?',
    a: 'Any current Chrome, Edge, Firefox, or Safari — desktop or mobile. PDFly needs WebAssembly and Web Workers, which all of them have shipped for years.',
  },
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
        <p className="section-lede">
          Most PDF sites make you upload a document, wait in a queue, and trust that the copy on
          their server gets deleted. PDFly does the work in the tab you already have open, so the
          file stays on your machine from start to finish.
        </p>
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

      <section className="faq-section" aria-labelledby="faq-heading">
        <div className="section-head">
          <h2 id="faq-heading">Questions people ask</h2>
          <span className="section-note">Short answers, no asterisks.</span>
        </div>
        <div className="faq">
          {FAQS.map((item) => (
            <details className="faq-item" key={item.q}>
              <summary>
                <span className="faq-q">{item.q}</span>
                <span className="faq-mark" aria-hidden="true">
                  <Icon name="chevronDown" size={17} strokeWidth={2.4} />
                </span>
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
