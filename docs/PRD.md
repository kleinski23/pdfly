# PRD — In-Browser PDF Editor (working title: PDFly)

**One-liner**: A free web app that edits PDFs entirely in the browser — drag in a file, use the tools, download the result. Nothing is uploaded, no account is needed, and it costs ~$0/month to run.

| Item | Value |
|---|---|
| Product name (working title) | **PDFly** (replaceable) |
| Document version | v2.0 |
| Status | Draft — pending review |
| Author | Product |
| Date | 2026-08-21 |
| Revision | v2.0: simplified to the essential purpose — a free, client-side web PDF editor; no server, no accounts, no paywalls |

---

## 1. Purpose

A web-based site for editing PDFs. People use it for quick, common PDF jobs — compress, sign, merge, fill forms, make scans searchable — without uploading confidential files to a server, installing software, or paying a subscription.

**Audience**: anyone with a PDF task (professionals, students, small businesses). No accounts, no signup, no lock-in.

---

## 2. Core Features (v1)

All free, all running in the browser:

- **Compress** — shrink file size with live before/after preview
- **Organize** — merge, split, reorder, rotate, crop, extract pages
- **Edit** — add and edit text, add images
- **Annotate** — highlight, underline, comments, shapes
- **Sign** — draw or type a signature; saved signature library (locally)
- **Forms** — auto-detect and fill form fields
- **Convert** — images ↔ PDF, PDF → images (JPG/PNG)
- **Protect** — encrypt with password, unlock, flatten
- **OCR** — make scanned PDFs searchable (client-side, language packs loaded on demand)

**Platform**: one workspace with page thumbnail rail, unlimited undo/redo, live preview, ⌘K command palette, light/dark themes, responsive on mobile.

---

## 3. Principles

1. **100% free, forever** — no paywalls, no feature gating, no ads.
2. **Privacy by architecture** — every tool runs locally (WASM); files never leave the device.
3. **Cheap to run** — no server in v1; the only cost is static hosting.
4. **Simple by design** — any task in ≤ 3 steps: drop → do → download.

---

## 4. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript + Vite |
| PDF rendering | PDF.js |
| PDF editing/generation | pdf-lib (+ PDFium WASM for complex edits) |
| OCR | Tesseract.js (lazy-loaded language packs) |
| Local storage | IndexedDB (session recovery, signature library) |
| Hosting | **GitHub (repo) + Vercel (static deploy, free tier)** |
| Backend | **None in v1** (static hosting only) |

---

## 5. What We Don't Do (v1)

- No accounts, sync, or cloud storage integrations
- No AI assistant, Office↔PDF conversion, or share links
- No desktop app, no team features, no API
- No Photoshop-class layout editing

---

## 6. Later (only if users ask)

All optional and still free; if these need a server, it stays minimal (~$5–20/mo):

- Accounts (signature sync across devices)
- Share links (encrypted)
- On-device AI summarization/Q&A (WebGPU)
- Office → PDF conversion

---

## 7. Cost

| Item | Cost |
|---|---|
| GitHub (repo + CI) | ~$0 |
| Vercel hosting (free tier) | ~$0/mo |
| Domain | ~$10/yr (optional; use *.vercel.app free first) |
| Server | $0 (v1) |
| **Total** | **~$0–1/mo** |

---

## 8. Success Metric

**Weekly documents completed** — the tool works when people finish real PDF jobs in the browser.

Targets (12 months): 500K MAU; ≥ 75% of uploads end in a completed download; D7 retention ≥ 25%.

---

## 9. Open Questions

1. Final brand name and domain
2. Whether on-device AI (WebGPU) ships in v1 or later
3. Mobile: responsive web first, native shell later
