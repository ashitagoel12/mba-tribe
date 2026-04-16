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
    affordability: budgetSensitivity === 'major-factor'
      ? 20
      : budgetSensitivity === 'matters-somewhat'
        ? 14
        : 8,

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
 * Supports GMAT Focus, GMAT Classic, and GRE.
 * If no score entered or exam type is 'none', returns neutral 7.
 */
function scoreTestScore(school, formData) {
  const { examType, examScore } = formData
  const score = parseInt(examScore)

  if (!examType || examType === 'none' || !score || score === 0) return 7

  let avg, gap
  if (examType === 'gre') {
    avg = school.classProfile.avgGRE
    gap = avg - score
  } else {
    // gmat-focus and gmat-classic treated equivalently
    avg = school.classProfile.avgGMAT
    gap = avg - score
  }

  if (gap <= 10) return 10  // at or above average
  if (gap <= 30) return 7   // within 30 pts — reasonable
  if (gap <= 50) return 4   // 30–50 pts below — tough
  return 0                   // 50+ below — stretch territory
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
 * Supports GMAT and GRE.
 */
function isStretch(school, formData) {
  const { examType, examScore } = formData
  const score = parseInt(examScore)
  if (!score || score === 0 || examType === 'none' || !examType) return false

  if (examType === 'gre') {
    return score < school.classProfile.avgGRE - 30
  }
  // gmat-focus and gmat-classic
  return score < school.classProfile.avgGMAT - 30
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

  let strongFitRaw = regularPool.filter(s => s.totalScore >= STRONG_THRESHOLD).slice(0, 6)

  // Guarantee at least 3 schools in Strong Fit regardless of scores
  if (strongFitRaw.length < 3) {
    strongFitRaw = regularPool.slice(0, Math.max(3, strongFitRaw.length))
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
    .filter(s => !knownIds.has(s.school.id) && s.totalScore >= 50)
    .slice(0, 2)
    .map(s => ({ ...s, tier: 'exploring' }))

  return {
    strongFit,
    worthExploring,
    stretch,
    hiddenGems,
    allScored: scored,
  }
}
