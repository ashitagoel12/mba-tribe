// Runs the matching engine on fixed test applicants and checks for known failure modes.
// Usage: node scripts/personaCheck.mjs
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { runMatching } from '../src/utils/matchingAlgorithm.js'
import { generateUserInsights } from '../src/utils/userInsights.js'

const { schools } = JSON.parse(readFileSync(new URL('../data/mba_schools_data.json', import.meta.url)))

const base = {
  currentIndustryOther: '', currentFunctionOther: '', postMBAGoalOther: '', careerSwitchTarget: '',
  additionalNotes: '',
}
const p = (o) => ({ prestige: 3, industryPlacement: 3, campusEnvironment: 3, affordability: 3, scholarship: 3, internationalSupport: 3, collaborativeCulture: 3, ...o })

export const PERSONAS = {
  'intl-ops-genmgmt': { ...base, currentRegion: 'asia', yearsExperience: '6', currentIndustry: 'manufacturing', currentFunction: 'operations',
    postMBAGoal: 'general-management', campusEnv: 'urban', priorities: p({ industryPlacement: 5, affordability: 4, scholarship: 4, internationalSupport: 5 }),
    examType: 'gmat-focus', examScore: '665', budgetSensitivity: 'matters-somewhat', scholarshipImportance: 'important' },
  'us-consulting-prestige': { ...base, currentRegion: 'north-america', yearsExperience: '4', currentIndustry: 'finance', currentFunction: 'strategy',
    postMBAGoal: 'consulting', campusEnv: 'no-preference', priorities: p({ prestige: 5, industryPlacement: 5, affordability: 1, scholarship: 2 }),
    examType: 'gmat-focus', examScore: '705', budgetSensitivity: 'not-concern', scholarshipImportance: 'nice-to-have' },
  'us-tech-budget': { ...base, currentRegion: 'north-america', yearsExperience: '3', currentIndustry: 'technology', currentFunction: 'engineering-product',
    postMBAGoal: 'tech', campusEnv: 'campus-town', priorities: p({ campusEnvironment: 5, affordability: 5, scholarship: 5, prestige: 2 }),
    examType: 'gre', examScore: '318', budgetSensitivity: 'major-factor', scholarshipImportance: 'deal-breaker' },
  'intl-healthcare-switch': { ...base, currentRegion: 'europe', yearsExperience: '5', currentIndustry: 'healthcare', currentFunction: 'marketing-sales',
    postMBAGoal: 'career-switch', careerSwitchTarget: 'healthcare', campusEnv: 'urban', priorities: p({ internationalSupport: 4, collaborativeCulture: 5 }),
    examType: 'none', examScore: '', budgetSensitivity: 'matters-somewhat', scholarshipImportance: 'important' },
}

const isMain = import.meta.url === pathToFileURL(process.argv[1]).href
let problems = 0
if (isMain) for (const [name, form] of Object.entries(PERSONAS)) {
  const r = runMatching(schools, form)
  const ins = generateUserInsights(form)
  const strong = r.strongFit
  console.log(`\n=== ${name} ===`)
  console.log('insight:', ins.summary)
  console.log('strong:', strong.map(s => `${s.school.id} ${s.totalScore}`).join(' | '))
  console.log('exploring:', r.worthExploring.slice(0, 5).map(s => `${s.school.id} ${s.totalScore}`).join(' | '))
  console.log('gems:', r.hiddenGems.map(s => s.school.id).join(', '))
  const scores = r.allScored.map(s => s.totalScore)
  console.log('score range:', Math.min(...scores), '-', Math.max(...scores))

  // Checks
  const strongIds = new Set(strong.map(s => s.school.id))
  const dupGems = r.hiddenGems.filter(g => strongIds.has(g.school.id))
  if (dupGems.length) { problems++; console.log('  ✗ hidden gems repeat strong fits:', dupGems.map(g => g.school.id).join(', ')) }
  if (form.campusEnv && form.campusEnv !== 'no-preference') {
    const mism = strong.filter(s => s.school.campusType !== form.campusEnv)
    if (mism.length) { problems++; console.log('  ✗ strong fits with campus mismatch:', mism.map(s => s.school.id).join(', ')) }
  }
  const weakStrong = strong.filter(s => s.totalScore < 65)
  if (weakStrong.length && r.strongLabel !== 'best') { problems++; console.log('  ✗ "Strong Fit" label on scores below 65:', weakStrong.map(s => s.totalScore).join(', ')) }
  if (/rated all factors fairly high/.test(ins.summary) && Object.values(form.priorities).some(v => v <= 3)) {
    problems++; console.log('  ✗ insight says "rated all factors fairly high" but some are 3 or below')
  }
  if (form.postMBAGoal === 'general-management') {
    const sc = strong.filter(s => /supply chain/i.test(s.school.employment.top3Industries[0]) && !/general management/i.test(s.school.employment.top3Industries[0]))
    if (sc.length) { problems++; console.log('  ✗ general-management goal matched on "Supply Chain Management":', sc.map(s => s.school.id).join(', ')) }
  }
}
if (isMain) {
  console.log(`\n${problems} problem(s) found`)
  process.exitCode = problems ? 1 : 0
}
