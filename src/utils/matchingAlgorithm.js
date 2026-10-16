/**
 * matchingAlgorithm.js
 * ---------------------------------------------------------------------------
 * Pure scoring functions — no React, no side effects.
 * Easy to unit-test independently of the UI.
 *
 * SCORE ARCHITECTURE
 * ------------------
 * Each school receives a raw score across 10 dimensions. Each dimension is
 * normalised to a 0–1 fraction and multiplied by an adjustable weight.
 * Weights sum to a dynamic total, and the final score is expressed as
 * a 0–100 integer.
 *
 * Weights respond to the user's priority ratings so that the dimensions
 * they care most about drive the result.
 *
 * TIER CUTOFFS (applied after scoring)
 * -------------------------------------
 * Strong Fit      : top schools, score >= 65 (floor: always show >= 3)
 * Worth Exploring : score 45–64
 * Stretch         : exam score gap > 30 pts AND otherwise reasonable fit
 *                   (score >= 40 when test dimension is treated as neutral)
 *
 * To adjust weights, edit the `buildWeights()` function below.
 * To add more schools, just append to the JSON — no code changes needed.
 * ---------------------------------------------------------------------------
 */

import {
  M7_IDS,
  T15_IDS,
  GOAL_TO_INDUSTRY_KW,
  GOAL_TO_STRENGTH_KW,
} from './constants.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Case-insensitive substring match helper. */
function kwMatch(text, keywords) {
  if (!text || !keywords?.length) return false
  return keywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()))
}

/** Match a keyword list against an array of strings. */
function kwMatchAny(arr, keywords) {
  if (!arr?.length || !keywords?.length) return false
  return arr.some(item => kwMatch(item, keywords))
}

/**
 * Convert a GMAT Focus Edition score (205–805) to its GMAT Classic equivalent (200–800).
 * Source: GMAC Official Score Concordance Table, published July 2025.
 * For scores between table entries (Focus scores are multiples of 10 ending in 5),
 * we round to the nearest table entry before lookup.
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
  // Clamp to valid Focus range, then round to nearest table entry (multiples of 10, ending in 5)
  const clamped = Math.min(805, Math.max(205, focusScore))
  const rounded = Math.round((clamped - 5) / 10) * 10 + 5
  return table[rounded] ?? 500 // fallback to midpoint if somehow out of range
}

// ---------------------------------------------------------------------------
// Weight builder — edit this to tune the algorithm
// ---------------------------------------------------------------------------

/**
 * Build the scoring weight object based on user inputs.
 *
 * @param {object} formData
 * @returns {object} weights keyed by dimension name
 */
function buildWeights(formData) {
  const { priorities, budgetSensitivity, currentRegion } = formData
  const isInternational = currentRegion !== 'north-america'

  return {
    // Career goal alignment — scales with how much user cares about placement
    career: 15 + (priorities.industryPlacement / 5) * 20, // 19–35

    // Campus environment preference
    campusEnv: priorities.campusEnvironment <= 2
      ? 5
      : 5 + (priorities.campusEnvironment / 5) * 10, // 6–15

    // Affordability — scales with budget sensitivity
    // Takes the stronger of the two signals: the budget answer and the 1–5 rating.
    affordability: Math.max(
      budgetSensitivity === 'major-factor' ? 20 : budgetSensitivity === 'matters-somewhat' ? 14 : 8,
      4 + (priorities.affordability ?? 3) * 3, // 7–19
    ),

    // ROI (salary-to-cost ratio) — separate from raw affordability
    roi: budgetSensitivity === 'major-factor'
      ? 15
      : budgetSensitivity === 'matters-somewhat'
        ? 10
        : 5,

    // International student support — heavily upweighted for non-US applicants
    international: isInternational
      ? 10 + (priorities.internationalSupport / 5) * 15  // 12–25
      : 5 + (priorities.internationalSupport / 5) * 8,   // 6–13

    // Culture fit — scales with collaborative culture rating
    culture: 8 + (priorities.collaborativeCulture / 5) * 12, // 10.4–20

    // Test score competitiveness
    gmat: 10,

    // Employment rate quality
    employment: 10,

    // Prestige / brand — flattened when user doesn't care about rankings
    prestige: priorities.prestige <= 2 ? 4 : 5 + (priorities.prestige / 5) * 8,

    // Work experience fit — fixed small signal
    workExperience: 6,
  }
}

// ---------------------------------------------------------------------------
// Dimension scorers — each returns a raw score 0..maxPts
// ---------------------------------------------------------------------------

/**
 * 1. Career Goal Alignment — max 25 pts
 * Maps the user's post-MBA goal to industry keywords and academic strengths.
 * Career switchers use their careerSwitchTarget sub-goal for real matching.
 */
function scoreCareer(school, formData) {
  const { postMBAGoal } = formData

  // Career switchers with a target get real matching against that target
  let effectiveGoal = postMBAGoal
  if (postMBAGoal === 'career-switch' && formData.careerSwitchTarget) {
    effectiveGoal = formData.careerSwitchTarget
  }

  const industryKW = GOAL_TO_INDUSTRY_KW[effectiveGoal] || []
  const strengthKW = GOAL_TO_STRENGTH_KW[effectiveGoal] || []

  if (!industryKW.length) return 12 // neutral goals (career-switch w/o target, other)

  const top3 = school.employment.top3Industries
  let base = 0

  // Primary industry match scores highest
  if (kwMatch(top3[0], industryKW)) base = 25
  else if (kwMatch(top3[1], industryKW)) base = 17
  else if (kwMatch(top3[2], industryKW)) base = 11
  else base = 4 // goal industry not in top 3

  // Apply recruiterAccess multiplier — reflects whether structured pipelines exist
  const goalToAccessKey = {
    'consulting':          'consulting',
    'finance':             'investment-banking',
    'tech':                'technology',
    'entrepreneurship':    'entrepreneurship',
    'general-management':  'general-management',
    'social-impact':       'social-impact',
    'healthcare':          'healthcare',
  }
  const accessKey = goalToAccessKey[effectiveGoal]
  if (accessKey) {
    const accessTier = school.recruiterAccess?.[accessKey]
    const multipliers = { target: 1.0, core: 0.75, broad: 0.45, limited: 0.20 }
    const multiplier = multipliers[accessTier] ?? 0.60
    base = Math.round(base * multiplier)
  }

  // Academic strength bonus applied after multiplier (capped so max stays 25)
  const hasStrength = kwMatchAny(school.academicStrengths, strengthKW)
  return Math.min(base + (hasStrength ? 5 : 0), 25)
}

/**
 * 2. Campus Environment Match — max 10 pts
 * Matches user's campus preference against school's campusType field.
 */
function scoreCampusEnv(school, formData) {
  const pref = formData.campusEnv
  if (!pref || pref === 'no-preference') return 10
  return school.campusType === pref ? 10 : 3
}

/**
 * 3. Affordability — max 15 pts
 * Tiers based on annual tuition. Scholarship deal-breaker further penalises.
 */
function scoreAffordability(school, formData) {
  const t = school.costs.annualTuition
  let score
  if (t < 55000) score = 15
  else if (t < 70000) score = 10
  else if (t < 80000) score = 6
  else score = 2

  // Scholarship signal — penalise very expensive schools for deal-breaker users
  if (formData.scholarshipImportance === 'deal-breaker' && school.costs.annualTuition > 80000) {
    score = Math.max(score - 4, 0)
  }

  return score
}

/**
 * 4. ROI — Salary-to-Cost Ratio — max 10 pts
 * Uses avgStartingSalary / totalProgramCost as a return signal.
 */
function scoreROI(school) {
  const salary = school.employment.avgStartingSalary
  const cost   = school.costs.totalProgramCost
  if (!salary || !cost) return 5 // neutral if data missing

  const ratio = salary / cost
  if (ratio >= 1.3) return 10
  if (ratio >= 1.1) return 7
  if (ratio >= 0.9) return 5
  return 3
}

/**
 * 5. International Student Support — max 15 pts
 * Based on % international students + STEM OPT bonus for F-1 visa holders.
 */
function scoreInternational(school, formData) {
  const pct = school.classProfile.internationalStudentPct
  let score
  if (pct > 40) score = 15
  else if (pct >= 35) score = 10
  else if (pct >= 30) score = 6
  else score = 2

  // STEM OPT bonus — meaningful for international students on F-1 visa
  const isInternational = formData.currentRegion !== 'north-america'
  if (isInternational && school.stemOpt) {
    score = Math.min(score + 3, 15)
  }

  return score
}

/**
 * 6. Culture Fit — max 15 pts
 * Rewards collaborative culture when user rates it highly;
 * penalises competitive schools for users seeking collaborative environments.
 */
function scoreCulture(school, formData) {
  const { priorities } = formData
  const collabRating = priorities.collaborativeCulture
  const cultureTags  = school.culture.map(c => c.toLowerCase())

  const hasCollab = cultureTags.some(c =>
    c.includes('collaborative') || c.includes('team') || c.includes('community')
  )
  const hasCompetitive = cultureTags.some(c =>
    c.includes('competitive') || c.includes('cutthroat') || c.includes('high energy')
  )
  const hasMission = cultureTags.some(c =>
    c.includes('mission') || c.includes('social') || c.includes('beyond yourself')
  )

  let score = 5 // base

  if (collabRating >= 4) {
    if (hasCollab && !hasCompetitive)  score = 15
    else if (hasCollab && hasCompetitive) score = 10
    else if (hasCompetitive)           score = 3   // explicit mismatch
    else                               score = 7
  } else if (collabRating >= 3) {
    if (hasCollab) score = 10
    else           score = 7
  } else {
    // User doesn't care about collaboration — flatten scores
    score = 8
  }

  // Small mission-driven bonus for social impact goals
  if (hasMission && formData.postMBAGoal === 'social-impact') {
    score = Math.min(score + 2, 15)
  }

  // M7 prestige bonus when user values brand
  if (priorities.prestige >= 4 && M7_IDS.has(school.id)) {
    score = Math.min(score + 2, 15)
  }

  return score
}

/**
 * 7. Test Score Competitiveness — max 10 pts
 * Supports GMAT Focus (converted to Classic via concordance), GMAT Classic, and GRE.
 * Returns neutral 7 if no score or exam type is 'none'.
 */
function scoreTestScore(school, formData) {
  const { examType, examScore } = formData
  const rawScore = parseInt(examScore)

  if (!examType || examType === 'none' || !rawScore) return 7

  let avg, gap
  if (examType === 'gre') {
    avg = school.classProfile.avgGRE
    if (!avg) return 7
    gap = avg - rawScore
  } else if (examType === 'gmat-focus') {
    avg = school.classProfile.avgGMAT
    if (!avg) return 7
    gap = avg - focusToClassic(rawScore)
  } else {
    // gmat-classic
    avg = school.classProfile.avgGMAT
    if (!avg) return 7
    gap = avg - rawScore
  }

  // GRE totals run 260–340, so a point there is worth roughly 5 GMAT points.
  // Scale the gap bands to the exam so GRE takers are scored on the same footing.
  const unit = examType === 'gre' ? 0.2 : 1
  if (gap <= 10 * unit) return 10  // at or above average
  if (gap <= 30 * unit) return 7   // within 30 GMAT-equivalent pts — reasonable
  if (gap <= 50 * unit) return 4   // 30–50 below — tough
  return 0                          // 50+ below — stretch territory
}

/**
 * 8. Employment Rate Quality — max 10 pts
 */
function scoreEmployment(school) {
  const r = school.employment.employmentRate3Months
  if (r >= 95) return 10
  if (r >= 90) return 8
  if (r >= 85) return 6
  if (r >= 80) return 4
  return 2
}

/**
 * 9. Prestige / Brand Weight — max 10 pts
 */
function scorePrestige(school, formData) {
  const rating = formData.priorities.prestige
  if (rating <= 2) return 5 // user doesn't care — everyone scores the same
  if (M7_IDS.has(school.id)) return 10
  if (T15_IDS.has(school.id)) return 6
  return 2
}

/**
 * 10. Work Experience Fit — max 6 pts
 * Checks how close the user's years of experience is to the school's average.
 */
function scoreWorkExperience(school, formData) {
  const years = parseFloat(formData.yearsExperience)
  if (!years && years !== 0) return 3 // neutral if blank
  const avg = school.classProfile.avgWorkExperience
  const gap = Math.abs(avg - years)

  if (gap <= 0.5) return 6  // very close to school average
  if (gap <= 1.5) return 4  // within 1.5 years — fine
  if (gap <= 3.0) return 2  // notable mismatch
  return 1                   // significant outlier
}

// ---------------------------------------------------------------------------
// Primary export: score a single school against user inputs
// ---------------------------------------------------------------------------

/**
 * Score one school against the user's form data.
 *
 * @param {object} school    - Single school object from the JSON dataset
 * @param {object} formData  - User form state
 * @returns {{ school, totalScore, breakdown, tier }}
 *   tier is initially null; set by runMatching() after sorting.
 */
export function scoreSchool(school, formData) {
  const weights = buildWeights(formData)
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)

  const raw = {
    career:         scoreCareer(school, formData),
    campusEnv:      scoreCampusEnv(school, formData),
    affordability:  scoreAffordability(school, formData),
    roi:            scoreROI(school),
    international:  scoreInternational(school, formData),
    culture:        scoreCulture(school, formData),
    gmat:           scoreTestScore(school, formData),
    employment:     scoreEmployment(school),
    prestige:       scorePrestige(school, formData),
    workExperience: scoreWorkExperience(school, formData),
  }

  const maxRaw = {
    career: 25, campusEnv: 10, affordability: 15,
    roi: 10, international: 15, culture: 15,
    gmat: 10, employment: 10, prestige: 10, workExperience: 6,
  }

  // Weighted sum, normalised to 0–100
  const weightedSum = Object.keys(weights).reduce((sum, key) => {
    const fraction = raw[key] / maxRaw[key]
    return sum + fraction * weights[key]
  }, 0)

  const totalScore = Math.min(Math.round((weightedSum / totalWeight) * 100), 100)

  return {
    school,
    totalScore,
    breakdown: raw,
    tier: null, // assigned by runMatching()
  }
}

// ---------------------------------------------------------------------------
// Stretch detection
// ---------------------------------------------------------------------------

/**
 * A school is a "stretch" if the user's score is > 30 pts below the school avg.
 * Supports GMAT Focus (converted via concordance), GMAT Classic, and GRE.
 * Returns false if the school has no avg score for the given exam type.
 */
function isStretch(school, formData) {
  const { examType, examScore } = formData
  const rawScore = parseInt(examScore)
  if (!rawScore || examType === 'none' || !examType) return false

  if (examType === 'gre') {
    const avg = school.classProfile.avgGRE
    if (!avg) return false
    return rawScore < avg - 6 // ≈ 30 GMAT points on the GRE scale
  } else if (examType === 'gmat-focus') {
    const avg = school.classProfile.avgGMAT
    if (!avg) return false
    return focusToClassic(rawScore) < avg - 30
  } else {
    // gmat-classic
    const avg = school.classProfile.avgGMAT
    if (!avg) return false
    return rawScore < avg - 30
  }
}

/**
 * Score the same school but treat test score as neutral (0).
 * Used to determine if a stretch school is still "otherwise a reasonable fit."
 */
function scoreWithNeutralTest(school, formData) {
  const neutralForm = { ...formData, examScore: '0' }
  return scoreSchool(school, neutralForm).totalScore
}

// ---------------------------------------------------------------------------
// Primary export: run matching across the full school list
// ---------------------------------------------------------------------------

/**
 * Run the matching algorithm over every school and return tiered results.
 *
 * @param {object[]} schools   - Full array from mba_schools_data.json
 * @param {object}   formData  - User form state
 * @returns {{
 *   strongFit:      ScoredSchool[],
 *   strongLabel:    'strong' | 'best',
 *   worthExploring: ScoredSchool[],
 *   stretch:        ScoredSchool[],
 *   hiddenGems:     ScoredSchool[],
 *   allScored:      ScoredSchool[],
 * }}
 */
export function runMatching(schools, formData) {
  // Score every school
  const scored = schools.map(s => scoreSchool(s, formData))

  // Sort descending by fit score
  scored.sort((a, b) => b.totalScore - a.totalScore)

  // Separate stretch vs non-stretch
  const stretchPool = []
  const regularPool = []

  for (const s of scored) {
    if (isStretch(s.school, formData)) {
      // Only include as stretch if it would otherwise be a reasonable fit
      const neutralScore = scoreWithNeutralTest(s.school, formData)
      if (neutralScore >= 40) {
        stretchPool.push({ ...s, tier: 'stretch' })
      }
    } else {
      regularPool.push(s)
    }
  }

  // Tier the regular pool
  const STRONG_THRESHOLD    = 65
  const EXPLORING_THRESHOLD = 45

  // A stated campus preference is a hard filter for the top tier, unless the
  // user rated campus vibe as low priority (1–2). A school that misses it can
  // still appear in Worth Exploring, where its trade-off is shown.
  const campusPref = formData.campusEnv
  const campusMatters = campusPref && campusPref !== 'no-preference' &&
    (formData.priorities?.campusEnvironment ?? 3) >= 3
  const topEligible = campusMatters
    ? regularPool.filter(s => s.school.campusType === campusPref)
    : regularPool

  let strongFitRaw = topEligible.filter(s => s.totalScore >= STRONG_THRESHOLD).slice(0, 6)

  // Always show at least 3 top matches. When they come from below the
  // threshold, label them honestly as "best available" rather than "strong".
  let strongLabel = 'strong'
  if (strongFitRaw.length < 3) {
    strongFitRaw = topEligible.slice(0, 3)
    strongLabel = 'best'
  }

  const strongFitIds = new Set(strongFitRaw.map(s => s.school.id))

  const worthExploringRaw = regularPool
    .filter(s => !strongFitIds.has(s.school.id) && s.totalScore >= EXPLORING_THRESHOLD)
    .slice(0, 8)

  // Assign tiers
  const strongFit      = strongFitRaw.map(s => ({ ...s, tier: 'strong' }))
  const worthExploring = worthExploringRaw.map(s => ({ ...s, tier: 'exploring' }))
  const stretch        = stretchPool.slice(0, 4)

  // Hidden gems: non-M7, non-T15 schools that score surprisingly well
  const knownIds = new Set([...M7_IDS, ...T15_IDS])
  const hiddenGems = regularPool
    .filter(s => !knownIds.has(s.school.id) && !strongFitIds.has(s.school.id) && s.totalScore >= 50)
    .slice(0, 2)
    .map(s => ({ ...s, tier: 'exploring' }))

  return {
    strongFit,
    strongLabel,
    worthExploring,
    stretch,
    hiddenGems,
    allScored: scored,
  }
}
