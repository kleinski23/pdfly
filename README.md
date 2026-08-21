# PDFly

Free, in-browser PDF editor — nothing uploaded, no accounts, no cost.

- Product doc: [docs/PRD.md](docs/PRD.md)
- Design system: [docs/design.md](docs/design.md)
- Task tracker: [roadmap.md](roadmap.md) — update bars with `bash scripts/update-roadmap.sh`

## Dev

```bash
npm install
npm run dev        # local dev server
npm run typecheck  # TypeScript check
npm run lint       # ESLint
npm run build      # production build
```

Stack: React + TypeScript + Vite. PDF.js, pdf-lib and Tesseract.js arrive with the PDF tools (Phase 1+).
