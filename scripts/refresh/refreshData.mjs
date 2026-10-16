// Refresh school data from official sources, with a check on every figure.
//
//   ANTHROPIC_API_KEY=... node scripts/refresh/refreshData.mjs --schools pilot
//   ANTHROPIC_API_KEY=... node scripts/refresh/refreshData.mjs --schools harvard-hbs,yale-som
//   ANTHROPIC_API_KEY=... node scripts/refresh/refreshData.mjs --schools all
//
// Steps per school:
//   1. Find:    Claude searches ONLY the school's own website for current figures.
//   2. Extract: it reports each value with a source URL, the exact sentence, and the year it covers.
//   3. Verify:  code downloads the source page and checks the sentence is there and contains the value,
//               then runs range checks. Anything that fails is reported, never applied.
//   4. Output:  data/refresh/<date>/report.md (for people) and changes.json (for applyRefresh.mjs).
// Nothing in data/mba_schools_data.json changes until applyRefresh.mjs runs.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const DATA = JSON.parse(readFileSync(join(ROOT, 'data', 'mba_schools_data.json'), 'utf8'))
const MODEL = process.env.REFRESH_MODEL || 'claude-sonnet-5-5'
const TODAY = new Date().toISOString().slice(0, 10)

export const PILOT = ['harvard-hbs', 'stanford-gsb', 'wharton-penn', 'booth-chicago', 'kellogg-northwestern',
  'sloan-mit', 'columbia-cbs', 'nc-at-deese', 'foster-uw', 'georgia-tech-scheller']

// ---------------------------------------------------------------------------
// Fields we refresh, where they live in the record, and what a sane value looks like
// ---------------------------------------------------------------------------
export const FIELDS = {
  class_size:            { path: ['classProfile', 'size'],                    kind: 'number', min: 10,    max: 1200 },
  avg_work_experience:   { path: ['classProfile', 'avgWorkExperience'],       kind: 'number', min: 1,     max: 10 },
  avg_gmat:              { path: ['classProfile', 'avgGMAT'],                 kind: 'gmat',   min: 450,   max: 805 },
  avg_gre_total:         { path: ['classProfile', 'avgGRE'],                  kind: 'number', min: 280,   max: 340 },
  international_pct:     { path: ['classProfile', 'internationalStudentPct'], kind: 'number', min: 1,     max: 90 },
  women_pct:             { path: ['classProfile', 'womenPercentage'],         kind: 'number', min: 10,    max: 70 },
  annual_tuition:        { path: ['costs', 'annualTuition'],                  kind: 'money',  min: 8000,  max: 120000 },
  employed_3_months_pct: { path: ['employment', 'employmentRate3Months'],     kind: 'number', min: 40,    max: 100 },
  starting_salary:       { path: ['employment', 'avgStartingSalary'],         kind: 'money',  min: 40000, max: 250000 },
  signing_bonus:         { path: ['employment', 'medianSigningBonus'],        kind: 'money',  min: 1000,  max: 80000 },
  deadline_round1:       { path: ['applicationInfo', 'deadlines', 'round1', 'deadline'], kind: 'date' },
  deadline_round2:       { path: ['applicationInfo', 'deadlines', 'round2', 'deadline'], kind: 'date' },
  deadline_round3:       { path: ['applicationInfo', 'deadlines', 'round3', 'deadline'], kind: 'date' },
}

export const getPath = (obj, path) => path.reduce((o, k) => (o == null ? undefined : o[k]), obj)

// ---------------------------------------------------------------------------
// Step 1–2: find and extract with Claude + web search (school's own domain only)
// ---------------------------------------------------------------------------

export function schoolDomains(school) {
  const urls = [school.website, school.programUrl].filter(Boolean)
  const hosts = new Set()
  for (const u of urls) {
    try {
      const h = new URL(u).hostname.replace(/^www\./, '')
      hosts.add(h)
      hosts.add(h.split('.').slice(-2).join('.')) // the university's root domain, e.g. mit.edu
    } catch { /* skip */ }
  }
  return [...hosts]
}

const REPORT_TOOL = {
  name: 'report_values',
  description: 'Report the figures you found. Call this exactly once, at the end.',
  input_schema: {
    type: 'object',
    properties: {
      values: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string', enum: Object.keys(FIELDS) },
            value: { type: ['number', 'string'], description: 'Number as a plain number (75000, not "$75K"). Dates as YYYY-MM-DD.' },
            source_url: { type: 'string', description: 'The exact page or PDF the value came from.' },
            quote: { type: 'string', description: 'The exact sentence or table row from that page that contains the value, copied verbatim (max ~30 words).' },
            as_of: { type: 'string', description: 'What the figure covers, e.g. "Class of 2028 profile", "Class of 2025 employment report", "2026-27 tuition", "2026-27 application cycle".' },
            note: { type: 'string', description: 'Optional: e.g. "median, not mean", "GMAT Focus scale", "first-year tuition only".' },
            gmat_scale: { type: 'string', enum: ['focus', 'classic', 'n/a'], description: 'For avg_gmat only: which GMAT version the school reports.' },
          },
          required: ['field', 'value', 'source_url', 'quote', 'as_of'],
        },
      },
      not_found: { type: 'array', items: { type: 'string', enum: Object.keys(FIELDS) }, description: 'Fields you could not find on official pages.' },
    },
    required: ['values', 'not_found'],
  },
}

function buildPrompt(school, wantDeadlines) {
  const fields = Object.keys(FIELDS).filter(f => wantDeadlines || !f.startsWith('deadline_'))
  return `Find the most recent official figures for this full-time MBA program, using only the school's own website.

PROGRAM: ${school.name} (${school.university})
Program page: ${school.programUrl}
Today: ${TODAY}

Fields to find: ${fields.join(', ')}

Rules:
- Use the newest class profile (incoming class) and the newest full-time MBA employment report the school has published.
- starting_salary: MEDIAN full-time MBA base salary from the newest employment report. If only a mean is published, use it and write "mean" in note.
- signing_bonus: MEDIAN signing bonus only. Never report a mean here.
- employed_3_months_pct: share of job-seeking graduates who ACCEPTED an offer within three months of graduation. If the school only reports offers received, use that and write "received, not accepted" in note.
- Only exact published figures. Skip anything written as approximate ("about", "approximately", "~", "nearly", "$144k+"); put the field in not_found instead.
- as_of must name the class year or academic year (e.g. "Class of 2027 profile"). If the page doesn't say which year a figure covers, put the field in not_found.
- avg_gmat: report the number as published and set gmat_scale ("focus" if 205–805 GMAT Focus Edition, "classic" if the old 200–800 test). Do not convert.
- avg_gre_total: the total score (260–340). If only Verbal and Quant averages are given, add them, and put both numbers in the quote.
- annual_tuition: first-year tuition for the full-time MBA only, not total cost of attendance.
${wantDeadlines ? '- deadline_round1..3: deadlines for the application cycle that is open now or opens next.\n' : ''}- The quote must be copied exactly from the source page and must contain the number or date.
- If a figure is not on an official page, put it in not_found. Do not estimate, and do not use third-party sites.
- When done, call report_values once.`
}

async function callApi(body, apiKey) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(body),
    })
    if (res.status === 429 || res.status >= 500) { await new Promise(r => setTimeout(r, 4000 * (attempt + 1))); continue }
    const json = await res.json()
    if (!res.ok) throw new Error(`API ${res.status}: ${json.error?.message || 'error'}`)
    return json
  }
  throw new Error('API kept failing after retries')
}

export async function extractSchool(school, apiKey) {
  const wantDeadlines = !!school.applicationInfo?.deadlines
  const tools = [
    { type: 'web_search_20250305', name: 'web_search', max_uses: Number(process.env.REFRESH_MAX_SEARCHES || 6), allowed_domains: schoolDomains(school) },
    REPORT_TOOL,
  ]
  const messages = [{ role: 'user', content: buildPrompt(school, wantDeadlines) }]
  const usage = { input_tokens: 0, output_tokens: 0, searches: 0 }

  for (let turn = 0; turn < 6; turn++) {
    const resp = await callApi({ model: MODEL, max_tokens: 4000, tools, messages }, apiKey)
    usage.input_tokens += resp.usage?.input_tokens || 0
    usage.output_tokens += resp.usage?.output_tokens || 0
    usage.searches += resp.usage?.server_tool_use?.web_search_requests || 0

    const report = resp.content.find(b => b.type === 'tool_use' && b.name === 'report_values')
    if (report) return { ...report.input, usage }

    messages.push({ role: 'assistant', content: resp.content })
    if (resp.stop_reason === 'pause_turn') continue // server-side search still running; resend unchanged
    messages.push({ role: 'user', content: 'Call report_values now with what you have found.' })
  }
  throw new Error('No report after 6 turns')
}

// ---------------------------------------------------------------------------
// Step 3: verify each value against the source page, in code
// ---------------------------------------------------------------------------

const pageCache = new Map()

async function pageText(url) {
  if (pageCache.has(url)) return pageCache.get(url)
  const p = (async () => {
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (MBATribe data refresh)' }, signal: AbortSignal.timeout(20000), redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const type = res.headers.get('content-type') || ''
    if (type.includes('pdf') || /\.pdf($|\?)/i.test(url)) {
      const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
      const doc = await getDocument({ data: new Uint8Array(await res.arrayBuffer()), useSystemFonts: true }).promise
      let text = ''
      for (let i = 1; i <= Math.min(doc.numPages, 40); i++) {
        const page = await doc.getPage(i)
        text += ' ' + (await page.getTextContent()).items.map(it => it.str).join(' ')
      }
      return text
    }
    const html = await res.text()
    return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#8211;|&ndash;/g, '-')
  })()
  pageCache.set(url, p)
  return p
}

export const norm = s => String(s || '').toLowerCase()
  .replace(/[‘’“”"'`]/g, '').replace(/[–—]/g, '-')
  .replace(/[^a-z0-9$%.,\-/ ]+/g, ' ').replace(/\s+/g, ' ').trim()

const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december']

/** Does the quote contain this value in some written form? */
export function valueInQuote(field, value, quote) {
  const q = norm(quote)
  const kind = FIELDS[field].kind
  if (kind === 'date') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value))
    if (!m) return false
    const month = MONTHS[Number(m[2]) - 1], day = String(Number(m[3]))
    return (q.includes(month) || q.includes(month.slice(0, 3))) && new RegExp(`\\b${day}\\b`).test(q) ||
      q.includes(`${Number(m[2])}/${day}`)
  }
  const n = Number(value)
  if (!Number.isFinite(n)) return false
  const nums = [...q.matchAll(/\$?\s?(\d[\d,]*(?:\.\d+)?)\s?(k|m)?\b/g)].map(x => {
    let v = Number(x[1].replace(/,/g, ''))
    if (x[2] === 'k') v *= 1000
    if (x[2] === 'm') v *= 1e6
    return v
  })
  if (nums.some(v => v === n || (n >= 1000 && Math.abs(v - n) / n < 0.005))) return true
  // GRE total written as two section scores (e.g. "163 V / 164 Q")
  if (field === 'avg_gre_total') {
    for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === n) return true
    }
  }
  return false
}

export function quoteOnPage(quote, text) {
  const page = norm(text)
  // Allow the model to elide with "…" or "...": each piece of 3+ words must be on the page.
  const pieces = String(quote).split(/\.{3}|…/).map(norm).filter(p => p.split(' ').length >= 3)
  if (!pieces.length) return page.includes(norm(quote)) && norm(quote).length >= 6
  return pieces.every(p => page.includes(p))
}

export function inRange(field, value) {
  const f = FIELDS[field]
  if (f.kind === 'date') {
    const d = new Date(value)
    return !Number.isNaN(d.getTime()) && d.getFullYear() >= new Date().getFullYear() - 1 && d.getFullYear() <= new Date().getFullYear() + 2
  }
  const n = Number(value)
  return Number.isFinite(n) && n >= f.min && n <= f.max
}

/** Rules that don't need the source page: exactness, a dated figure, and field definitions. */
export function policyCheck(v) {
  const text = `${v.quote || ''} ${v.note || ''}`.toLowerCase()
  if (/\b(about|approximately|approx\.?|roughly|nearly|around)\b|~|\d[kK]?\+/.test(v.quote || '') || /\bapproximate/.test(text)) {
    return 'approximate figure, not an exact published value'
  }
  if (!/\b20\d\d\b/.test(v.as_of || '') && !FIELDS[v.field]?.kind?.startsWith('date')) return 'the year this figure covers is not stated'
  const caveats = `${v.note || ''} ${v.as_of || ''}`.toLowerCase()
  if (/\b(undated|ambiguous|not stated|isn't stated|is not stated|unclear|likely|inferred|internally inconsistent)\b/.test(caveats)) {
    return `source is unclear about the year or definition (${caveats.trim().slice(0, 80)}…)`
  }
  if (v.field === 'signing_bonus' && /\bmean\b/.test(String(v.note || '').toLowerCase())) return 'mean bonus reported; this field is the median'
  if (v.field === 'annual_tuition' && /\b(includes|including)\b.*\bfee/.test(String(v.note || '').toLowerCase())) return 'figure includes fees; this field is tuition only'
  return null
}

export async function verifyValue(v, school, pageTextImpl = pageText) {
  if (!FIELDS[v.field]) return { ok: false, why: 'unknown field' }
  let host
  try { host = new URL(v.source_url).hostname.replace(/^www\./, '') } catch { return { ok: false, why: 'invalid source URL' } }
  if (!schoolDomains(school).some(d => host === d || host.endsWith('.' + d))) return { ok: false, why: `source is not the school's site (${host})` }
  if (!inRange(v.field, v.value)) return { ok: false, why: `value ${v.value} is outside the plausible range` }
  const policy = policyCheck(v)
  if (policy) return { ok: false, why: policy }
  if (v.field === 'avg_gmat' && !['focus', 'classic'].includes(v.gmat_scale)) return { ok: false, why: 'GMAT scale not stated' }
  if (!valueInQuote(v.field, v.value, v.quote)) return { ok: false, why: 'the quote does not contain the value' }
  let text
  try { text = await pageTextImpl(v.source_url) } catch (e) { return { ok: false, why: `could not open source (${e.message})` } }
  if (!quoteOnPage(v.quote, text)) return { ok: false, why: 'quote not found on the source page' }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Step 4: compare with current data and write the report
// ---------------------------------------------------------------------------

const fmt = (field, v) => v == null ? '—' : FIELDS[field].kind === 'money' ? `$${Number(v).toLocaleString('en-US')}` : String(v)

export async function refreshSchools(ids, apiKey, { extract = extractSchool, verify = verifyValue, onResult = () => {}, done = [] } = {}) {
  const byId = Object.fromEntries(DATA.schools.map(s => [s.id, s]))
  const results = [...done]
  const skip = new Set(done.map(r => r.id))
  for (const id of ids) {
    if (skip.has(id)) continue
    const school = byId[id]
    if (!school) { results.push({ id, error: 'unknown school id' }); continue }
    process.stdout.write(`• ${id} … `)
    try {
      const out = await extract(school, apiKey)
      const items = []
      for (const v of out.values || []) {
        const check = await verify(v, school)
        const current = getPath(school, FIELDS[v.field]?.path || [])
        items.push({ ...v, current: current ?? null, verified: check.ok, why: check.why || null,
          changed: check.ok && String(current) !== String(v.value) })
      }
      results.push({ id, name: school.name, items, not_found: out.not_found || [], usage: out.usage })
      onResult(results)
      console.log(`${items.filter(i => i.verified).length} verified, ${items.filter(i => !i.verified).length} rejected, ${(out.not_found || []).length} not found`)
    } catch (e) {
      results.push({ id, name: school.name, error: e.message })
      onResult(results)
      console.log('ERROR ' + e.message)
    }
  }
  return results
}

export function renderReport(results, model = MODEL) {
  const all = results.flatMap(r => r.items || [])
  const usage = results.reduce((u, r) => ({
    input: u.input + (r.usage?.input_tokens || 0), output: u.output + (r.usage?.output_tokens || 0), searches: u.searches + (r.usage?.searches || 0),
  }), { input: 0, output: 0, searches: 0 })
  const L = [
    `# School data refresh — ${TODAY}`,
    '',
    `Model: ${model} · Schools: ${results.length} · Values found: ${all.length} · Verified: ${all.filter(i => i.verified).length} · Rejected: ${all.filter(i => !i.verified).length} · Changed: ${all.filter(i => i.changed).length}`,
    `Usage: ${usage.searches} searches, ${usage.input.toLocaleString()} input tokens, ${usage.output.toLocaleString()} output tokens`,
    '',
    'Only **verified** values are applied. A value is verified when its source is on the school\'s own site, the quote was found on that page, the quote contains the value, and the value is in a plausible range.',
    '',
  ]
  for (const r of results) {
    L.push(`## ${r.name || r.id}`)
    if (r.error) { L.push('', `Error: ${r.error}`, ''); continue }
    L.push('', '| Field | Current | Found | As of | Status | Source |', '|---|---|---|---|---|---|')
    for (const i of r.items) {
      const status = !i.verified ? `✗ ${i.why}` : i.changed ? '✓ **update**' : '✓ unchanged'
      const found = fmt(i.field, i.value) + (i.field === 'avg_gmat' ? ` (${i.gmat_scale})` : '') + (i.note ? ` — ${i.note}` : '')
      L.push(`| ${i.field} | ${fmt(i.field, i.current)} | ${found} | ${i.as_of || ''} | ${status} | [link](${i.source_url}) |`)
    }
    if (r.not_found.length) L.push('', `Not found on official pages: ${r.not_found.join(', ')}`)
    L.push('')
  }
  return L.join('\n')
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = process.argv[process.argv.indexOf('--schools') + 1] || 'pilot'
  const ids = arg === 'pilot' ? PILOT
    : arg === 'all' ? DATA.schools.map(s => s.id)
    // 'remaining': schools never verified by an earlier run (skips ones already refreshed)
    : arg === 'remaining' ? DATA.schools.filter(s => !s.lastVerified).map(s => s.id)
    : arg.split(',').map(s => s.trim())
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) { console.error('Set ANTHROPIC_API_KEY'); process.exit(1) }

  const dir = join(ROOT, 'data', 'refresh', TODAY)
  mkdirSync(dir, { recursive: true })
  const save = results => {
    writeFileSync(join(dir, 'changes.json'), JSON.stringify({ date: TODAY, model: MODEL, results }, null, 2))
    writeFileSync(join(dir, 'report.md'), renderReport(results))
  }
  // Resume: schools already done today (from a saved partial run) are skipped.
  let done = []
  try { done = JSON.parse(readFileSync(join(dir, 'changes.json'), 'utf8')).results.filter(r => !r.error) } catch { /* fresh run */ }
  console.log(`Refreshing ${ids.length} school(s) with ${MODEL}${done.length ? ` (resuming; ${done.length} already done)` : ''}`)
  const results = await refreshSchools(ids, apiKey, { onResult: save, done })
  save(results)
  console.log(`\nWrote ${join('data', 'refresh', TODAY)}/report.md and changes.json`)
}
