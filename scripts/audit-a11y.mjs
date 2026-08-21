// WCAG 2.1 AA audit via axe-core against the running dev server.
// Usage: npm run dev (default port 5173), then: node scripts/audit-a11y.mjs
// Results are written to scripts/audit-results/*.json; exit code 1 when
// any violation is found (use with --allow-issues to always exit 0).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.AUDIT_URL || 'http://localhost:5173/';
const ALLOW_ISSUES = process.argv.includes('--allow-issues');
const THEME = process.argv.includes('--light')
  ? 'light'
  : process.argv.includes('--dark')
    ? 'dark'
    : process.argv.includes('--both')
      ? 'both'
      : process.env.AUDIT_THEME || 'dark';
const OUT_DIR = join(__dirname, 'audit-results');
const axeSource = readFileSync(join(__dirname, '..', 'node_modules', 'axe-core', 'axe.min.js'), 'utf8');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function summarize(name, results) {
  const v = results.violations;
  console.log(`\n=== ${name} ===`);
  if (v.length === 0) {
    console.log('  ✅ no violations');
    return 0;
  }
  for (const item of v) {
    console.log(
      `  ❌ ${item.id} [${item.impact ?? '?'}] ×${item.nodes.length} — ${item.help}`
    );
    for (const n of item.nodes.slice(0, 5)) {
      console.log(`      - ${n.target.join(' ')} | ${n.failureSummary?.split('\n')[0] ?? ''}`);
    }
  }
  return v.length;
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  // pdf.js page rendering stalls in headless Chrome on some machines; headed is reliable.
  headless: false,
  args: ['--window-size=1440,900', '--no-first-run'],
});
let failures = 0;

const THEMES = THEME === 'both' ? ['dark', 'light'] : [THEME];
for (const theme of THEMES) {
  console.log(`\n########## theme: ${theme} ##########`);
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(60000);
    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`console: ${m.text()}`);
    });

    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(
      () => document.querySelector('.demo') !== null || document.querySelector('canvas') !== null,
      { timeout: 30000 }
    );
    await sleep(500); // let the first mount's theme effect settle before overriding
    // Session recovery (IndexedDB 'pdfly') would skip the landing page on reload;
    // wipe it so every run audits the landing, then set the theme.
    await page.evaluate(() => new Promise((res) => {
      const r = indexedDB.deleteDatabase('pdfly');
      r.onsuccess = r.onerror = r.onblocked = () => res();
    }));
    await page.evaluate((t) => localStorage.setItem('pdfly-theme', t), theme);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => document.querySelector('.demo') !== null, { timeout: 30000 });
    await sleep(1200);
    await page.addScriptTag({ content: axeSource });

  const runAxe = async () => {
    return page.evaluate(async () => {
      const res = await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
      });
      return res;
    });
  };

  // 1) Landing page
  const landing = await runAxe();
  failures += summarize(`landing (${theme})`, landing);
  writeFileSync(join(OUT_DIR, `landing-${theme}.json`), JSON.stringify(landing, null, 2));

  // 1b) Keyboard probe: Tab focus visibility on the landing page
  await page.keyboard.press('Tab');
  const focusProbe = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return 'no focusable element';
    const s = getComputedStyle(el);
    return `${el.tagName.toLowerCase()}.${el.className} outline:${s.outlineStyle} ${s.outlineWidth} boxShadow:${s.boxShadow}`;
  });
  console.log(`  ⌨️  focus probe: ${focusProbe}`);

  // 2) Load a small PDF → workspace
  const input = await page.$('input[type="file"]');
  if (!input) throw new Error('file input not found');
  await input.uploadFile(join(__dirname, '..', 'test-data', 'sample-a.pdf'));
  await page.waitForSelector('canvas', { timeout: 60000 });
  await sleep(2500); // let pdf.js finish first render
  const workspace = await runAxe();
  failures += summarize(`workspace (${theme})`, workspace);
  writeFileSync(join(OUT_DIR, `workspace-${theme}.json`), JSON.stringify(workspace, null, 2));

  // 2b) Command palette (Ctrl+K)
  await page.keyboard.down('Control');
  await page.keyboard.press('k');
  await page.keyboard.up('Control');
  await page.waitForSelector('.palette', { timeout: 10000 });
  await sleep(400);
  const palette = await runAxe();
  failures += summarize(`command palette (${theme})`, palette);
  writeFileSync(join(OUT_DIR, `palette-${theme}.json`), JSON.stringify(palette, null, 2));
  await page.keyboard.press('Escape');
  await sleep(300);

  // 2c) Signature modal: Edit tool → Sign mode → Create signature
  const clickByText = async (scope, text) => {
    const clicked = await page.$$eval(scope, (els, t) => {
      const el = els.find((e) => e.textContent.trim() === t);
      if (el) {
        el.click();
        return true;
      }
      return false;
    }, text);
    if (!clicked) throw new Error(`button "${text}" not found in ${scope}`);
  };
  await clickByText('.toolpanel .tool-list button', 'Edit');
  await sleep(300);
  await clickByText('.toolpanel .tool .mode-grid button', 'Sign');
  await sleep(300);
  await clickByText('.toolpanel .tool button', 'Create signature');
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
  await sleep(600);
  const sigModal = await runAxe();
  failures += summarize(`signature modal (${theme})`, sigModal);
  writeFileSync(join(OUT_DIR, `sigmodal-${theme}.json`), JSON.stringify(sigModal, null, 2));
  await page.click('.modal-backdrop', { position: { x: 8, y: 8 } }).catch(() => {});
  await sleep(300);

  // 3) Console errors observed
  const unique = [...new Set(errors)];
  if (unique.length) {
    console.log(`\n=== console/page errors (${theme}, ${unique.length}) ===`);
    for (const e of unique.slice(0, 20)) console.log(`  - ${e}`);
  }
  await page.close();
  } catch (err) {
    console.error(`AUDIT FAILED (${theme}):`, err.message);
    process.exitCode = 2;
  }
}
await browser.close();

console.log(`\n${failures > 0 ? '❌' : '✅'} total violation groups: ${failures}`);
if (!ALLOW_ISSUES && process.exitCode !== 2) process.exitCode = failures > 0 ? 1 : 0;
