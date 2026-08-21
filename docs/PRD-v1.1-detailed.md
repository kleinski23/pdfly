# PRD — PDFly: Next-Generation Online PDF Editing & E-Signature Platform

| Item | Value |
|---|---|
| Product name (working title) | **PDFly** (replaceable) |
| Document version | v1.1 |
| Status | Draft — pending review |
| Author | Product |
| Date | 2026-08-21 |
| Revision | v1.1: pivoted to **free-only model** — all features free; OCR/AI run client-side; server footprint minimized to accounts/share links only |
| Benchmark competitor | PocketDocs (pocketdocs.app, v0.1.0) |
| Positioning tagline (draft) | *"Edit PDFs like a pro. Privately, instantly, everywhere."* |

---

## 1. Executive Summary

PocketDocs proves the viability of the "process PDFs locally in the browser" model: no uploads, no account, drag-and-drop, privacy as the core selling point. But it is essentially a **collection of 19 independent lightweight utilities** (v0.1.0) with a clear ceiling:

- ❌ **Cannot edit existing text** (only "stamp-on" operations: watermark, page numbers, signatures)
- ❌ No annotation system (no highlight, underline, comments, sticky notes)
- ❌ No form filling or form creation
- ❌ No AI capabilities (summarize, Q&A, data extraction)
- ❌ No accounts / history / cross-device sync; no team collaboration
- ❌ No cloud storage integrations (Drive / Dropbox / OneDrive)
- ❌ No mobile experience; no batch processing (desktop app only planned)
- ❌ No business model *and no path to one* (no accounts, no API, no enterprise story) — sustainability risk

**Our opportunity**: differentiate on four layers — **privacy-first + modern UX + AI augmentation + full editing capability** — and build a platform that can genuinely *edit* PDFs, not just a showcase of tools.

**Value proposition**:
1. **Full editing stack** — text editing, annotations, forms, and e-signature in one workspace;
2. **Privacy-first** — local processing by default (in-browser WASM), files never uploaded; cloud features on-demand with zero-knowledge encryption;
3. **AI-enhanced** — document summarization, Q&A, data extraction, smart forms;
4. **Elegant UX** — single workspace, Cmd+K, unlimited undo, live preview; complete tasks 2× faster than competitors;
5. **Free for everyone, cheap to run** — all features free; client-side processing keeps server costs near zero (~$10–20/mo at MVP scale).

---

## 2. Competitive Analysis

### 2.1 PocketDocs Deep-Dive

**Positioning**: "PDF and image tools that never upload your files" / "Everything runs on your device."
**Model**: 100% in-browser local processing (no upload, no account, no telemetry), free, v0.1.0 (2026).

**Current tool inventory (19 tools)**:

| Category | Tools |
|---|---|
| Compress | Compress PDF |
| Organize | Merge / Split / Organize (reorder·rotate·remove) / Extract Pages |
| Convert | PDF to Image (JPG) |
| Edit | Sign (draw signature) / Watermark / Page Numbers / Crop / Redact / OCR (Make searchable) |
| Protect | Protect (add password) / Unlock / Flatten |
| Image tools | Images to PDF / Convert Image / Optimize Image |

**UX strengths (worth borrowing)**:
- "Drop a file and pick what to do" — single-entry flow, extremely low learning curve;
- ⌘K command palette; light/dark themes;
- No ads, no popups, no upload wait — tools work instantly;
- Minimalist privacy narrative ("Your files never leave your device").

**UX weaknesses (our opportunities)**:
- One file, one tool per session; no continuous workspace workflow (e.g., merge → rotate → sign → compress → download requires 5 separate sessions);
- No undo/redo; no file history;
- No thumbnail-grid organization detail (Organize interaction is basic);
- No help/tutorials, no error recovery, no batch processing;
- Nearly zero brand/SEO content (only Home/About/Privacy/Terms).

**Technical/business weaknesses**:
- No text editing, no annotations, no forms — missing editing capability is the biggest gap;
- No account system → no retention mechanism, no cross-device;
- No business model and no path to one (no accounts/API/enterprise offering); no cost-control plan as features grow;
- Desktop app (Mac, "Soon") roadmap only promises PDF↔Word, better OCR, batch processing — evidence that browser-only is limiting, which we can surpass with a **hybrid architecture** (local + optional server-side).

### 2.2 Market Landscape

| Competitor | Model | Strengths | Weaknesses (our angle) |
|---|---|---|---|
| **PocketDocs** | Local, free | Privacy, simplicity | Shallow features; no editing/forms/AI/collaboration |
| **Smallpdf / iLovePDF** | Cloud freemium | Complete ecosystem, strong brand, huge traffic | Files must be uploaded; privacy concerns; ad/paywall friction |
| **Sejda / PDF24** | Cloud + desktop | Full features, desktop apps | Outdated UX, mediocre performance, no modern AI |
| **Adobe Acrobat** | Desktop/cloud subscription | Strongest features, enterprise standard | Expensive, heavy, steep learning curve, no free local path |
| **DocuSign / SignWell** | E-signature SaaS | Mature signing workflows | Signing only, no other editing; high pricing |

**Differentiation positioning**: *"Acrobat-level editing × PocketDocs-level privacy × modern consumer UX × AI."*

---

## 3. Target Users & Personas

### P1 — Working Professional (Primary)
- **Scenarios**: sign contracts, compress email attachments, merge scans, fill forms, watermark/number reports.
- **Needs**: fast, free, no leaking confidential company files.
- **Example**: "Merge 3 scans into one PDF, sign it, compress under 5MB, and send to the client."

### P2 — Student / Job Seeker (Primary)
- **Scenarios**: PDF→Word to edit resume, JPG→PDF, annotate course materials, split exam banks.
- **Needs**: free, mobile-usable, no signup required.

### P3 — SMB / Freelancer (Secondary)
- **Scenarios**: contract signing workflows (multi-role, signing order), invoice/quote templates, batch-processing scans.
- **Needs**: audit trail, team sharing, compliance.

### P4 — Developer / Enterprise (Tertiary)
- **Scenarios**: embed PDF processing via API into internal systems (expense approval, contract management).
- **Needs**: stability, predictability, compliance.

---

## 4. Scope

### 4.1 MVP Scope (Phase 1–2, ~8 weeks)
Unified workspace + 20 core tools (see §5) + local-processing architecture + responsive web + basic SEO.

### 4.2 Phase 3 (~6 weeks)
Accounts, cloud storage integrations, batch processing, AI assistant, share links, form creation, e-signature workflows.

### 4.3 Phase 4 (~8 weeks)
Team workspaces, API/Webhooks, template library, PWA offline, native mobile shell.

### 4.4 Explicitly Out of Scope
- Photoshop-class layout/typesetting editing (v1)
- Real-time multi-user co-editing (v1)
- Native desktop app (v1; Tauri/Electron to be evaluated later)
- White-label enterprise private deployment (v1)

---

## 5. Functional Requirements

### 5.0 Unified Workspace (platform-level, spans all tools)

| ID | Requirement | Priority |
|---|---|---|
| PLT-001 | **Single file entry**: drag-drop / click / paste / Cmd+V upload; import from URL and cloud drives (Phase 3); multi-file batch import | P0 |
| PLT-002 | **Tool suggestion layer**: after upload, show smart suggestions for what can be done with this file (e.g., scan → OCR/compress; multipage → split; image → JPG to PDF) | P0 |
| PLT-003 | **Workspace layout**: left thumbnail rail (scrollable, multi-select pages), center canvas, right contextual tool panel; panel switches with selected tool/page | P0 |
| PLT-004 | **Unlimited undo/redo** (Ctrl+Z / Ctrl+Shift+Z), session-level | P0 |
| PLT-005 | **⌘K command palette**: search tools, jump to pages, shortcut hints | P1 |
| PLT-006 | **Live preview**: compression levels, filters, watermarks with instant Before/After comparison slider | P0 |
| PLT-007 | **Non-blocking background processing**: Web Worker / WASM; progress bar + cancel for large files | P0 |
| PLT-008 | **Batch processing**: multiple files × same operation (e.g., 50 JPGs → PDF, batch compress) | P1 (basic in MVP) |
| PLT-009 | **Light/dark themes**, responsive (mobile touch optimized) | P1 |
| PLT-010 | **Session recovery**: restore unfinished work after refresh (IndexedDB snapshot) | P1 |

### 5.1 Editing Tools (core differentiation)

| ID | Feature | Detailed Requirements | Priority |
|---|---|---|---|
| EDT-001 | **Text editing** | ① Edit **existing text**: text-layer positioning; modify content, font, size, color, alignment; for non-text-layer PDFs prompt OCR first; ② **Add new text**: text-box tool, insert anywhere; ③ Layout preservation first: default "in-place replacement" (no reflow), with experimental "auto-reflow paragraph" option | P0 |
| EDT-002 | **Annotate & markup** | Highlight, underline, strikethrough, squiggly; sticky notes/comments (reply-able); shapes (rectangle/ellipse/arrow/line/freehand pen); color & opacity; annotation list sidebar (grouped by page, exportable summary) | P0 |
| EDT-003 | **Image editing** | Insert images (drag to canvas, scale/rotate/crop/opacity); replace existing images (click image → replace); extract images (export originals) | P1 |
| EDT-004 | **Form filling** | Auto-detect form fields (highlight fillables); text, checkboxes, radio, dropdown, date; flatten or keep editable after filling; overlay signatures on forms | P0 |
| EDT-005 | **Form creation** | New form from blank/template: drag-drop text fields, checkboxes, radio, dropdown, signature fields; export fillable PDF | P1 |

### 5.2 Signing Tools (second differentiation pillar)

| ID | Feature | Detailed Requirements | Priority |
|---|---|---|---|
| SGN-001 | **Signature creation** | Three methods: draw (touch/mouse), typed signature (multiple handwriting fonts), upload signature image (auto background removal); support **initials** | P0 |
| SGN-002 | **Signature library** | Saved across devices (Phase 3 with accounts); one-click reuse; deletable | P0 |
| SGN-003 | **Signature placement** | Drag to any position; scale/rotate; adjust opacity; batch-place on multiple pages; linked date fields | P0 |
| SGN-004 | **Signing workflow (Phase 3, free)** | Upload contract → assign signers (email) → set signing order → recipient receives link → sign online → both parties receive final version; **audit trail** (who, when, IP, actions); optional certified timestamp | P1 |

### 5.3 Organize & Page Tools

| ID | Feature | Detailed Requirements | Priority |
|---|---|---|---|
| ORG-001 | **Merge PDF** | Drag to reorder; per-file page range selection; mix in images; total page count preview | P0 |
| ORG-002 | **Split PDF** | By page ranges, every N pages, by bookmarks (when present), by max file size; batch download or keep in workspace | P0 |
| ORG-003 | **Organize pages** | Thumbnail grid: drag reorder, rotate (any angle), duplicate, delete, insert blank pages, insert image pages; multi-select batch ops; page-number badges | P0 |
| ORG-004 | **Extract pages** | Select pages → new PDF | P0 |
| ORG-005 | **Rotate** | Standalone tool entry + quick action inside workspace | P0 |

### 5.4 Compression & Optimization

| ID | Feature | Detailed Requirements | Priority |
|---|---|---|---|
| CMP-001 | **Compress PDF** | Three presets (max/recommended/light); per-preset live estimated size & quality comparison; advanced options: image DPI, color space, strip metadata; **target-size mode** ("compress under 5MB") with auto-iteration | P0 |
| CMP-002 | **Optimize image** | JPG/PNG/WebP compression; PNG→WebP conversion suggestion | P1 |
| CMP-003 | **Compression feedback** | Show "12.4MB → 3.1MB (−75%)" on completion; one-click before/after comparison | P0 |

### 5.5 Conversion Tools

| ID | Feature | Detailed Requirements | Priority |
|---|---|---|---|
| CNV-001 | **JPG/PNG/WebP/BMP/TIFF → PDF** | Multi-image batch; per-page settings: orientation, margins, page size (A4/Letter/Auto), quality; sorting | P0 |
| CNV-002 | **PDF → JPG/PNG** | Page range selection; DPI (72–300); quality; export full page or per-image slices | P0 |
| CNV-003 | **PDF → Word** | Layout reconstruction (tables, images, headings); server-side (Phase 3, LibreOffice); free with explicit upload consent; output .docx | P1 |
| CNV-004 | **PDF → Excel** | Table recognition; multi-sheet output | P2 |
| CNV-005 | **PDF → PPT** | One slide per page | P2 |
| CNV-006 | **Office → PDF** | Word/Excel/PPT to PDF (format preservation); server-side (Phase 3) with explicit upload consent | P1 |

### 5.6 Security & Compliance

| ID | Feature | Detailed Requirements | Priority |
|---|---|---|---|
| SEC-001 | **Encrypt PDF** | AES-256 password; permissions (block print/copy/modify); password strength indicator; clear notice that password recovery is impossible | P0 |
| SEC-002 | **Unlock PDF** | Remove restrictions with known password | P0 |
| SEC-003 | **Flatten PDF** | Flatten forms and annotations to prevent tampering | P0 |
| SEC-004 | **Redact** | Text search → mark redactions (multiple instances); rectangle smudge; **true permanent removal** (re-render at layer level, not black overlay — must not be removable); confirmation preview before redaction | P0 |
| SEC-005 | **Digital signature verification** | Read and display existing digital signature info (Phase 3) | P2 |

### 5.7 Smart Tools

| ID | Feature | Detailed Requirements | Priority |
|---|---|---|---|
| AI-001 | **OCR (client-side)** | Multi-language (ZH/EN/DE/FR/ES/JA, etc.); scans → searchable PDF (text layer); plain-text extraction; low-quality photo enhancement (deskew, contrast); per-page progress visualization; language packs lazy-loaded, files never uploaded | P0 |
| AI-002 | **AI assistant (Phase 3, on-device)** | Ask questions about the document ("What are the key obligations in this contract?"); one-click summary; extract tables/key fields (amounts, dates, parties); generate summary page inserted into document; page-cited sources; runs locally via WebGPU small LLM | P1 |
| AI-003 | **Smart naming & classification (Phase 3)** | Suggest file names and tags from content | P2 |

### 5.8 Collaboration & Delivery

| ID | Feature | Detailed Requirements | Priority |
|---|---|---|---|
| COL-001 | **Share links (Phase 3, free)** | Generate links: expiry, password, download/view-only permissions; encrypted server storage; self-destruct on expiry | P1 |
| COL-002 | **Team workspace (Phase 4)** | Folder sharing, member roles (viewer/editor/admin), operation audit logs | P2 |
| COL-003 | **Template library (Phase 4)** | Contracts, NDAs, invoices, resumes, leave requests; one-click fill | P2 |

---

## 6. Key User Flows

### 6.1 Core Flow: Sign a Contract (target: < 90 seconds)
```
Drop contract → smart suggestions (OCR? Sign?) → choose "Sign" → canvas opens
→ create signature (3s hand-draw) → drag to signature line → scale → add date
→ click "Done" → optional: compress → download PDF / generate share link
```

### 6.2 Continuous Workflow (showing "workspace" advantage)
```
Merge 5 files → organize page order/rotate → watermark → page numbers → compress → download
One session throughout; Ctrl+Z undoes any step; live preview at every step.
```

### 6.3 Scan Handling
```
Photo/scan JPG ×10 → batch JPG→PDF → OCR (Chinese) → searchable PDF → compress → share
```

---

## 7. Technical Architecture

### 7.1 Core Principle: **Local-First, Cloud on Demand**

| Processing type | Location | Notes |
|---|---|---|
| Render, compress, merge, split, rotate, crop, watermark, page numbers, sign, annotate, redact, image conversion, **OCR, AI assistant** | **Browser (WASM / WebGPU)** | Privacy selling point + zero server cost; usable offline; OCR via Tesseract.js (v1) → WebGPU models |
| Office→PDF | Server (minimal) | LibreOffice headless; **explicitly ask the user** before uploading (transparent, decline-able) |
| Share links, accounts, signing workflows, teams | Server (minimal) | Encrypted storage, zero-knowledge; deliberately small footprint |

### 7.2 Recommended Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React 18+ / TypeScript / Vite | Mature ecosystem, rich canvas components |
| PDF rendering | PDF.js (Mozilla) | Best rendering quality, largest community |
| PDF editing/generation | pdf-lib + **PDFium WASM** (self-compiled) | pdf-lib lightweight; PDFium for complex edits & flattening |
| Compression | Ghostscript WASM or custom image-resampling pipeline | GS is industry standard; image downsampling delivers ~80% of the effect first |
| OCR | Client: Tesseract.js (v1, lazy-loaded language packs); WebGPU models (Transformers.js / PaddleOCR.js) as upgrade | Zero server cost; near-server quality on WebGPU devices |
| Client AI | WebGPU small LLM via Transformers.js (e.g., Qwen2.5-1.5B / Phi-3-mini class) | Summarize / Q&A on-device; no server LLM in v1 |
| Canvas interaction | Konva.js or custom canvas engine | Signing/annotations/drag |
| Local storage | IndexedDB (session recovery, signature library, batch queue) | |
| Backend | Node.js (NestJS) or Go; SQLite first → PostgreSQL + S3-compatible storage | Minimal footprint: accounts, share links, signing workflows |
| Encryption | AES-256-GCM; TLS 1.3; keys separated from file storage | |
| Deployment | Static CDN (frontend) + containerized API | Global edge for frontend |

### 7.3 Performance Targets

| Metric | Target |
|---|---|
| First interactive load | < 2.5s (4G); WASM engines lazy-loaded on demand |
| Open 100-page / 20MB PDF | < 3s |
| Compress 20MB PDF | < 10s (local) |
| Max file size | 2GB browser-side (streaming); 500MB server-side |
| Interaction responsiveness | Drag/zoom/sign drawing < 16ms frame rate |

### 7.4 Security & Privacy Requirements

1. Local processing: **code-level guarantee that files never leave the device** (no telemetry, no implicit upload); privacy policy and technical documentation public and transparent;
2. Any operation requiring upload (Office→PDF conversion, share links) must **explicitly notify** "file will be sent to the server and deleted within 24 hours after processing";
3. Server-side files AES-256-GCM encrypted; keys separated from storage; share links support expiry/password/revocation;
4. Supply-chain security: pinned dependency versions, traceable WASM binary provenance;
5. Strict CSP to prevent XSS from malicious PDF content;
6. Optional: SOC 2 Type II (Phase 4, Enterprise).

---

## 8. UX & Design Requirements

1. **Three-step principle**: any tool completes in ≤ 3 steps (upload → operate → download); complex tools ship with optimal defaults;
2. **Smart suggestions**: after upload, surface 2–3 most likely actions (based on file type/page count/scan detection), one click to execute;
3. **WYSIWYG**: all operations visible live on the canvas, never a "black-box" (compression excepted, with before/after comparison);
4. **Preview-first**: there is always a "download / continue editing" exit after producing output; large-file compression shows estimated savings;
5. **Keyboard efficiency**: ⌘K, Ctrl+Z, arrow keys for paging, Delete to remove pages, double-click to zoom;
6. **Empty states**: drag-and-drop area with 3-second demo animation on the homepage;
7. **Brand**: modern, trustworthy, uncluttered; primary palette indigo/deep blue + white space, conveying "professional + clean"; more polished than PocketDocs' minimalism;
8. **Accessibility**: WCAG 2.1 AA (full keyboard operation, contrast, screen-reader labels, focus management).

---

## 9. Non-Functional Requirements

| Category | Requirements |
|---|---|
| Compatibility | Chrome/Edge/Firefox/Safari latest 2 major versions; iOS Safari / Android Chrome mobile (touch gestures) |
| Availability | Core tools ≥ 99.9% (static hosting); server features ≥ 99.5% |
| Internationalization | English first; Phase 3: Simplified Chinese, German, French, Spanish, Japanese, Portuguese |
| Observability | Anonymous analytics without document content (tool usage, duration, success rate); error reporting without file content |
| Compliance | GDPR / CCPA; data minimization; no-children statement |

---

## 10. Cost Model & Sustainability (Free-Only)

**Position: 100% of user-facing features are free. No paid tiers, no paywalls, no feature gating.**

### 10.1 Cost Minimization Principles
1. **Client-side by default** — all compute-heavy features (OCR, AI, compression, editing) run in the browser (WASM/WebGPU); zero marginal server cost per user;
2. **Minimal server footprint** — the server exists only for features that require it: accounts, share links, signing workflows, Office→PDF conversion;
3. **Cost ceilings** — target ≤ $20/mo at 10K MAU (small VPS + object storage); re-validated at each phase;
4. **Lazy loading** — WASM engines and OCR language packs load on demand and cache locally (IndexedDB).

### 10.2 Projected Server Costs (MVP scale)

| Item | Est. monthly cost |
|---|---|
| Frontend static hosting (CDN) | ~$0–5 (free tiers) |
| Small VPS (accounts, share links, LibreOffice) | ~$5–10 |
| Object storage (share-link files, encrypted) | ~$0–5 at early scale |
| **Total** | **~$10–20/mo** |

### 10.3 Future Revenue Options (non-gating, later phases)
- Enterprise API / white-label deployment — only if demand emerges;
- Donations / open-source sponsorship;
- None of these block, limit, or degrade free features.

---

## 11. Success Metrics (KPIs)

### 11.1 North Star Metric
**Weekly Documents Completed** — measures whether the tool actually helps users get things done.

### 11.2 Tiered Metrics

| Category | Metric | Target (12 months) |
|---|---|---|
| Growth | MAU / organic search visits | 500K / 1.2M monthly visits |
| Activation | Upload → tool completion rate | ≥ 75% |
| Retention | D7 / D30 retention | 25% / 15% |
| Cost | Server cost at 10K MAU | ≤ $20/mo |
| Quality | Tool success rate (completed without errors) | ≥ 98% |
| Experience | Avg task completion time vs competitors | 2× faster (benchmarked) |
| Advocacy | NPS | ≥ 50 |

---

## 12. Roadmap

| Phase | Timeline | Deliverables | Exit Criteria |
|---|---|---|---|
| **Phase 0 — Foundation** | W1–2 | Design system, scaffolding, upload/workspace skeleton, compress + merge + split + image↔PDF | 4 core tools end-to-end usable |
| **Phase 1 — MVP Core** | W3–5 | Sign, organize pages, rotate, crop, watermark, page numbers, encrypt/unlock/flatten, PDF↔images, undo/redo, basic batch | All 20 tools live; internal beta |
| **Phase 2 — Editing Depth** | W6–8 | Text editing, annotations, form filling, redact, OCR (client-side), performance optimization, mobile adaptation | Public beta; success rate ≥ 95% |
| **Phase 3 — Intelligence & Accounts** | W9–14 | Accounts/sync, cloud drives, AI assistant (on-device), Word/Excel conversion, share links, signing workflows, i18n (ZH/DE/FR/ES/JA) | Accounts, share links & AI live — all free |
| **Phase 4 — Teams & Ecosystem** | W15–22 | Team workspace, template library, API, audit logs, PWA offline | Team workspace & API live (free) |

---

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **PDF format complexity**: text editing/reflow quality varies | High | MVP uses "in-place replacement" to keep layout stable; reflow as experimental feature; build a 500-document regression test set |
| **Browser memory limits**: OOM on huge files | Medium | Streaming load + virtualized thumbnails; guide large files to server-side (transparent notice) |
| **Client-side AI/OCR limits** (WebGPU coverage, model size, accuracy) | Medium | Tesseract.js baseline works on all devices; lazy-loaded language packs; quality pre-processing; WebGPU models as progressive enhancement |
| **Privacy narrative challenged** ("local processing" claim) | High | Open-source core processing libs + public technical whitepaper + auditable builds; explicit consent for any upload path |
| **Big-player competition (Adobe/Google)** | Medium | Enter via "free + privacy + fast" niche; continuous SEO content and tool depth |
| **Supply-chain risk (WASM/libs)** | Medium | Pinned versions, mirrored builds, CVE monitoring |
| **PocketDocs iterating to catch up** | Low-Medium | Our gap is "editing + AI + collaboration + business model", not single tools; build brand and SEO moat fast |
| **No revenue stream** | Medium | Cost-minimal architecture keeps burn near zero; optional enterprise API / donations evaluated in later phases; brand moat via free privacy tools |

---

## 14. Open Questions

1. Brand name (PDFly is a placeholder) and domain;
2. Whether MVP includes an account system (affects signature library & retention design; default: not forced before Phase 3);
3. When to ship WebGPU OCR/AI models (depends on browser coverage; Tesseract.js is the v1 baseline);
4. Default behavior of "text editing" for PDFs without a text layer (force OCR guidance vs text-add only);
5. Whether to ship the template library in v1 (recommended: Phase 4);
6. Mobile priority: responsive web first, native shell later;
7. Future revenue path (enterprise API / donations) — non-gating, only if demand emerges.

---

*This PRD is based on hands-on analysis of pocketdocs.app (v0.1.0) on 2026-08-21. All priorities (P0/P1/P2) should be confirmed in the review meeting.*
