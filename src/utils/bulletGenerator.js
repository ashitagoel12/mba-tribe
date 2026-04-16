/**
 * bulletGenerator.js
 * ---------------------------------------------------------------------------
 * Pure functions that generate narrative "Why this fits you" bullets and
 * "Watch out for" warnings from school data + user inputs.
 *
 * No React imports. All functions are deterministic given the same inputs.
 * ---------------------------------------------------------------------------
 */

import { GOAL_TO_INDUSTRY_KW } from './constants.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n) {
  if (!n && n !== 0) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`
  return `$${n}`
}

function kwMatch(text, keywords) {
  if (!text || !keywords?.length) return false
  return keywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()))
}

// ---------------------------------------------------------------------------
// "Why this fits you" bullet generator
// ---------------------------------------------------------------------------

/**
 * Generate an ordered list of fit bullets for a school.
 * Each candidate has a `score` (relevance weight) and a `text` string.
 * We sort descending by score and return the top 3.
 *
 * @param {object} school     - School from dataset
 * @param {object} formData   - User form state
 * @param {object} breakdown  - Raw dimension scores from scoreSchool()
 * @returns {string[]}        - Array of 3 bullet strings
 */
export function generateFitBullets(school, formData, breakdown) {
  const {
    postMBAGoal,
    careerSwitchTarget,
    currentRegion,
    priorities,
    examScore,
    budgetSensitivity,
    campusEnv,
  } = formData

  const isInternational = currentRegion !== 'north-america'
  const candidates = []

  // Resolve effective goal (career switchers use their sub-goal for matching)
  const effectiveGoal = (postMBAGoal === 'career-switch' && careerSwitchTarget)
    ? careerSwitchTarget
    : postMBAGoal

  // ── 1. Industry / career placement match ─────────────────────────────────
  const industryKW = GOAL_TO_INDUSTRY_KW[effectiveGoal] || []
  const top3 = school.employment.top3Industries
  const matchedIndustry = top3.find(ind => kwMatch(ind, industryKW))

  if (matchedIndustry) {
    const rank = top3.indexOf(matchedIndustry) + 1
    const rankLabel = rank === 1 ? 'the #1' : rank === 2 ? 'the #2' : 'a top-3'
    candidates.push({
      score: rank === 1 ? 10 : rank === 2 ? 8 : 6,
      text: `${matchedIndustry} is ${rankLabel} destination for graduates — directly aligned with your target field`,
    })
  }

  // ── 2. Campus environment match ──────────────────────────────────────────
  if (campusEnv && campusEnv !== 'no-preference' && school.campusType === campusEnv) {
    const envLabel = campusEnv === 'urban'
      ? 'urban campus embedded in a major metro'
      : 'tight-knit campus-town environment'
    candidates.push({
      score: 9,
      text: `${school.location.city} offers the ${envLabel} you're looking for`,
    })
  }

  // ── 3. Collaborative culture match ───────────────────────────────────────
  const collabRating = priorities.collaborativeCulture
  const hasCollab = school.culture.some(c =>
    c.toLowerCase().includes('collaborative') || c.toLowerCase().includes('team')
  )
  if (collabRating >= 4 && hasCollab) {
    const cultureHighlight = school.culture.find(c =>
      c.toLowerCase().includes('collaborative') || c.toLowerCase().includes('team')
    )
    candidates.push({
      score: 8,
      text: `Culture known for "${cultureHighlight}" — matches your preference for supportive, non-cutthroat environments`,
    })
  } else if (school.culture.length >= 2) {
    candidates.push({
      score: 4,
      text: `Program culture: ${school.culture.slice(0, 2).join(', ')}`,
    })
  }

  // ── 4. Salary ROI relative to tuition ────────────────────────────────────
  const salary = school.employment.avgStartingSalary
  const tuition = school.costs.annualTuition
  const roiRatio = salary / (tuition * 2) // salary vs total 2-yr tuition
  if (roiRatio >= 1.2) {
    candidates.push({
      score: 7,
      text: `Strong ROI signal: ${fmt(salary)} avg starting salary vs. ${fmt(tuition)}/yr tuition`,
    })
  } else {
    candidates.push({
      score: 4,
      text: `Average starting salary of ${fmt(salary)} with a median signing bonus of ${fmt(school.employment.medianSigningBonus)}`,
    })
  }

  // ── 5. Small / intimate class size ───────────────────────────────────────
  const size = school.classProfile.size
  if (size < 160) {
    candidates.push({
      score: 7,
      text: `Very small class of ${size} students — exceptional faculty access and a lasting, tight-knit network`,
    })
  } else if (size < 320) {
    candidates.push({
      score: 6,
      text: `Intimate class of ${size} — strong peer bonds and more individualised career support`,
    })
  }

  // ── 6. International cohort (relevant for non-US applicants) ─────────────
  const intlPct = school.classProfile.internationalStudentPct
  if (isInternational && intlPct > 40) {
    candidates.push({
      score: 9,
      text: `${intlPct}% international cohort — robust global community with cross-border recruiting networks`,
    })
  } else if (isInternational && intlPct >= 35) {
    candidates.push({
      score: 6,
      text: `${intlPct}% international students — meaningful global peer group and international alumni network`,
    })
  }

  // ── 7. STEM OPT for international students ───────────────────────────────
  if (isInternational && school.stemOpt) {
    candidates.push({
      score: 7,
      text: `STEM-designated program — F-1 students eligible for 3-year OPT extension, strengthening your job search runway`,
    })
  }

  // ── 8. Cost advantage (if user is budget-aware) ───────────────────────────
  if (budgetSensitivity !== 'not-concern' && tuition < 65_000) {
    candidates.push({
      score: 8,
      text: `Annual tuition of ${fmt(tuition)} is below the peer-program average — a real cost advantage worth factoring in`,
    })
  }

  // ── 9. Exceptional placement rate ────────────────────────────────────────
  const empRate = school.employment.employmentRate3Months
  if (empRate >= 95) {
    candidates.push({
      score: 7,
      text: `${empRate}% employment within 3 months of graduation — among the highest in the dataset`,
    })
  }

  // ── 10. Academic strength match for goal ─────────────────────────────────
  const strengthMap = {
    entrepreneurship: 'Entrepreneurship',
    finance: 'Finance',
    tech: 'Technology',
    healthcare: 'Healthcare',
    'social-impact': 'Social Enterprise',
    consulting: 'Strategy',
  }
  const targetStrength = strengthMap[effectiveGoal]
  if (targetStrength) {
    const hasStrength = school.academicStrengths.some(s =>
      s.toLowerCase().includes(targetStrength.toLowerCase())
    )
    if (hasStrength) {
      candidates.push({
        score: 8,
        text: `${targetStrength} is one of the program's academic strengths — deep coursework and faculty expertise available`,
      })
    }
  }

  // ── Sort by relevance and return top 3 ───────────────────────────────────
  candidates.sort((a, b) => b.score - a.score)
  return candidates.slice(0, 3).map(c => c.text)
}

// ---------------------------------------------------------------------------
// "Watch out for" warning generator
// ---------------------------------------------------------------------------

/**
 * Return the single most important caution for a school given this user's profile.
 *
 * @param {object} school    - School from dataset
 * @param {object} formData  - User form state
 * @returns {string}
 */
export function generateWatchOut(school, formData) {
  const { examScore, examType, budgetSensitivity, campusEnv } = formData
  const warnings = []

  // Test score gap
  const score = parseInt(examScore)
  if (score > 0 && examType && examType !== 'none') {
    const avg = examType === 'gre'
      ? school.classProfile.avgGRE
      : school.classProfile.avgGMAT
    const gap = avg - score
    const examLabel = examType === 'gre' ? 'GRE' : 'GMAT'
    if (gap > 40) {
      warnings.push({
        priority: 10,
        text: `Your ${examLabel} (${score}) is ${gap} pts below the class avg (${avg}) — consider this a reach and invest heavily in essays and interviews`,
      })
    } else if (gap > 20) {
      warnings.push({
        priority: 8,
        text: `Your ${examLabel} (${score}) is ${gap} pts below the class avg (${avg}) — a compelling narrative and strong recommenders will matter more here`,
      })
    }
  }

  // Cost + budget sensitivity
  if (
    (budgetSensitivity === 'major-factor' || budgetSensitivity === 'matters-somewhat') &&
    school.costs.annualTuition > 75_000
  ) {
    warnings.push({
      priority: 7,
      text: `Annual tuition of ${fmt(school.costs.annualTuition)} — research scholarship availability and fellowship programs before committing`,
    })
  }

  // Campus environment mismatch
  if (campusEnv && campusEnv !== 'no-preference' && school.campusType !== campusEnv) {
    const preferred = campusEnv === 'urban' ? 'a major metro campus' : 'a quieter campus-town setting'
    const actual = school.campusType === 'urban' ? 'urban' : 'campus-town'
    warnings.push({
      priority: 5,
      text: `You prefer ${preferred}, but ${school.name} is in a ${actual} setting — factor in lifestyle fit during the 2 years`,
    })
  }

  // Below-average employment rate
  if (school.employment.employmentRate3Months < 88) {
    warnings.push({
      priority: 6,
      text: `${school.employment.employmentRate3Months}% placement within 3 months is below peer average — ask specifically about on-campus recruiting and career coach quality`,
    })
  }

  if (!warnings.length) {
    return `Strong overall fit — dig into alumni outcomes in your specific target function and region before finalising your list`
  }

  warnings.sort((a, b) => b.priority - a.priority)
  return warnings[0].text
}
