// Check every URL in the school dataset and repair the broken ones. No AI, no cost.
//   node scripts/checkLinks.mjs            -> check, fix, write data/LINK-REPORT.md
//   node scripts/checkLinks.mjs --dry-run  -> check and report only
//
// Status of each URL:
//   ok       2xx/3xx after redirects
//   broken   404/410, or the domain doesn't resolve -> repaired
//   unknown  401/403/429/5xx/timeout -> the site blocks automated checks; left as is, listed in the report
//
// Repair: a broken quick link or event link is removed. Any other broken link is
// replaced with the school's program page (or its site's home page), keeping the entry.

import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA_PATH = join(ROOT, 'data', 'mba_schools_data.json')
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'

export async function checkUrl(url, fetchImpl = fetch) {
  const attempt = async method => {
    const res = await fetchImpl(url, { method, redirect: 'follow', headers: { 'user-agent': UA, accept: 'text/html,application/pdf,*/*' }, signal: AbortSignal.timeout(15000) })
    try { await res.body?.cancel?.() } catch { /* ignore */ }
    return res.status
  }
  try {
    let status = await attempt('HEAD')
    if (status === 405 || status === 403 || status === 404 || status >= 500) status = await attempt('GET') // some sites mishandle HEAD
    if (status < 400) return { status, state: 'ok' }
    if (status === 404 || status === 410) return { status, state: 'broken' }
    return { status, state: 'unknown' }
  } catch (e) {
    const msg = String(e?.cause?.code || e?.code || e?.message || e)
    if (/ENOTFOUND|EAI_AGAIN|ERR_INVALID_URL|Invalid URL/i.test(msg)) return { status: msg, state: 'broken' }
    return { status: msg.slice(0, 40), state: 'unknown' }
  }
}

/** Every URL string in a school record, with a path to it. */
export function collectUrls(obj, path = []) {
  const out = []
  if (typeof obj === 'string') { if (/^https?:\/\//i.test(obj)) out.push({ path, url: obj }) }
  else if (Array.isArray(obj)) obj.forEach((v, i) => out.push(...collectUrls(v, [...path, i])))
  else if (obj && typeof obj === 'object') for (const k of Object.keys(obj)) out.push(...collectUrls(obj[k], [...path, k]))
  return out
}

async function runPool(items, worker, { perHost = 2, total = 12 } = {}) {
  const queue = [...items], active = new Map(), results = new Map()
  let running = 0
  await new Promise(resolve => {
    const next = () => {
      if (!queue.length && !running) return resolve()
      for (let i = 0; i < queue.length && running < total; i++) {
        const host = new URL(queue[i]).host
        if ((active.get(host) || 0) >= perHost) continue
        const url = queue.splice(i--, 1)[0]
        running++; active.set(host, (active.get(host) || 0) + 1)
        worker(url).then(r => results.set(url, r)).finally(() => {
          running--; active.set(host, active.get(host) - 1); next()
        })
      }
    }
    next()
  })
  return results
}

/** Apply repairs to the data in place. Returns a list of changes for the report. */
export function repair(data, results) {
  const changes = []
  const okUrl = u => results.get(u)?.state !== 'broken'
  for (const school of data.schools) {
    const home = (() => { try { return new URL(school.programUrl).origin + '/' } catch { return null } })()
    const fallback = [school.programUrl, school.website, home].find(u => u && okUrl(u)) || null
    const get = path => path.reduce((o, k) => o?.[k], school)
    const removals = new Map() // array -> Set of indices to remove
    for (const f of collectUrls(school).filter(f => results.get(f.url)?.state === 'broken')) {
      const where = f.path.join('.')
      const parentPath = f.path.slice(0, -1)
      const parent = get(parentPath)
      // In a list of objects (quick links, centers, events…): drop the item.
      const listPath = Array.isArray(parent) ? parentPath : parentPath.slice(0, -1)
      const list = get(listPath)
      const idx = Array.isArray(parent) ? f.path.at(-1) : parentPath.at(-1)
      // Pure link lists (quick links, event links) lose the item; lists that carry other
      // information (programs, centers, scholarships…) keep it and get the fallback link.
      const linkOnly = ['quickLinks', 'eventCategories'].includes(String(listPath.at(-1)))
      if (linkOnly && Array.isArray(list) && typeof idx === 'number') {
        if (!removals.has(list)) removals.set(list, new Set())
        removals.get(list).add(idx)
        changes.push({ school: school.id, where, url: f.url, action: 'removed from list' })
      } else if (fallback && fallback !== f.url) {
        parent[f.path.at(-1)] = fallback
        changes.push({ school: school.id, where, url: f.url, action: `replaced with ${fallback}` })
      } else {
        changes.push({ school: school.id, where, url: f.url, action: 'no working page found for this school; needs a person' })
      }
    }
    for (const [list, idxs] of removals) [...idxs].sort((x, y) => y - x).forEach(i => list.splice(i, 1))
  }
  return changes
}

/** Replace URLs listed in data/url-overrides.json (exact match, trailing slash ignored). */
export function applyOverrides(data, map) {
  const norm = u => u.replace(/\/$/, '')
  const m = new Map(Object.entries(map).map(([k, v]) => [norm(k), v]))
  let n = 0
  const walk = o => {
    if (Array.isArray(o)) o.forEach((v, i) => { if (typeof v === 'string' && m.has(norm(v))) { o[i] = m.get(norm(v)); n++ } else walk(v) })
    else if (o && typeof o === 'object') for (const k of Object.keys(o)) {
      if (typeof o[k] === 'string' && m.has(norm(o[k]))) { o[k] = m.get(norm(o[k])); n++ } else walk(o[k])
    }
  }
  walk(data.schools)
  return n
}

/** A short random sample of verified figures for a person to spot-check. */
export function spotCheck(data, n = 15, seed = 7) {
  const all = data.schools.flatMap(s => Object.entries(s.sources || {}).map(([f, src]) => ({ school: s.shortName || s.name, field: f, ...src })))
  let x = seed
  const rand = () => (x = (x * 1103515245 + 12345) % 2 ** 31) / 2 ** 31
  return all.map(v => [rand(), v]).sort((a, b) => a[0] - b[0]).slice(0, n).map(([, v]) => v)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dry = process.argv.includes('--dry-run')
  const data = JSON.parse(readFileSync(DATA_PATH, 'utf8'))
  // Manual corrections first (sites that block automated checks).
  let overrides = {}
  try { overrides = JSON.parse(readFileSync(join(ROOT, 'data', 'url-overrides.json'), 'utf8')).replace || {} } catch { /* none */ }
  const overridden = applyOverrides(data, overrides)
  if (overridden) console.log(`Applied ${overridden} manual link correction(s)`)
  const all = data.schools.flatMap(s => collectUrls(s).map(f => f.url))
  const unique = [...new Set(all)]
  console.log(`Checking ${unique.length} unique URLs (${all.length} references)…`)
  const results = await runPool(unique, u => checkUrl(u))
  const count = st => [...results.values()].filter(r => r.state === st).length
  const changes = dry ? [] : repair(data, results)
  if (!dry) writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n')

  const unknown = [...results].filter(([, r]) => r.state === 'unknown')
  const byHost = {}
  for (const [u, r] of unknown) { const h = new URL(u).host; (byHost[h] ??= []).push(r.status) }
  const L = [
    `# Link check — ${new Date().toISOString().slice(0, 10)}`, '',
    `Unique URLs: ${unique.length} · OK: ${count('ok')} · Broken: ${count('broken')} · Could not check: ${count('unknown')}`, '',
    'Broken links inside lists were removed; other broken links now point to the school\'s program page. "Could not check" means the site blocks automated visits (usually HTTP 403); those links were left as they are.', '',
    '## Repairs', '', ...(changes.length ? changes.map(c => `- \`${c.school}\` ${c.where}: ${c.url} → ${c.action}`) : ['None.']), '',
    '## Sites that block automated checks', '', ...Object.entries(byHost).sort((a, b) => b[1].length - a[1].length).map(([h, s]) => `- ${h}: ${s.length} link(s) (${[...new Set(s)].join(', ')})`), '',
    '## Spot-check (10 minutes)', '', 'A random sample of verified figures. Open a few links and confirm the quote is on the page.', '',
    '| School | Field | Quote | As of | Source |', '|---|---|---|---|---|',
    ...spotCheck(data).map(v => `| ${v.school} | ${v.field} | ${String(v.quote || '').replace(/\|/g, '/').slice(0, 90)} | ${v.asOf || ''} | [link](${v.url}) |`),
  ]
  writeFileSync(join(ROOT, 'data', 'LINK-REPORT.md'), L.join('\n') + '\n')
  console.log(`OK ${count('ok')} · broken ${count('broken')} · unknown ${count('unknown')} · repairs ${changes.length}`)
}
