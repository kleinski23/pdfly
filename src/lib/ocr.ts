// OCR engine: Tesseract.js running fully locally (worker + WASM + language
// packs are served from our own origin — files never leave the device).
import { mergePdfs } from './operations.ts'

export interface OcrProgress {
  page: number
  total: number
  progress: number // 0..1 overall
  status: string
}

export interface OcrResult {
  searchablePdf: ArrayBuffer
  texts: string[]
}

export interface OcrOptions {
  lang: string
  pages: number[] // 1-based
  enhance: boolean
  renderPage: (page: number) => Promise<HTMLCanvasElement>
  onProgress: (p: OcrProgress) => void
  isCancelled: () => boolean
}

const LANG_PATH = '/tessdata'
const CORE_PATH = '/tesseract/tesseract-core-simd.wasm.js'
const WORKER_PATH = '/tesseract/worker.min.js'

export async function runOcr(opts: OcrOptions): Promise<OcrResult> {
  const { createWorker } = await import('tesseract.js')
  const total = opts.pages.length
  let currentPage = opts.pages[0] ?? 0
  const worker = await createWorker(opts.lang, 1, {
    workerPath: WORKER_PATH,
    corePath: CORE_PATH,
    langPath: LANG_PATH,
    gzip: true,
    logger: (m) => {
      opts.onProgress({
        page: currentPage,
        total,
        progress: 0,
        status: m.status,
      })
    },
  })

  const searchables: ArrayBuffer[] = []
  const texts: string[] = []
  try {
    for (let i = 0; i < total; i++) {
      const page = opts.pages[i]
      if (opts.isCancelled()) break
      currentPage = page
      opts.onProgress({ page, total, progress: i / total, status: `Rendering page ${page}…` })
      const canvas = await opts.renderPage(page)
      const input = opts.enhance ? enhanceCanvas(canvas) : canvas
      const result = await worker.recognize(input, {}, { text: true, pdf: true })
      // The pdf output is a Uint8Array inside result.data (missing from shipped types).
      const pdfOut = (result.data as { pdf?: unknown } | undefined)?.pdf
      if (pdfOut instanceof Uint8Array && pdfOut.length > 0) {
        searchables.push(
          pdfOut.buffer.slice(pdfOut.byteOffset, pdfOut.byteOffset + pdfOut.byteLength) as ArrayBuffer,
        )
      }
      texts.push(result.data?.text ?? '')
      opts.onProgress({ page, total, progress: (i + 1) / total, status: `Page ${page} done` })
    }
  } finally {
    await worker.terminate()
  }

  if (searchables.length === 0) {
    throw new Error('OCR produced no output')
  }
  const searchablePdf = searchables.length > 1 ? await mergePdfs(searchables) : searchables[0]
  return { searchablePdf, texts }
}

function enhanceCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = src.width
  out.height = src.height
  const ctx = out.getContext('2d')!
  ctx.filter = 'contrast(1.25) saturate(1.15)'
  ctx.drawImage(src, 0, 0)
  return out
}

export const OCR_LANGS: Array<{ id: string; label: string }> = [
  { id: 'eng', label: 'English' },
  { id: 'chi_sim', label: 'Chinese (Simplified)' },
  { id: 'deu', label: 'German' },
  { id: 'fra', label: 'French' },
  { id: 'spa', label: 'Spanish' },
  { id: 'jpn', label: 'Japanese' },
]
