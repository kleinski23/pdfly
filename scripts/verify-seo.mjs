// SEO sanity checks — run with: node scripts/verify-seo.mjs
//
// Structured data only helps if it is valid and if it describes what is actually
// on the page: Google penalises FAQ markup whose answers are not visible. The
// FAQ copy therefore lives in two places (src/pages/Home.tsx renders it,
// index.html declares it), and this script fails the build if they drift apart.
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8')

let failures = 0
const ok = (msg) => console.log(`  ✅ ${msg}`)
const fail = (msg) => {
  console.log(`  ❌ ${msg}`)
  failures++
}

const html = read('index.html')

// ---------------------------------------------------------------- meta tags
console.log('\n=== meta tags ===')
const REQUIRED_META = [
  ['canonical', /<link rel="canonical" href="([^"]+)"/],
  ['title', /<title>([^<]+)<\/title>/],
  ['description', /<meta\s+name="description"\s+content="([^"]+)"/],
  ['robots', /<meta name="robots" content="([^"]+)"/],
  ['og:type', /<meta property="og:type" content="([^"]+)"/],
  ['og:url', /<meta property="og:url" content="([^"]+)"/],
  ['og:title', /<meta property="og:title" content="([^"]+)"/],
  ['og:description', /<meta\s+property="og:description"\s+content="([^"]+)"/],
  ['og:image', /<meta property="og:image" content="([^"]+)"/],
  ['og:image:width', /<meta property="og:image:width" content="([^"]+)"/],
  ['og:image:height', /<meta property="og:image:height" content="([^"]+)"/],
  ['og:image:alt', /<meta\s+property="og:image:alt"\s+content="([^"]+)"/],
  ['twitter:card', /<meta name="twitter:card" content="([^"]+)"/],
  ['twitter:title', /<meta name="twitter:title" content="([^"]+)"/],
  ['twitter:image', /<meta name="twitter:image" content="([^"]+)"/],
]
for (const [name, re] of REQUIRED_META) {
  const m = html.match(re)
  if (!m) fail(`missing ${name}`)
  else ok(`${name} — ${m[1].length > 72 ? m[1].slice(0, 69) + '…' : m[1]}`)
}

// Search engines truncate past roughly these lengths.
const title = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? ''
const desc = html.match(/<meta\s+name="description"\s+content="([^"]+)"/)?.[1] ?? ''
if (title.length > 60) fail(`title is ${title.length} chars (aim for ≤ 60)`)
else ok(`title length ${title.length} ≤ 60`)
if (desc.length < 110 || desc.length > 165) fail(`description is ${desc.length} chars (aim 110–165)`)
else ok(`description length ${desc.length} in 110–165`)

// -------------------------------------------------------------- crawl files
console.log('\n=== crawl files ===')
for (const f of ['public/robots.txt', 'public/sitemap.xml', 'public/og.png']) {
  if (existsSync(join(root, f))) ok(`${f} present`)
  else fail(`${f} missing`)
}

const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? ''
const origin = canonical.replace(/\/$/, '')
const robots = read('public/robots.txt')
const sitemap = read('public/sitemap.xml')
if (robots.includes(`${origin}/sitemap.xml`)) ok('robots.txt points at the canonical sitemap')
else fail(`robots.txt sitemap URL does not match canonical origin ${origin}`)
if (sitemap.includes(canonical)) ok('sitemap <loc> matches the canonical URL')
else fail(`sitemap <loc> does not match canonical ${canonical}`)

for (const [label, re] of [
  ['og:image', /<meta property="og:image" content="([^"]+)"/],
  ['twitter:image', /<meta name="twitter:image" content="([^"]+)"/],
]) {
  const url = html.match(re)?.[1] ?? ''
  if (url.startsWith(origin + '/')) ok(`${label} is an absolute URL on the canonical origin`)
  else fail(`${label} must be absolute and on ${origin} (got "${url}")`)
}

// ------------------------------------------------------------ structured data
console.log('\n=== structured data ===')
const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
if (blocks.length === 0) fail('no JSON-LD blocks found')

const parsed = []
for (const [i, b] of blocks.entries()) {
  try {
    parsed.push(JSON.parse(b[1]))
    ok(`JSON-LD block ${i + 1} parses`)
  } catch (e) {
    fail(`JSON-LD block ${i + 1} is invalid JSON — ${e.message}`)
  }
}
for (const type of ['WebApplication', 'FAQPage']) {
  if (parsed.some((p) => p['@type'] === type)) ok(`${type} present`)
  else fail(`${type} missing`)
}

// ------------------------------------------------ FAQ parity with the page
console.log('\n=== FAQ parity (JSON-LD vs rendered page) ===')
const faqLd = parsed.find((p) => p['@type'] === 'FAQPage')
if (!faqLd) {
  fail('no FAQPage to compare')
} else {
  const home = read('src/pages/Home.tsx')
  const arr = home.slice(home.indexOf('const FAQS'), home.indexOf('export function Home'))
  // The copy is single-quoted TS string literals; unescape \' back to '.
  const grab = (key) =>
    [...arr.matchAll(new RegExp(String.raw`^\s*${key}: '((?:[^'\\]|\\.)*)',\s*$`, 'gm'))].map((m) =>
      m[1].replace(/\\'/g, "'"),
    )
  const qs = grab('q')
  const as = grab('a')

  if (qs.length === 0) fail('could not read the FAQS array from src/pages/Home.tsx')
  else if (qs.length !== faqLd.mainEntity.length) {
    fail(`page has ${qs.length} FAQ entries, JSON-LD has ${faqLd.mainEntity.length}`)
  } else {
    let drift = 0
    faqLd.mainEntity.forEach((entry, i) => {
      if (entry.name !== qs[i]) {
        fail(`Q${i + 1} differs\n       page: ${qs[i]}\n       ld  : ${entry.name}`)
        drift++
      }
      if (entry.acceptedAnswer.text !== as[i]) {
        fail(`A${i + 1} differs\n       page: ${as[i]}\n       ld  : ${entry.acceptedAnswer.text}`)
        drift++
      }
    })
    if (drift === 0) ok(`all ${qs.length} questions and answers match the visible page text`)
  }
}

console.log(
  failures === 0
    ? '\n✅ SEO checks passed\n'
    : `\n❌ ${failures} SEO check${failures === 1 ? '' : 's'} failed\n`,
)
process.exit(failures === 0 ? 0 : 1)
