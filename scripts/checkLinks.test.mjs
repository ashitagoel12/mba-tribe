// Offline tests: node scripts/checkLinks.test.mjs
import { repair, collectUrls, checkUrl, applyOverrides } from './checkLinks.mjs'
let fails = 0
const check = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? '✓' : '✗'} ${n}${d ? '  ' + d : ''}`) }
const school = () => ({ id: 'x', programUrl: 'https://x.edu/mba', website: 'https://x.edu/mba',
  quickLinks: [{ name: 'A', url: 'https://x.edu/dead1' }, { name: 'B', url: 'https://x.edu/ok' }, { name: 'C', url: 'https://x.edu/dead2' }],
  careerServicesUrl: 'https://x.edu/dead3', programs: [{ name: 'EMBA', url: 'https://x.edu/dead1' }], sources: { class_size: { url: 'https://x.edu/dead4', quote: 'q' } },
  refresh: { links: { avg_gmat: 'https://x.edu/dead5' } } })
const r = new Map(Object.entries({ 'https://x.edu/dead1': 'broken', 'https://x.edu/dead2': 'broken', 'https://x.edu/dead3': 'broken',
  'https://x.edu/dead4': 'broken', 'https://x.edu/dead5': 'broken', 'https://x.edu/ok': 'ok', 'https://x.edu/mba': 'ok' }).map(([k, v]) => [k, { state: v }]))
const data = { schools: [school()] }
const ch = repair(data, r)
const s = data.schools[0]
check('broken list items removed, good one kept', s.quickLinks.length === 1 && s.quickLinks[0].name === 'B')
check('broken single link replaced with program page', s.careerServicesUrl === 'https://x.edu/mba')
check('broken source link replaced, quote kept', s.sources.class_size.url === 'https://x.edu/mba' && s.sources.class_size.quote === 'q')
check('broken "see site" link replaced', s.refresh.links.avg_gmat === 'https://x.edu/mba')
check('program entry kept with fallback link', s.programs.length === 1 && s.programs[0].url === 'https://x.edu/mba')
check('all repairs reported', ch.length === 6, String(ch.length))
check('collects nested urls', collectUrls(school()).length === 9)
const fake = st => async () => ({ status: st, body: null })
check('404 is broken', (await checkUrl('https://a.b', fake(404))).state === 'broken')
check('403 is unknown, not broken', (await checkUrl('https://a.b', fake(403))).state === 'unknown')
check('200 is ok', (await checkUrl('https://a.b', fake(200))).state === 'ok')
check('bad domain is broken', (await checkUrl('https://a.b', async () => { throw Object.assign(new Error('x'), { cause: { code: 'ENOTFOUND' } }) })).state === 'broken')
const od = { schools: [{ programUrl: 'https://old.edu/mba/', quickLinks: [{ url: 'https://old.edu/mba' }] }] }
check('manual overrides applied everywhere', applyOverrides(od, { 'https://old.edu/mba': 'https://new.edu/mba' }) === 2 && od.schools[0].quickLinks[0].url === 'https://new.edu/mba')
console.log(fails ? `\n${fails} failed` : '\nAll checks passed'); process.exitCode = fails ? 1 : 0
