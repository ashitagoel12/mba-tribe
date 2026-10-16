// Apply the verified values from a refresh run to data/mba_schools_data.json.
//   node scripts/refresh/applyRefresh.mjs data/refresh/<date>/changes.json
// Only values marked verified are written. Each written value gets a source entry,
// so the site can show where every figure came from and when it was checked.
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FIELDS, schoolDomains } from './refreshData.mjs'
import { focusToClassic } from '../../src/utils/matchingAlgorithm.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

export function applyChanges(data, changes) {
  const byId = Object.fromEntries(data.schools.map(s => [s.id, s]))
  let applied = 0, confirmed = 0
  for (const r of changes.results || []) {
    const school = byId[r.id]
    if (!school || !r.items) continue
    for (const item of r.items) {
      if (!item.verified) continue
      const f = FIELDS[item.field]
      let value = f.kind === 'date' ? String(item.value) : Number(item.value)

      if (item.field === 'avg_gmat' && item.gmat_scale === 'focus') {
        // The app compares on the Classic scale; keep the published Focus number alongside.
        school.classProfile.avgGMATFocus = value
        value = focusToClassic(value)
      }
      if (f.kind === 'date' && !school.applicationInfo?.deadlines) continue

      // Write the value at its path, creating objects on the way if needed.
      let obj = school
      for (const k of f.path.slice(0, -1)) obj = obj[k] ??= {}
      const key = f.path.at(-1)
      if (String(obj[key]) !== String(value)) applied++
      else confirmed++
      obj[key] = value

      school.sources ??= {}
      school.sources[item.field] = {
        url: item.source_url, quote: item.quote, asOf: item.as_of || null,
        note: item.note || (item.field === 'avg_gmat' ? `published on ${item.gmat_scale} scale` : null),
        verifiedOn: changes.date,
      }
    }
    // Keep total cost in step with an updated tuition (2-year programs).
    const tuitionItem = r.items.find(i => i.field === 'annual_tuition' && i.verified)
    if (tuitionItem && school.costs.totalProgramCost) {
      const years = Math.max(1, Math.round(school.costs.totalProgramCost / (school.costs.annualTuition || 1)))
      school.costs.totalProgramCost = Number(tuitionItem.value) * years
    }
    if (r.items.some(i => i.verified)) school.lastVerified = changes.date

    // Record what was and wasn't verified, so the site can show a link to the
    // school's own page instead of a figure we couldn't confirm.
    const onSchoolSite = url => {
      try { const h = new URL(url).hostname.replace(/^www\./, ''); return schoolDomains(school).some(d => h === d || h.endsWith('.' + d)) } catch { return false }
    }
    // Verified in this run or in an earlier one (each verified value has a source entry).
    const verified = Object.keys(school.sources || {}).filter(f => FIELDS[f])
    const links = {}
    for (const field of Object.keys(FIELDS)) {
      if (field.startsWith('deadline_') || verified.includes(field)) continue
      const tried = r.items.find(i => i.field === field && onSchoolSite(i.source_url))
      links[field] = tried?.source_url || school.programUrl
    }
    school.refresh = { date: changes.date, verified, links }
  }
  data.metadata.lastRefresh = changes.date
  return { applied, confirmed }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = process.argv[2]
  if (!file) { console.error('Usage: node scripts/refresh/applyRefresh.mjs data/refresh/<date>/changes.json'); process.exit(1) }
  const dataPath = join(ROOT, 'data', 'mba_schools_data.json')
  const data = JSON.parse(readFileSync(dataPath, 'utf8'))
  const { applied, confirmed } = applyChanges(data, JSON.parse(readFileSync(file, 'utf8')))
  writeFileSync(dataPath, JSON.stringify(data, null, 2) + '\n')
  console.log(`Updated ${applied} value(s); confirmed ${confirmed} unchanged value(s) with sources.`)
}
