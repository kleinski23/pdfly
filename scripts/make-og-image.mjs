// Renders the social share card (Open Graph / Twitter) to public/og.png.
// The card is drawn with the same INKPRESS vocabulary as the app — newsprint
// paper, halftone dots, heavy ink outlines, hard offset shadows — so a shared
// link looks like the product it points at.
//
// Usage: node scripts/make-og-image.mjs
// Re-run whenever the wording or the brand palette changes; the PNG is
// committed, so the build itself never needs Chrome.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'

const WIDTH = 1200
const HEIGHT = 630

const b64 = (p) => readFileSync(join(root, p)).toString('base64')
const bangers = b64('node_modules/@fontsource/bangers/files/bangers-latin-400-normal.woff2')
const archivo = b64('node_modules/@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2')

const TOOLS = ['Compress', 'Sign', 'Merge', 'Split', 'OCR', 'Edit', 'Convert']

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @font-face {
    font-family: 'Bangers';
    src: url(data:font/woff2;base64,${bangers}) format('woff2');
    font-weight: 400;
  }
  @font-face {
    font-family: 'Archivo';
    src: url(data:font/woff2;base64,${archivo}) format('woff2');
    font-weight: 100 900;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${WIDTH}px; height: ${HEIGHT}px;
    font-family: 'Archivo', system-ui, sans-serif;
    color: #17141b;
    background: #fff6e5;
    /* halftone plate */
    background-image: radial-gradient(rgba(23,20,27,0.14) 1.6px, transparent 1.7px);
    background-size: 16px 16px;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .card {
    width: 1112px; height: 542px;
    background: #ffffff;
    border: 6px solid #17141b;
    border-radius: 26px;
    box-shadow: 14px 14px 0 #17141b;
    padding: 46px 52px;
    display: flex; flex-direction: column; gap: 26px;
    position: relative; overflow: hidden;
  }
  .kicker {
    display: inline-flex; align-items: center; gap: 12px;
    align-self: flex-start;
    background: #ffc803;
    border: 4px solid #17141b;
    border-radius: 999px;
    box-shadow: 5px 5px 0 #17141b;
    padding: 9px 22px;
    font-size: 21px; font-weight: 800;
    letter-spacing: 0.10em; text-transform: uppercase;
  }
  h1 {
    font-family: 'Bangers', sans-serif;
    font-weight: 400;
    font-size: 116px;
    line-height: 0.92;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
  h1 em { font-style: normal; color: #2b44ff; }
  .sub {
    font-size: 27px; font-weight: 600; line-height: 1.34;
    color: #56505f; max-width: 900px;
  }
  .tools { display: flex; flex-wrap: nowrap; gap: 10px; margin-top: auto; }
  .tool {
    border: 3px solid #17141b;
    border-radius: 9px;
    box-shadow: 3px 3px 0 #17141b;
    padding: 7px 14px;
    font-size: 19px; font-weight: 800; white-space: nowrap;
    letter-spacing: 0.04em; text-transform: uppercase;
    background: #fff0d2;
  }
  .tool:nth-child(5n+1) { background: #ffc803; }
  .tool:nth-child(5n+2) { background: #ff4fa3; }
  .tool:nth-child(5n+3) { background: #00a68f; }
  .tool:nth-child(5n+4) { background: #2b44ff; color: #fff; }
  .row { display: flex; align-items: center; justify-content: space-between; gap: 32px; }
  .mark {
    flex: none;
    width: 126px; height: 126px;
    background: #ffc803;
    border: 6px solid #17141b;
    border-radius: 30px;
    box-shadow: 7px 7px 0 #17141b;
    display: grid; place-items: center;
    transform: rotate(4deg);
  }
</style>
</head>
<body>
  <div class="card">
    <span class="kicker">Free · No upload · No account</span>
    <div class="row">
      <div>
        <h1>Edit PDFs<br />like a <em>pro</em></h1>
      </div>
      <div class="mark">
        <svg width="76" height="76" viewBox="0 0 32 32" fill="none"
             stroke="#17141b" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7.4 24.6l1-4.4L19.6 8.9c.6-.6 1.6-.6 2.2 0l2.2 2.2c.6.6.6 1.6 0 2.2L12.8 24.6l-5.4 0Z" />
          <path d="M18.4 10.1l3.4 3.4" />
        </svg>
      </div>
    </div>
    <p class="sub">
      Compress, sign, merge, split, OCR and convert — right in your browser.
      Your files never leave your device.
    </p>
    <div class="tools">
      ${TOOLS.map((t) => `<span class="tool">${t}</span>`).join('\n      ')}
    </div>
  </div>
</body>
</html>`

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-first-run', '--hide-scrollbars'],
})
try {
  const page = await browser.newPage()
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 })
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluateHandle('document.fonts.ready')
  const png = await page.screenshot({ type: 'png' })
  const out = join(root, 'public', 'og.png')
  writeFileSync(out, png)
  console.log(`✅ wrote ${out} (${WIDTH}×${HEIGHT}, ${(png.length / 1024).toFixed(1)} kB)`)
} finally {
  await browser.close()
}
