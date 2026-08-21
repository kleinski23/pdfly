// PDF encryption via MuPDF WASM (lazy-loaded ~14 MB chunk, loaded only when the
// Protect tool is used). pdf-lib cannot write encrypted PDFs, so this is the
// free, local-first path for SEC-001 encrypt / SEC-002 unlock.

export interface EncryptOptions {
  userPassword: string
  ownerPassword?: string
  allowPrinting: boolean
  allowCopying: boolean
  allowModifying: boolean
}

// mupdf's d.ts types openDocument as the base Document; the methods we use live on PDFDocument.
interface MupdfPdfDoc {
  needsPassword(): boolean
  authenticatePassword(password: string): number
  saveToBuffer(options?: Record<string, unknown>): MupdfOutBuffer
  destroy(): void
}

// saveToBuffer returns a wrapper around WASM memory; asUint8Array() is a live
// view, so it must be copied before any other WASM call.
export interface MupdfOutBuffer {
  length: number
  asUint8Array(): Uint8Array
  destroy(): void
}

export function mupdfOutToArrayBuffer(out: MupdfOutBuffer): ArrayBuffer {
  const view = out.asUint8Array()
  const copy = view.slice() // detach from WASM heap
  out.destroy()
  return copy.buffer as ArrayBuffer
}

// MuPDF permissions bitmask (PDF P bits, as granted):
// print=4, print-hq=2048, copy=16, modify=8, annotate=32, form-fill=256,
// accessibility=512, assemble=1024.
function permissionBits(opts: EncryptOptions): number {
  let bits = 512 // accessibility always on
  if (opts.allowPrinting) bits |= 4 | 2048
  if (opts.allowCopying) bits |= 16
  if (opts.allowModifying) bits |= 8 | 32 | 256 | 1024
  return bits
}

export async function encryptPdf(bytes: ArrayBuffer, opts: EncryptOptions): Promise<ArrayBuffer> {
  const mupdf = await import('mupdf')
  const doc = mupdf.PDFDocument.openDocument(new Uint8Array(bytes), 'application/pdf') as unknown as MupdfPdfDoc
  try {
    const out = doc.saveToBuffer({
      encrypt: 'aes-256',
      'user-password': opts.userPassword,
      'owner-password': opts.ownerPassword || opts.userPassword,
      permissions: permissionBits(opts),
    })
    return mupdfOutToArrayBuffer(out)
  } finally {
    doc.destroy()
  }
}

/** Throws if the password is wrong. */
export async function unlockPdf(bytes: ArrayBuffer, password: string): Promise<ArrayBuffer> {
  const mupdf = await import('mupdf')
  const doc = mupdf.PDFDocument.openDocument(new Uint8Array(bytes), 'application/pdf') as unknown as MupdfPdfDoc
  try {
    if (doc.needsPassword()) {
      // mupdf returns 0 for an incorrect password, non-zero otherwise (1|2|4 mask).
      const ok = doc.authenticatePassword(password)
      if (ok === 0) throw new Error('Wrong password')
    }
    const out = doc.saveToBuffer({ encrypt: 'none' })
    return mupdfOutToArrayBuffer(out)
  } finally {
    doc.destroy()
  }
}
