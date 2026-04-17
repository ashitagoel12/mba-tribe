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

/**
 * Convert a GMAT Focus Edition score (205–805) to its GMAT Classic equivalent (200–800).
 * Source: GMAC Official Score Concordance Table, published July 2025.
 */
function focusToClassic(focusScore) {
  const table = {
    805: 795, 795: 790, 785: 785, 775: 780, 765: 780,
    755: 775, 745: 770, 735: 765, 725: 760, 715: 755,
    705: 750, 695: 745, 685: 735, 675: 725, 665: 715,
    655: 705, 645: 695, 635: 685, 625: 680, 615: 665,
    605: 650, 595: 645, 585: 630, 575: 615, 565: 605,
    555: 590, 545: 575, 535: 565, 525: 555, 515: 540,
    505: 530, 495: 515, 485: 495, 475: 480, 465: 465,
    455: 455, 445: 445, 435: 425, 425: 405, 415: 390,
    405: 375, 395: 360, 385: 350, 375: 335, 365: 315,
    355: 305, 345: 290, 335: 265, 325: 250, 315: 245,
    305: 235, 295: 225, 285: 215, 275: 210, 265: 210,
    255: 205, 245: 200, 235: 200, 225: 200, 215: 200, 205: 200,
  }
  const clamped = Math.min(805, Math.max(205, focusScore))
  const rounded = Math.round((clamped - 5) / 10) * 10 + 5
  return table[rounded] ?? 500
}

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

// Human-readable labels for career switch targets (Fix 3)
const SWITCH_TARGET_LABELS = {
  consulting:          'consulting',
  finance:             'finance / investment banking',
  tech:                'technology',
  healthcare:          'healthcare',
  entrepreneurship:    'entrepreneurship',
  'social-impact':     'social impact',
  'general-management':'general management',
}

// Human-readable labels for post-MBA goals (Fix 5)
const GOAL_LABELS = {
  consulting:          'consulting',
  finance:             'finance',
  tech:                'technology',
  healthcare:          'healthcare',
  entrepreneurship:    'entrepreneurship',
  'social-impact':     'social impact',
  'general-management':'general management',
  'career-switch':     'your target field',
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
 * @returns {string[]}        - Array of up to 3 bullet strings
 */
export function generateFitBullets(school, formData, breakdown) {
  const {
    postMBAGoal,
    careerSwitchTarget,
    currentRegion,
    priorities,
    examType,
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

  const isCareerSwitch = postMBAGoal === 'career-switch' && !!careerSwitchTarget

  // ── 1. Industry / career placement match ─────────────────────────────────
  const industryKW = GOAL_TO_INDUSTRY_KW[effectiveGoal] || []
  const top3 = school.employment.top3Industries || []
  const matchedIndustry = top3.find(ind => kwMatch(ind, industryKW))

  if (matchedIndustry) {
    const rank = top3.indexOf(matchedIndustry) + 1
    const rankLabel = rank === 1 ? 'the #1' : rank === 2 ? 'the #2' : 'a top-3'

    let careerText
    if (isCareerSwitch) {
      // Fix 3: reference the specific switch target, not generic "target field"
      const switchLabel = SWITCH_TARGET_LABELS[careerSwitchTarget] || careerSwitchTarget
      careerText = `Strong ${switchLabel} placement pipeline — ${matchedIndustry} is ${rankLabel} destination for graduates`
    } else {
      const goalLabel = GOAL_LABELS[effectiveGoal] || effectiveGoal.replace(/-/g, ' ')
      careerText = `${matchedIndustry} is ${rankLabel} destination for graduates — directly aligned with your ${goalLabel} goal`
    }
    candidates.push({
      score: rank === 1 ? 10 : rank === 2 ? 8 : 6,
      text: careerText,
    })
  }

  // ── 2. Campus environment match ──────────────────────────────────────────
  // Fix 2: skip if no-preference; improve copy for match case
  if (campusEnv && campusEnv !== 'no-preference' && school.campusType === campusEnv) {
    const city = school.location.city || school.name
    const text = campusEnv === 'urban'
      ? `Urban campus in ${city} — matches your preference for a city environment`
      : `Campus-town setting in ${city} — matches your preference for a quieter college-town feel`
    candidates.push({ score: 9, text })
  }

  // ── 3. Collaborative culture match ───────────────────────────────────────
  const collabRating = priorities?.collaborativeCulture ?? 3
  const hasCollab = school.culture?.some(c =>
    c.toLowerCase().includes('collaborative') || c.toLowerCase().includes('team')
  )
  if (collabRating >= 4 && hasCollab) {
    const raw = school.culture.find(c =>
      c.toLowerCase().includes('collaborative') || c.toLowerCase().includes('team')
    ) || ''
    // Fix 5: cap length to avoid >120-char bullets
    const cultureHighlight = raw.length > 40 ? raw.slice(0, 40).trimEnd() + '…' : raw
    candidates.push({
      score: 8,
      text: `Culture known for "${cultureHighlight}" — matches your preference for a collaborative environment`,
    })
  } else if (school.culture?.length >= 2) {
    candidates.push({
      score: 4,
      text: `Program culture: ${school.culture.slice(0, 2).join(', ')}`,
    })
  }

  // ── 4. Salary ROI relative to tuition ────────────────────────────────────
  // Fix 4: null-guard both salary and tuition before any arithmetic
  const salary = school.employment?.avgStartingSalary
  const tuition = school.costs?.annualTuition
  if (salary != null && tuition != null && tuition > 0) {
    const roiRatio = salary / (tuition * 2)
    if (roiRatio >= 1.2) {
      candidates.push({
        score: 7,
        text: `Strong ROI signal: ${fmt(salary)} avg starting salary vs. ${fmt(tuition)}/yr tuition`,
      })
    } else {
      const bonus = school.employment?.medianSigningBonus
      const bonusStr = bonus != null ? ` with a median signing bonus of ${fmt(bonus)}` : ''
      candidates.push({
        score: 4,
        text: `Average starting salary of ${fmt(salary)}${bonusStr}`,
      })
    }
  }

  // ── 5. Small / intimate class size ───────────────────────────────────────
  const size = school.classProfile?.size
  if (size != null) {
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
  }

  // ── 6. International cohort (relevant for non-US applicants) ─────────────
  // Fix 4: null-guard intlPct before use
  const intlPct = school.classProfile?.internationalStudentPct
  if (isInternational && intlPct != null) {
    if (intlPct > 40) {
      candidates.push({
        score: 9,
        text: `${intlPct}% international cohort — robust global community with cross-border recruiting networks`,
      })
    } else if (intlPct >= 35) {
      candidates.push({
        score: 6,
        text: `${intlPct}% international students — meaningful global peer group and international alumni network`,
      })
    }
  }

  // ── 7. STEM OPT for international students ───────────────────────────────
  if (isInternational && school.stemOpt) {
    candidates.push({
      score: 7,
      text: `STEM-designated program — F-1 students eligible for 3-year OPT extension, strengthening your job search runway`,
    })
  }

  // ── 8. Cost advantage (if user is budget-aware) ───────────────────────────
  // Fix 4: null-guard tuition
  if (tuition != null && budgetSensitivity !== 'not-concern' && tuition < 65_000) {
    candidates.push({
      score: 8,
      text: `Annual tuition of ${fmt(tuition)} is below the peer-program average — a real cost advantage worth factoring in`,
    })
  }

  // ── 9. Exceptional placement rate ────────────────────────────────────────
  // Fix 4: null-guard empRate
  const empRate = school.employment?.employmentRate3Months
  if (empRate != null && empRate >= 95) {
    candidates.push({
      score: 7,
      text: `${empRate}% employment within 3 months of graduation — among the highest in the dataset`,
    })
  }

  // ── 10. Academic strength match for goal ─────────────────────────────────
  const strengthMap = {
    entrepreneurship:    'Entrepreneurship',
    finance:             'Finance',
    tech:                'Technology',
    healthcare:          'Healthcare',
    'social-impact':     'Social Enterprise',
    consulting:          'Strategy',
  }
  const targetStrength = strengthMap[effectiveGoal]
  if (targetStrength && school.academicStrengths?.length) {
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

  // ── 11. GMAT Focus score — positive signal when at/above avg ─────────────
  // Fix 1: when Focus score converts to within 10 pts of school avg, surface
  // this as a positive fit bullet rather than staying silent.
  if (examType === 'gmat-focus' && examScore) {
    const rawScore = parseInt(examScore)
    const avg = school.classProfile?.avgGMAT
    if (rawScore && avg) {
      const converted = focusToClassic(rawScore)
      const gap = avg - converted
      if (gap <= 10) {
        candidates.push({
          score: 7,
          text: `Your GMAT Focus score (${rawScore}) is equivalent to ~${converted} Classic — at or above the class average`,
        })
      }
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

  // ── Test score gap ────────────────────────────────────────────────────────
  // Fix 1: GMAT Focus uses a different display format showing the conversion,
  // and only warns when the converted score is more than 10 pts below avg.
  const score = parseInt(examScore)
  if (score > 0 && examType && examType !== 'none') {
    if (examType === 'gre') {
      // Fix 4: null-guard avgGRE
      const avg = school.classProfile?.avgGRE
      if (avg != null) {
        const gap = avg - score
        if (gap > 40) {
          warnings.push({
            priority: 10,
            text: `Your GRE score (${score}) is ${gap} pts below the class avg (${avg}) — consider this a reach and invest heavily in essays and interviews`,
          })
        } else if (gap > 20) {
          warnings.push({
            priority: 8,
            text: `Your GRE score (${score}) is ${gap} pts below the class avg (${avg}) — a compelling narrative and strong recommenders will matter more here`,
          })
        }
      }
    } else if (examType === 'gmat-focus') {
      // Fix 1 + Fix 4: use converted Classic score; null-guard avgGMAT
      const avg = school.classProfile?.avgGMAT
      if (avg != null) {
        const converted = focusToClassic(score)
        const gap = avg - converted
        // Only warn when converted score is more than 10 pts below average
        if (gap > 40) {
          warnings.push({
            priority: 10,
            text: `Your GMAT Focus score (${score}) converts to ~${converted} Classic — ${gap} pts below the class avg (${avg}). Consider this a reach; invest heavily in essays and interviews`,
          })
        } else if (gap > 10) {
          warnings.push({
            priority: 8,
            text: `Your GMAT Focus score (${score}) converts to ~${converted} Classic — ${gap} pts below the class avg (${avg}). A strong narrative and recommenders will help`,
          })
        }
        // gap <= 10 → positive signal surfaced in generateFitBullets instead
      }
    } else {
      // gmat-classic
      // Fix 4: null-guard avgGMAT
      const avg = school.classProfile?.avgGMAT
      if (avg != null) {
        const gap = avg - score
        if (gap > 40) {
          warnings.push({
            priority: 10,
            text: `Your GMAT score (${score}) is ${gap} pts below the class avg (${avg}) — consider this a reach and invest heavily in essays and interviews`,
          })
        } else if (gap > 20) {
          warnings.push({
            priority: 8,
            text: `Your GMAT score (${score}) is ${gap} pts below the class avg (${avg}) — a compelling narrative and strong recommenders will matter more here`,
          })
        }
      }
    }
  }

  // ── Cost + budget sensitivity ─────────────────────────────────────────────
  // Fix 4: null-guard annualTuition
  const tuition = school.costs?.annualTuition
  if (
    tuition != null &&
    (budgetSensitivity === 'major-factor' || budgetSensitivity === 'matters-somewhat') &&
    tuition > 75_000
  ) {
    warnings.push({
      priority: 7,
      text: `Annual tuition of ${fmt(tuition)} — research scholarship availability and fellowship programs before committing`,
    })
  }

  // ── Campus environment mismatch ───────────────────────────────────────────
  // Fix 2: skip if no-preference; improve mismatch copy
  if (campusEnv && campusEnv !== 'no-preference' && school.campusType !== campusEnv) {
    const text = campusEnv === 'urban'
      ? `Campus-town setting — you indicated a preference for an urban environment`
      : `Urban campus — you indicated a preference for a quieter campus-town setting`
    warnings.push({ priority: 5, text })
  }

  // ── Below-average employment rate ─────────────────────────────────────────
  // Fix 4: null-guard employmentRate3Months
  const empRate = school.employment?.employmentRate3Months
  if (empRate != null && empRate < 88) {
    warnings.push({
      priority: 6,
      text: `${empRate}% placement within 3 months is below peer average — ask specifically about on-campus recruiting and career coach quality`,
    })
  }

  if (!warnings.length) {
    return `Strong overall fit — dig into alumni outcomes in your specific target function and region before finalising your list`
  }

  warnings.sort((a, b) => b.priority - a.priority)
  return warnings[0].text
}
