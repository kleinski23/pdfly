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
4. **Update the canonical host in three files**, then re-deploy:
   - `index.html` — `<link rel="canonical">`, `og:url`, `og:image`, `twitter:image`, and the `url` in the WebApplication JSON-LD
   - `public/robots.txt` — the `Sitemap:` line
   - `public/sitemap.xml` — the `<loc>` (and bump `<lastmod>`)

   `npm run verify:seo` fails if those three drift apart, so run it before pushing.

## 4. SEO assets

- `npm run verify:seo` — checks meta tags, title/description length, canonical/robots/sitemap agreement, JSON-LD validity, and that the FAQ structured data still matches the questions rendered on the page. Runs in CI.
- `npm run og:image` — regenerates `public/og.png` (1200×630 social card) from `scripts/make-og-image.mjs`. Needs local Chrome (`CHROME_PATH` to override). The PNG is committed, so the Vercel build never needs Chrome — only re-run it when the wording or brand palette changes.
- After the first deploy, sanity-check the card with the [Facebook sharing debugger](https://developers.facebook.com/tools/debug/) and submit the sitemap in [Google Search Console](https://search.google.com/search-console).

## Local commands

```bash
npm run dev        # local dev server
npm run lint / typecheck / build
bash scripts/update-roadmap.sh   # progress tracker
```
