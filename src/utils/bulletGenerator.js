/**
 * bulletGenerator.js  v3
 * ---------------------------------------------------------------------------
 * Generates specific, data-rich "Why this fits you" bullets and
 * "Watch out for" warnings that reference the user's actual inputs and
 * compare each school against the full results list.
 *
 * Public API
 * ----------
 *   generateFitBullets(school, formData, allScoredResults) → string[]   (max 4)
 *   generateWatchOut  (school, formData, allScoredResults) → string[]   (max 3)
 *
 * allScoredResults is the full array of { school, totalScore, breakdown, tier }
 * objects returned by runMatching() as results.allScored.
 * ---------------------------------------------------------------------------
 */

import { GOAL_TO_INDUSTRY_KW } from './constants.js'

// ---------------------------------------------------------------------------
// GMAT Focus → Classic concordance  (GMAC Official, July 2025)
// ---------------------------------------------------------------------------

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
  if (n == null) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`
  return `$${n}`
}

function kwMatch(text, keywords) {
  if (!text || !keywords?.length) return false
  return keywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()))
}

// Human-readable labels
const SWITCH_TARGET_LABELS = {
  consulting:           'consulting',
  finance:              'finance / investment banking',
  tech:                 'technology',
  healthcare:           'healthcare',
  entrepreneurship:     'entrepreneurship',
  'social-impact':      'social impact',
  'general-management': 'general management',
}

const GOAL_LABELS = {
  consulting:           'consulting',
  finance:              'finance',
  tech:                 'technology',
  healthcare:           'healthcare',
  entrepreneurship:     'entrepreneurship',
  'social-impact':      'social impact',
  'general-management': 'general management',
  'career-switch':      'target field',
}

// recruiterAccess key → goal value mapping
const GOAL_TO_ACCESS_KEY = {
  consulting:           'consulting',
  finance:              'investment-banking',
  tech:                 'technology',
  entrepreneurship:     'entrepreneurship',
  'general-management': 'general-management',
  'social-impact':      'social-impact',
  healthcare:           'healthcare',
}

// ---------------------------------------------------------------------------
// Comparative stats across the full results list
// ---------------------------------------------------------------------------

/**
 * Pre-compute aggregate stats from allScoredResults so we can rank this school.
 * Returns null if the array is empty / missing.
 */
function buildStats(allScoredResults) {
  if (!allScoredResults?.length) return null

  const ss = allScoredResults.map(r => r.school)

  const collect = fn => ss.map(fn).filter(n => n != null && isFinite(n))
  const avg = arr => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null)

  const salaries = collect(s => s.employment?.avgStartingSalary)
  const tuitions = collect(s => s.costs?.annualTuition)
  const empRates = collect(s => s.employment?.employmentRate3Months)
  const intlPcts = collect(s => s.classProfile?.internationalStudentPct)

  return {
    n:           allScoredResults.length,
    avgSalary:   avg(salaries),
    avgTuition:  avg(tuitions),
    avgEmpRate:  avg(empRates),
    maxIntlPct:  intlPcts.length ? Math.max(...intlPcts) : null,
    // Sorted for rank lookups
    salariesDesc: [...salaries].sort((a, b) => b - a),
    tuitionsAsc:  [...tuitions].sort((a, b) => a - b), // cheapest first
    empRatesDesc: [...empRates].sort((a, b) => b - a),
  }
}

/** Returns 1-based rank of val in sortedArr, or null if not found. */
function getRank(val, sortedArr) {
  if (val == null || !sortedArr?.length) return null
  const idx = sortedArr.findIndex(v => v === val)
  return idx === -1 ? null : idx + 1
}

/** Returns a comparative phrase for salary, e.g. "highest in your results". */
function salaryContext(school, stats) {
  const sal = school.employment?.avgStartingSalary
  if (sal == null || !stats?.salariesDesc) return null
  const rank = getRank(sal, stats.salariesDesc)
  if (rank === 1) return 'highest in your results'
  if (rank === 2) return '2nd highest in your results'
  if (rank === 3) return '3rd highest in your results'
  if (stats.avgSalary != null && sal > stats.avgSalary * 1.05)
    return `above the ${fmt(stats.avgSalary)} average across your results`
  return null
}

/** Returns a comparative phrase for tuition cost (lower = better). */
function tuitionContext(school, stats) {
  const tui = school.costs?.annualTuition
  if (tui == null || !stats?.tuitionsAsc) return null
  const rank = getRank(tui, stats.tuitionsAsc)
  if (rank === 1) return 'the lowest in your results'
  if (rank === 2) return '2nd most affordable in your results'
  if (rank === 3) return '3rd most affordable in your results'
  if (stats.avgTuition != null && tui < stats.avgTuition - 5_000)
    return `${fmt(stats.avgTuition - tui)} below the average for programs in your results (${fmt(stats.avgTuition)})`
  return null
}

/** Returns a comparative phrase for employment rate. */
function empRateContext(school, stats) {
  const rate = school.employment?.employmentRate3Months
  if (rate == null || !stats?.empRatesDesc) return null
  const rank = getRank(rate, stats.empRatesDesc)
  if (rank === 1) return 'best in your results'
  if (rank === 2) return '2nd best in your results'
  if (rank === 3) return '3rd best in your results'
  if (stats.avgEmpRate != null && rate > stats.avgEmpRate)
    return `above the ${stats.avgEmpRate}% average across your results`
  return null
}

// ---------------------------------------------------------------------------
// "Why this fits you" bullet generator
// ---------------------------------------------------------------------------

/**
 * Generate up to 4 personalised fit bullets for a school.
 *
 * @param {object} school            - School object from dataset
 * @param {object} formData          - User form state
 * @param {Array}  allScoredResults  - Full results array from runMatching()
 * @returns {string[]}               - Up to 4 bullets
 */
export function generateFitBullets(school, formData, allScoredResults) {
  const {
    postMBAGoal,
    careerSwitchTarget,
    currentRegion,
    priorities,
    examType,
    examScore,
    budgetSensitivity,
    campusEnv,
    yearsExperience,
  } = formData

  const isInternational = currentRegion !== 'north-america'
  const stats = buildStats(allScoredResults)
  const candidates = []

  // Effective goal: career switchers use their sub-target for real matching
  const effectiveGoal = postMBAGoal === 'career-switch' && careerSwitchTarget
    ? careerSwitchTarget
    : postMBAGoal
  const isCareerSwitch = postMBAGoal === 'career-switch' && !!careerSwitchTarget

  // ── 1. Industry / career placement ─────────────────────────────────────────
  const industryKW = GOAL_TO_INDUSTRY_KW[effectiveGoal] || []
  const top3 = school.employment.top3Industries || []
  const matchedIndustry = top3.find(ind => kwMatch(ind, industryKW))

  if (matchedIndustry) {
    const rank = top3.indexOf(matchedIndustry) + 1
    const rankLabel = rank === 1 ? '#1' : rank === 2 ? '#2' : '#3'

    // Enrich with recruiter access tier when available
    const accessKey = GOAL_TO_ACCESS_KEY[effectiveGoal]
    const accessTier = accessKey ? school.recruiterAccess?.[accessKey] : null
    const pipelineStr = accessTier === 'target'
      ? ' with a dedicated on-campus recruiting pipeline'
      : accessTier === 'core'
      ? ' with strong on-campus recruiting'
      : ''

    let text
    if (isCareerSwitch) {
      const switchLabel = SWITCH_TARGET_LABELS[careerSwitchTarget] || careerSwitchTarget
      text = `${matchedIndustry} is the ${rankLabel} destination for graduates — strong ${switchLabel} placement${pipelineStr}`
    } else {
      const goalLabel = GOAL_LABELS[effectiveGoal] || effectiveGoal.replace(/-/g, ' ')
      text = `${matchedIndustry} is the ${rankLabel} destination for graduates${pipelineStr} — aligned with your ${goalLabel} goal`
    }
    candidates.push({ score: rank === 1 ? 10 : rank === 2 ? 8 : 6, text })
  }

  // ── 2. Campus environment match ─────────────────────────────────────────────
  if (campusEnv && campusEnv !== 'no-preference' && school.campusType === campusEnv) {
    const city = school.location.city || school.name
    const text = campusEnv === 'urban'
      ? `Urban campus in ${city} — matches your preference for a city environment`
      : `Campus-town setting in ${city} — matches your preference for a quieter college-town feel`
    candidates.push({ score: 9, text })
  }

  // ── 3. Average starting salary (with comparative context) ──────────────────
  const salary = school.employment?.avgStartingSalary
  if (salary != null) {
    const ctx = salaryContext(school, stats)
    const bonus = school.employment?.medianSigningBonus
    const bonusStr = bonus != null ? ` + ${fmt(bonus)} median signing bonus` : ''
    const text = ctx
      ? `${fmt(salary)} avg starting salary — ${ctx}${bonusStr}`
      : `${fmt(salary)} avg starting salary${bonusStr}`
    const baseScore = salary >= 175_000 ? 8 : salary >= 150_000 ? 6 : salary >= 120_000 ? 4 : 2
    candidates.push({ score: ctx ? baseScore + 1 : baseScore, text })
  }

  // ── 4. Employment rate (with comparative context) ──────────────────────────
  const empRate = school.employment?.employmentRate3Months
  if (empRate != null && empRate >= 88) {
    const ctx = empRateContext(school, stats)
    const text = ctx
      ? `${empRate}% employed within 3 months — ${ctx}`
      : `${empRate}% employed within 3 months of graduation`
    candidates.push({ score: empRate >= 95 ? 8 : empRate >= 90 ? 6 : 4, text })
  }

  // ── 5. Tuition value (comparative, only when budget matters) ───────────────
  const tuition = school.costs?.annualTuition
  if (tuition != null && budgetSensitivity !== 'not-concern') {
    const ctx = tuitionContext(school, stats)
    if (ctx) {
      candidates.push({
        score: 8,
        text: `At ${fmt(tuition)}/year, tuition is ${ctx}`,
      })
    } else if (tuition < 65_000) {
      candidates.push({
        score: 5,
        text: `Annual tuition of ${fmt(tuition)}/year is below the peer-program average — a meaningful cost advantage`,
      })
    }
  }

  // ── 6. Work experience sweet spot ──────────────────────────────────────────
  const avgWE = school.classProfile?.avgWorkExperience
  const userYrs = parseFloat(yearsExperience)
  if (avgWE != null && !isNaN(userYrs) && userYrs > 0) {
    const gap = Math.abs(userYrs - avgWE)
    if (gap <= 0.5) {
      candidates.push({
        score: 7,
        text: `Average student enters with ${avgWE} years' experience — you're right in the sweet spot at ${userYrs}`,
      })
    } else if (gap <= 1.5) {
      candidates.push({
        score: 5,
        text: `Typical student has ${avgWE} years' experience — your ${userYrs} years puts you close to the class profile`,
      })
    }
  }

  // ── 7. International cohort (relevant for non-US applicants only) ───────────
  const intlPct = school.classProfile?.internationalStudentPct
  if (isInternational && intlPct != null && intlPct > 35) {
    const isTopIntl = stats?.maxIntlPct != null && intlPct >= stats.maxIntlPct && stats.n > 1
    let text
    if (isTopIntl) {
      text = `${intlPct}% international cohort — highest in your results, with strong cross-border recruiting networks`
    } else if (intlPct > 40) {
      text = `${intlPct}% international cohort — robust global community and cross-border alumni networks`
    } else {
      text = `${intlPct}% international students — meaningful global peer group and international alumni network`
    }
    candidates.push({ score: intlPct > 40 ? 9 : 6, text })
  }

  // ── 8. STEM OPT (international applicants only) ────────────────────────────
  if (isInternational && school.stemOpt) {
    candidates.push({
      score: 7,
      text: `STEM-designated program — F-1 students eligible for 3-year OPT extension, giving you more runway to secure sponsorship`,
    })
  }

  // ── 9. Small class size ─────────────────────────────────────────────────────
  const size = school.classProfile?.size
  if (size != null && size < 320) {
    if (size < 160) {
      candidates.push({
        score: 6,
        text: `Very small class of ${size} — exceptional faculty access and a tight-knit, lasting alumni network`,
      })
    } else {
      candidates.push({
        score: 4,
        text: `Intimate class of ${size} — stronger peer bonds and more individualised career support than larger programs`,
      })
    }
  }

  // ── 10. Collaborative culture (only when user rates it highly) ──────────────
  const collabRating = priorities?.collaborativeCulture ?? 3
  const collabTag = school.culture?.find(c =>
    c.toLowerCase().includes('collaborative') || c.toLowerCase().includes('team')
  )
  if (collabRating >= 4 && collabTag) {
    const highlight = collabTag.length > 40 ? collabTag.slice(0, 40).trimEnd() + '…' : collabTag
    candidates.push({
      score: 8,
      text: `Culture known for "${highlight}" — matches your preference for a collaborative environment`,
    })
  }

  // ── 11. Academic strength match ─────────────────────────────────────────────
  const strengthMap = {
    entrepreneurship:     'Entrepreneurship',
    finance:              'Finance',
    tech:                 'Technology',
    healthcare:           'Healthcare',
    'social-impact':      'Social Enterprise',
    consulting:           'Strategy',
  }
  const targetStrength = strengthMap[effectiveGoal]
  if (targetStrength && school.academicStrengths?.length) {
    const hasStrength = school.academicStrengths.some(s =>
      s.toLowerCase().includes(targetStrength.toLowerCase())
    )
    if (hasStrength) {
      candidates.push({
        score: 7,
        text: `${targetStrength} is one of the program's academic strengths — dedicated coursework, faculty, and alumni networks`,
      })
    }
  }

  // ── 12. GMAT / GMAT Focus positive signal ──────────────────────────────────
  if (examType === 'gmat-focus' && examScore) {
    const rawScore = parseInt(examScore)
    const avg = school.classProfile?.avgGMAT
    if (rawScore && avg) {
      const converted = focusToClassic(rawScore)
      if (avg - converted <= 10) {
        candidates.push({
          score: 7,
          text: `Your GMAT Focus (${rawScore}) converts to ~${converted} Classic — at or above their class average of ${avg}`,
        })
      }
    }
  } else if (examType === 'gmat-classic' && examScore) {
    const score = parseInt(examScore)
    const avg = school.classProfile?.avgGMAT
    if (score && avg && score >= avg) {
      candidates.push({
        score: 7,
        text: `Your GMAT of ${score} meets or exceeds their class average of ${avg} — a strong academic signal`,
      })
    }
  }

  // ── Sort by relevance, return top 4 ────────────────────────────────────────
  candidates.sort((a, b) => b.score - a.score)
  return candidates.slice(0, 4).map(c => c.text)
}

// ---------------------------------------------------------------------------
// "Watch out for" warning generator — returns up to 3 warnings as an array
// ---------------------------------------------------------------------------

/**
 * Return an ordered list of the most important cautions for this school.
 *
 * @param {object} school            - School from dataset
 * @param {object} formData          - User form state
 * @param {Array}  allScoredResults  - Full results array from runMatching()
 * @returns {string[]}               - 1–3 warning strings (highest priority first)
 */
export function generateWatchOut(school, formData, allScoredResults) {
  const { examScore, examType, budgetSensitivity, campusEnv } = formData
  const stats = buildStats(allScoredResults)
  const warnings = []

  // ── 1. Test score gap ───────────────────────────────────────────────────────
  const score = parseInt(examScore)
  if (score > 0 && examType && examType !== 'none') {
    if (examType === 'gre') {
      const avg = school.classProfile?.avgGRE
      if (avg != null) {
        const gap = avg - score
        // GRE bands: 8+ pts below ≈ 40 GMAT pts, 4+ pts ≈ 20 GMAT pts
        if (gap >= 8) {
          warnings.push({
            priority: 10,
            text: `Your GRE (${score}) is ${gap} pts below the class avg of ${avg} — consider this a reach; invest heavily in essays and recommendations`,
          })
        } else if (gap >= 4) {
          warnings.push({
            priority: 8,
            text: `Your GRE (${score}) is ${gap} pts below the class avg of ${avg} — a compelling narrative and strong recommenders will matter more here`,
          })
        }
      }
    } else if (examType === 'gmat-focus') {
      const avg = school.classProfile?.avgGMAT
      if (avg != null) {
        const converted = focusToClassic(score)
        const gap = avg - converted
        if (gap > 40) {
          warnings.push({
            priority: 10,
            text: `Your GMAT Focus (${score}) converts to ~${converted} Classic — ${gap} pts below their avg of ${avg}. Strong essays and recommendations will be critical`,
          })
        } else if (gap > 10) {
          warnings.push({
            priority: 8,
            text: `Your GMAT Focus (${score}) converts to ~${converted} Classic — ${gap} pts below their avg of ${avg}. A strong narrative and recommenders will help bridge the gap`,
          })
        }
        // gap ≤ 10 → surfaced as a positive fit bullet instead
      }
    } else {
      // gmat-classic
      const avg = school.classProfile?.avgGMAT
      if (avg != null) {
        const gap = avg - score
        if (gap > 40) {
          warnings.push({
            priority: 10,
            text: `Your GMAT (${score}) is ${gap} pts below the class avg of ${avg} — consider this a reach; invest heavily in essays and recommendations`,
          })
        } else if (gap > 20) {
          warnings.push({
            priority: 8,
            text: `Your GMAT (${score}) is ${gap} pts below the class avg of ${avg} — a compelling narrative and strong recommenders will matter more here`,
          })
        }
      }
    }
  }

  // ── 2. Tuition cost warning ─────────────────────────────────────────────────
  const tuition = school.costs?.annualTuition
  if (
    tuition != null &&
    (budgetSensitivity === 'major-factor' || budgetSensitivity === 'matters-somewhat')
  ) {
    if (stats?.avgTuition != null && tuition > stats.avgTuition + 5_000) {
      warnings.push({
        priority: 7,
        text: `At ${fmt(tuition)}/year, this is above the ${fmt(stats.avgTuition)} average for programs in your results — research scholarship availability before committing`,
      })
    } else if (tuition > 75_000) {
      warnings.push({
        priority: 7,
        text: `At ${fmt(tuition)}/year, annual tuition is on the higher end — factor in total cost of attendance and scholarship availability`,
      })
    }
  }

  // ── 3. Campus environment mismatch ─────────────────────────────────────────
  if (campusEnv && campusEnv !== 'no-preference' && school.campusType !== campusEnv) {
    const text = campusEnv === 'urban'
      ? `Campus-town setting — you indicated a preference for an urban environment; worth a campus visit to see if the vibe works for you`
      : `Urban campus — you indicated a preference for a quieter campus-town setting; consider whether the city energy fits your lifestyle`
    warnings.push({ priority: 5, text })
  }

  // ── 4. Below-average employment rate ───────────────────────────────────────
  const empRate = school.employment?.employmentRate3Months
  if (empRate != null && empRate < 88) {
    const vs = stats?.avgEmpRate != null
      ? ` vs. ${stats.avgEmpRate}% average across your results`
      : ''
    warnings.push({
      priority: 6,
      text: `${empRate}% placed within 3 months${vs} — ask specifically about on-campus recruiting reach and career coach quality`,
    })
  }

  // ── Fallback ────────────────────────────────────────────────────────────────
  if (!warnings.length) {
    return [
      `Strong overall fit — dig into alumni outcomes in your specific target function and region before finalising your list`,
    ]
  }

  warnings.sort((a, b) => b.priority - a.priority)
  return warnings.slice(0, 3).map(w => w.text)
}
