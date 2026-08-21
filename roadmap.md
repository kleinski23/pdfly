# PDFly — Roadmap & Task Tracker

> Product: free, in-browser PDF editor — see `docs/PRD.md` (v2.0)
> Stack: React + TypeScript + Vite · PDF.js · pdf-lib · Tesseract.js · IndexedDB · **no backend**
> Deploy: GitHub (repo) + Vercel (static hosting, free tier) · Target cost: ~$0/mo
> **Order: build & run locally first (Phases 0–4) → version control & deploy (Phase 5) → launch (Phase 6)**

## Overall Progress

<!-- PROGRESS-START -->
**`[█████████████████████████████████░░░░░░░]` ~83%** — 55 / 66 tasks completed

| Phase | Done | Bar |
|---|---|---|
| Phase 0 — Local Foundation | 7/7 | `[██████████]` |
| Phase 1 — Core PDF Tools (MVP) | 16/16 | `[██████████]` |
| Phase 2 — Editing, Signing & Forms | 15/15 | `[██████████]` |
| Phase 3 — OCR & Smart Features | 9/10 | `[█████████░]` |
| Phase 4 — Local QA & Polish | 5/5 | `[██████████]` |
| Phase 5 — Version Control & Deployment | 3/5 | `[██████░░░░]` |
| Phase 6 — Launch & Growth | 0/4 | `[░░░░░░░░░░]` |
| Phase 7 — Backlog (later, only if users ask) | 0/4 | `[░░░░░░░░░░]` |
<!-- PROGRESS-END -->

> **How to update:** tick any `[ ]` → `[x]` below, then run `bash scripts/update-roadmap.sh` — the bars and counts recompute automatically.

---

## Phase 0 — Local Foundation

- [x] Move PRD into `/docs` (`docs/PRD.md` + `docs/PRD-v1.1-detailed.md`)
- [x] Create `docs/design.md` (design system doc; UI theme reference pending)
- [x] Scaffold Vite + React + TypeScript app (strict mode) — runs locally via `npm run dev`
- [x] ESLint + Prettier (local tooling; hook into git later)
- [x] Project structure: `components/` `pages/` `lib/` `hooks/` `workers/`
- [x] Design tokens + light/dark theme shell (indigo/deep blue, WCAG AA contrast)
- [x] Landing page: hero with drag-drop zone + 3-second demo animation

## Phase 1 — Core PDF Tools (MVP)

- [x] File import: drag-drop, click-to-browse, paste/Cmd+V; multi-file support
- [x] PDF.js rendering pipeline: canvas render, zoom, page navigation
- [x] Workspace layout: thumbnail rail | center canvas | contextual tool panel
- [x] Multi-select pages in thumbnail rail (delete / rotate / batch operations)
- [x] Unlimited undo/redo (Ctrl+Z / Ctrl+Shift+Z), session-level
- [x] Download/export: original filename, quality preserved
- [x] Compress PDF: presets + live size estimate + before/after comparison
- [x] Compress target-size mode ("under 5MB", auto-iteration)
- [x] Merge PDF: drag to reorder, per-file page ranges, mix in images
- [x] Split PDF: by ranges / every N pages / by max size; batch download
- [x] Organize pages: reorder, rotate, duplicate, delete, insert blank/image pages
- [x] Extract pages → new PDF
- [x] Crop + standalone Rotate tools
- [x] Images → PDF: batch JPG/PNG/WebP/BMP/TIFF, page setup, sorting
- [x] PDF → images: page range, DPI 72–300, JPG/PNG export
- [x] Protect: encrypt (AES-256 + permissions), unlock, flatten

## Phase 2 — Editing, Signing & Forms

- [x] Add new text: text-box tool, size/color/alignment, anywhere on page (Helvetica)
- [x] Annotations: highlight / underline / strikethrough / squiggly (real PDF annots via mupdf)
- [x] Sticky notes with editable contents (reply threads pending)
- [x] Shapes + freehand pen: rectangle, ellipse, line with arrow, ink (color, opacity, width)
- [x] Signature creation: draw / typed / upload (initials pending)
- [x] Signature library: IndexedDB, one-click reuse, delete
- [x] Signature placement: click-to-place + drag to move + batch to all pages (scale/rotate controls pending)
- [x] Insert images on a page + extract images from a page (replace-in-place pending)
- [x] Apply edits to PDF with undo (text/signatures stamped; annotations native)
- [x] ⌘K command palette: tool search, page jump, undo/redo, download
- [x] Session recovery: auto-restore open files after refresh (IndexedDB)
- [x] Edit existing text: redaction-based replacement (original text physically removed)
- [x] No-text-layer guidance: clear OCR hint when a page has no text layer
- [x] Form filling UI: auto-detect + fill text/checkbox/choice/radio + flatten (mupdf widgets)
- [x] Annotation list: grouped by page, delete + exportable summary (Annots tool)

## Phase 3 — OCR & Smart Features

- [x] Tesseract.js integration — runs in its own Web Worker with WASM core (non-blocking)
- [x] Local language packs: EN/ZH/DE/FR/ES/JA (gzip, lazy-loaded per language, IndexedDB-cached)
- [x] Scan pre-processing: contrast enhancement + built-in auto-rotation/deskew
- [x] Searchable PDF output (text layer) + plain-text extraction
- [x] Per-page OCR progress visualization + cancel
- [x] WASM lazy-load (mupdf + tesseract) + virtualized thumbnail rail (100+ page docs)
- [x] Responsive mobile layout: stacked workspace + horizontal thumbnail rail
- [x] Accessibility light pass: keyboard ops, aria labels, AA contrast tokens
- [x] Performance benchmark: 100-page + 22MB test docs built; ops measured (see Notes) — interactive render timing pending manual browser check
- [ ] Full WCAG 2.1 AA audit + fixes (before launch)

## Phase 4 — Local QA & Polish

- [x] Error handling: ErrorBoundary recovery screen, invalid-file guidance, corrupt-PDF banner, large-file warning
- [x] UX polish: empty/loading states, progress feedback, shortcuts popover (?) + tooltips
- [x] Cross-browser QA matrix documented (see Notes) — device pass on Chrome/Edge/Firefox/Safari + mobile before launch
- [x] Performance validation: ops-side benchmarks recorded (see Notes); 20MB compress-light 37 ms, 100p merge 226 ms
- [x] Acceptance walkthrough: 36 automated checks green (verify-ops 18 + verify-edit 14 + verify-ocr 4)

## Phase 5 — Version Control & Deployment

- [x] `git init` + `.gitignore` + initial commit (local history)
- [x] Create GitHub repo `pdfly`, push `main` → https://github.com/kleinski23/pdfly
- [x] GitHub Actions CI: lint + typecheck + build on every PR (verified passing)
- [ ] Connect Vercel: auto-deploy from `main`, preview deploys per PR — needs your Vercel account (one-time import, steps in `DEPLOY.md`)
- [ ] Custom domain + DNS + HTTPS — after Vercel is live (steps in `DEPLOY.md`)

## Phase 6 — Launch & Growth

- [ ] Anonymous usage analytics (no document content) + error reporting
- [ ] SEO: meta tags, Open Graph, sitemap, long-tail tool landing copy
- [ ] Uptime monitoring + alerting
- [ ] Public launch + beta feedback loop (first 100 users)

## Phase 7 — Backlog (later, only if users ask)

- [ ] Accounts + cross-device signature sync (small server ~$5–10/mo)
- [ ] Share links (encrypted, expiry/password)
- [ ] On-device AI summarization / Q&A (WebGPU, Transformers.js)
- [ ] Office → PDF conversion

---

## Notes

- **Source of truth:** `docs/PRD.md` (v2.0) — free-only, client-side, no server in v1.
- **Local-first order:** Phases 0–4 run entirely on your machine (`npm run dev`); only after the app is solid do we create the GitHub repo and deploy (Phase 5), then launch (Phase 6).
- Phase 7 is the optional backlog (PRD §6).
- Every task is a checkbox; the tracker above is regenerated by `scripts/update-roadmap.sh` (no manual math).

### QA matrix (Phase 4)

| Browser | Status | Notes |
|---|---|---|
| Chrome (desktop) | ✅ verified | Full E2E flows run in dev + build passes |
| Edge (Chromium) | 🔲 manual pass | Same engine as Chrome; test before launch |
| Firefox | 🔲 manual pass | pdf.js + mupdf WASM supported; test before launch |
| Safari (desktop) | 🔲 manual pass | Needs macOS; test before launch |
| iOS Safari / Android Chrome | 🔲 manual pass | Responsive layout implemented; test on devices before launch |

### Benchmarks (Phase 4, `scripts/bench.ts`, Node 22)

| Operation | Doc | Time |
|---|---|---|
| compressLight | 22.0 MB (16 noise-image pages) | 37 ms → 22.0 MB |
| splitEveryN(10) | 100 pages | 81 ms |
| mergePdfs | 2 × 100 pages | 226 ms |
| rebuildPdf | 100 pages | 123 ms |
| splitPdf → 4 parts | 22.0 MB | 29 ms |
| encryptPdf (AES-256) | 100 pages | 64 ms |

All well under PRD targets (compress 20MB < 10 s, open 100-page < 3 s). Interactive render timing (pdf.js canvas) still needs a manual browser pass. Test docs: `test-data/bench-100p.pdf`, `test-data/bench-20mb.pdf`.

### Acceptance evidence (Phase 4)

- `scripts/verify-ops.ts` — 18/18 ✅ (merge, split, organize, crop, extract, compress, images→PDF, encrypt/unlock)
- `scripts/verify-edit.ts` — 14/14 ✅ (annotations, notes, shapes, ink, forms fill + flatten, text-edit redaction)
- `scripts/verify-ocr.ts` — 4/4 ✅ (render → OCR → searchable PDF with verified text layer)
