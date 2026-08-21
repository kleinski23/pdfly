# Deploying PDFly

Everything runs in the browser, so deployment is just static hosting — no server, no database, ~$0/month.

## 1. GitHub

- Repository: `pdfly` (private by default; you can flip it to public anytime — see PRD §13 re: open-source core).
- CI: `.github/workflows/ci.yml` runs lint + typecheck + build on every push/PR.
- Generated files (`test-data/`, `public/tessdata/`) are git-ignored; the language packs are re-downloaded during the Vercel build by `scripts/download-langdata.sh` (cached by Vercel afterwards).

## 2. Vercel (one-time, needs your account)

1. Go to https://vercel.com/new and **Import** the `pdfly` GitHub repository.
2. Vercel auto-detects Vite from `vercel.json`:
   - Build command: `bash scripts/download-langdata.sh && npm run build`
   - Output: `dist`
3. Click **Deploy**. `main` → production; every PR gets a preview URL automatically.
4. Done — the site is live at `https://pdfly.vercel.app`.

Notes:
- The first build downloads ~68 MB of language packs (a few minutes); later builds reuse Vercel's cache.
- Vercel free tier: plenty for this app (no server functions at all).

## 3. Custom domain (optional, ~$10/yr)

1. Buy a domain (e.g. `pdfly.app`) at any registrar.
2. In Vercel: project → **Settings → Domains** → add the domain and follow the DNS instructions (point `@`/`www` to Vercel's `cname.vercel-dns.com`).
3. HTTPS is automatic (Let's Encrypt, renews itself).

## Local commands

```bash
npm run dev        # local dev server
npm run lint / typecheck / build
bash scripts/update-roadmap.sh   # progress tracker
```
