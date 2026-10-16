// Offline tests for the data refresh: node scripts/refresh/refresh.test.mjs
import { readFileSync } from 'node:fs'
import { valueInQuote, quoteOnPage, inRange, verifyValue, schoolDomains, refreshSchools, renderReport, policyCheck } from './refreshData.mjs'
import { applyChanges } from './applyRefresh.mjs'

let fails = 0
const check = (name, ok, detail = '') => { if (!ok) fails++; console.log(`${ok ? '✓' : '✗'} ${name}${detail ? '  ' + detail : ''}`) }
const data = JSON.parse(readFileSync(new URL('../../data/mba_schools_data.json', import.meta.url)))
const hbs = data.schools.find(s => s.id === 'harvard-hbs')

// Value-in-quote
check('money with $ and commas', valueInQuote('starting_salary', 175000, 'Median base salary: $175,000'))
check('money written as $175K', valueInQuote('starting_salary', 175000, 'Median base salary $175K'))
check('percent', valueInQuote('international_pct', 37, 'International students 37%'))
check('GRE total from section scores', valueInQuote('avg_gre_total', 327, 'Average GRE: 163 Verbal, 164 Quant'))
check('date in words', valueInQuote('deadline_round1', '2026-09-03', 'Round 1: September 3, 2026'))
check('wrong number is caught', !valueInQuote('starting_salary', 180000, 'Median base salary: $175,000'))

// Quote on page
const page = '<h2>Class of 2028</h2> Average GMAT Focus 695 . International students 37% of the class.'
check('exact quote found', quoteOnPage('International students 37% of the class', page))
check('elided quote found', quoteOnPage('Class of 2028 … International students 37%', page))
check('invented quote rejected', !quoteOnPage('International students 41% of the class', page))

// Policy rules from the 2026-10-16 pilot
check('approximate figure rejected', !!policyCheck({ field: 'class_size', value: 450, quote: 'about 400 MBA and about 50 LGO students', as_of: '2026 FAQ' }))
check('"$144k+" rejected', !!policyCheck({ field: 'starting_salary', value: 144000, quote: 'average base salary $144k+', as_of: 'Class of 2025' }))
check('undated figure rejected', !!policyCheck({ field: 'starting_salary', value: 185000, quote: 'median base salary $185,000', as_of: 'Most recent figure on program page' }))
check('mean signing bonus rejected', !!policyCheck({ field: 'signing_bonus', value: 40192, quote: 'Mean signing bonus $40,192', as_of: 'Class of 2025', note: 'Mean signing bonus.' }))
check('tuition with fees rejected', !!policyCheck({ field: 'annual_tuition', value: 91892, quote: 'Tuition $91,892', as_of: '2026-27', note: 'Includes the mandatory $2,200 annual program fee.' }))
check('caveat in as_of rejected', !!policyCheck({ field: 'avg_gmat', value: 676, quote: 'GMAT 676', as_of: 'Current class (undated, likely Class of 2027)', gmat_scale: 'focus' }))
check('clean dated value passes', policyCheck({ field: 'international_pct', value: 37, quote: '37% international', as_of: 'Class of 2027 profile' }) === null)

// Ranges and domains
check('GRE section score rejected as total', !inRange('avg_gre_total', 163))
check('school domains come from its own site', schoolDomains(hbs).includes('hbs.edu'), schoolDomains(hbs).join(','))

// Full verify with a fake page fetch
const fakePage = async () => 'Class of 2028 profile. Average GMAT 740. 37% international.'
let v = await verifyValue({ field: 'international_pct', value: 37, source_url: 'https://www.hbs.edu/mba/class-profile', quote: '37% international', as_of: 'Class of 2028' }, hbs, fakePage)
check('verified when everything checks out', v.ok, v.why || '')
v = await verifyValue({ field: 'international_pct', value: 37, source_url: 'https://poetsandquants.com/x', quote: '37% international', as_of: '' }, hbs, fakePage)
check('third-party source rejected', !v.ok && /school's site/.test(v.why))
v = await verifyValue({ field: 'avg_gmat', value: 740, source_url: 'https://www.hbs.edu/x', quote: 'Average GMAT 740', as_of: '' }, hbs, fakePage)
check('GMAT without a stated scale rejected', !v.ok)

// End to end with a fake model, then apply
const fakeExtract = async () => ({
  values: [
    { field: 'international_pct', value: 37, source_url: 'https://www.hbs.edu/mba/class-profile', quote: '37% international', as_of: 'Class of 2028 profile' },
    { field: 'avg_gmat', value: 735, gmat_scale: 'focus', source_url: 'https://www.hbs.edu/mba/class-profile', quote: 'Average GMAT 735', as_of: 'Class of 2028 profile' },
    { field: 'starting_salary', value: 999999, source_url: 'https://www.hbs.edu/x', quote: '$999,999', as_of: '' },
  ],
  not_found: ['women_pct'], usage: { input_tokens: 10, output_tokens: 5, searches: 2 },
})
const fakeVerify = (v, s) => verifyValue(v, s, async () => 'Average GMAT 735. 37% international. $999,999')
const results = await refreshSchools(['harvard-hbs'], 'x', { extract: fakeExtract, verify: fakeVerify })
const items = results[0].items
check('implausible value rejected even with a matching quote', items.find(i => i.field === 'starting_salary').verified === false)
check('report renders', /Verified: 2/.test(renderReport(results, 'test')))

const copy = structuredClone(data)
const { applied } = applyChanges(copy, { date: '2026-10-16', results })
const h = copy.schools.find(s => s.id === 'harvard-hbs')
check('verified values applied', applied >= 1 && h.classProfile.internationalStudentPct === 37)
check('Focus GMAT stored and converted to Classic for scoring', h.classProfile.avgGMATFocus === 735 && h.classProfile.avgGMAT === 765, `${h.classProfile.avgGMAT}`)
check('rejected value not applied', h.employment.avgStartingSalary !== 999999)
check('source recorded with date', h.sources.international_pct.verifiedOn === '2026-10-16' && h.lastVerified === '2026-10-16')

check('refresh record lists verified fields', h.refresh.verified.includes('international_pct') && h.refresh.verified.includes('avg_gmat'))
check('unverified field links to the page Claude tried', h.refresh.links.starting_salary === 'https://www.hbs.edu/x')
check('unverified field with no page found links to the program page', h.refresh.links.women_pct === h.programUrl)
const { checkLink } = await import('../../src/utils/fieldStatus.js')
check('site shows link only for unverified fields', checkLink(h, 'starting_salary') && !checkLink(h, 'international_pct'))
check('schools not yet refreshed show figures as before', checkLink(data.schools.find(s => s.id === 'kansas'), 'starting_salary') === null)

console.log(fails ? `\n${fails} check(s) failed` : '\nAll checks passed')
process.exitCode = fails ? 1 : 0
