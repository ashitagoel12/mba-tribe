/**
 * matchingAlgorithm.js
 * ---------------------------------------------------------------------------
 * Pure scoring functions — no React, no side effects.
 * Easy to unit-test independently of the UI.
 *
 * SCORE ARCHITECTURE
 * ------------------
 * Each school receives a raw score in 8 dimensions. Each dimension is
 * normalised to a 0–1 fraction and multiplied by an adjustable weight.
 * Weights sum to a dynamic total, and the final score is expressed as
 * a 0–100 integer.
 *
 * Weights respond to the user's priority ratings so that the dimensions
 * they care most about drive the result.
 *
 * TIER CUTOFFS (applied after scoring)
 * -------------------------------------
 * Strong Fit   : top schools, score >= 65 (floor: always show ≥ 3)
 * Worth Exploring : score 45–64
 * Stretch      : GMAT gap > 30 pts AND otherwise reasonable fit (score >= 40
 *                when GMAT dimension is treated as neutral)
 *
 * To adjust weights, edit the `buildWeights()` function below.
 * To add more schools, just append to the JSON — no code changes needed.
 * ---------------------------------------------------------------------------
 */

import {
  M7_IDS,
  T15_IDS,
  STATE_TO_GEO,
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
 * Base weights sum to ~110 before user-priority adjustments.
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

    // Geography — fixed; geography is binary (matches or it doesn't)
    geography: 15,

    // Affordability — doubles if cost is a major factor
    affordability: budgetSensitivity === 'major-factor'
      ? 25
      : budgetSensitivity === 'matters-somewhat'
        ? 18
        : 10 + (priorities.affordability / 5) * 5,

    // International student support — heavily upweighted for non-US applicants
    international: isInternational
      ? 10 + (priorities.internationalSupport / 5) * 15  // 12–25
      : 5 + (priorities.internationalSupport / 5) * 8,   // 6–13

    // Culture fit — scales with collaborative culture rating
    culture: 8 + (priorities.collaborativeCulture / 5) * 12, // 10.4–20

    // GMAT competitiveness
    gmat: 10,

    // Employment rate quality
    employment: 10,

    // Prestige / brand — flattened when user doesn't care about rankings
    prestige: priorities.prestige <= 2 ? 4 : 5 + (priorities.prestige / 5) * 8,
  }
}

// ---------------------------------------------------------------------------
// Dimension scorers — each returns a raw score 0..maxPts
// ---------------------------------------------------------------------------

/**
 * 1. Career Goal Alignment — max 25 pts
 * Maps the user's post-MBA goal to industry keywords and academic strengths.
 */
function scoreCareer(school, formData) {
  const { postMBAGoal } = formData
  const industryKW = GOAL_TO_INDUSTRY_KW[postMBAGoal] || []
  const strengthKW  = GOAL_TO_STRENGTH_KW[postMBAGoal] || []

  if (!industryKW.length) return 12 // neutral goals (career-switch, other)

  const top3 = school.employment.top3Industries
  let base = 0

  // Primary industry match scores highest
  if (kwMatch(top3[0], industryKW)) base = 25
  else if (kwMatch(top3[1], industryKW)) base = 17
  else if (kwMatch(top3[2], industryKW)) base = 11
  else base = 4 // goal industry not in top 3

  // Academic strength bonus (capped so max stays 25)
  const hasStrength = kwMatchAny(school.academicStrengths, strengthKW)
  return Math.min(base + (hasStrength ? 5 : 0), 25)
}

/**
 * 2. Geography Match — max 15 pts
 * Maps the user's target region to the school's state.
 */
function scoreGeography(school, formData) {
  const { targetGeography } = formData
  if (targetGeography === 'flexible') return 15
  if (targetGeography === 'outside-us') return 2 // all schools are US-based
  const schoolGeo = STATE_TO_GEO[school.location.state]
  return schoolGeo === targetGeography ? 15 : 2
}

/**
 * 3. Affordability — max 15 pts (effective max raised to 25 via weight)
 * Tiers based on annual tuition.
 */
function scoreAffordability(school) {
  const t = school.costs.annualTuition
  if (t < 55000) return 15
  if (t < 70000) return 10
  if (t < 80000) return 6
  return 2
}

/**
 * 4. International Student Support — max 15 pts (weight doubles for non-US)
 * Based on % international students in the cohort.
 */
function scoreInternational(school) {
  const pct = school.classProfile.internationalStudentPct
  if (pct > 40) return 15
  if (pct >= 35) return 10
  if (pct >= 30) return 6
  return 2
}

/**
 * 5. Culture Fit — max 15 pts
 * Rewards collaborative culture when user rates it highly;
 * rewards prestige-adjacent culture signals when user rates prestige highly.
 */
function scoreCulture(school, formData) {
  const { priorities } = formData
  const collabRating = priorities.collaborativeCulture

  const hasCollab = school.culture.some(c =>
    c.toLowerCase().includes('collaborative') || c.toLowerCase().includes('team')
  )
  const hasMission = school.culture.some(c =>
    c.toLowerCase().includes('mission') || c.toLowerCase().includes('social')
  )

  let score = 0
  if (collabRating >= 4 && hasCollab) score = 15
  else if (collabRating >= 3 && hasCollab) score = 10
  else if (collabRating <= 2) score = 8 // user doesn't prioritise this
  else score = 5

  // Small prestige-culture bonus for M7 when user values brand
  if (priorities.prestige >= 4 && M7_IDS.has(school.id)) {
    score = Math.min(score + 2, 15)
  }

  return score
}

/**
 * 6. GMAT Competitiveness — max 10 pts
 * If no GMAT entered, all schools receive 7 (neutral).
 * Stretch schools (gap > 30) receive 0 from this dimension.
 */
function scoreGmat(school, formData) {
  const gmat = parseInt(formData.gmatScore)
  if (!gmat || gmat === 0) return 7 // neutral — not penalised

  const avg = school.classProfile.avgGMAT
  const gap = avg - gmat // positive = user is below avg

  if (gap <= 20) return 10 // within 20 pts (or above avg)
  if (gap <= 40) return 5  // 20–40 pts below — possible but tough
  return 0                  // 40+ pts below — stretch territory
}

/**
 * 7. Employment Rate Quality — max 10 pts
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
 * 8. Prestige / Brand Weight — max 10 pts
 * Scaled by how much the user rated prestige.
 * Flattened to ~5 when user rates prestige 1–2.
 */
function scorePrestige(school, formData) {
  const rating = formData.priorities.prestige

  if (rating <= 2) return 5 // user doesn't care — everyone scores the same

  if (M7_IDS.has(school.id)) return 10
  if (T15_IDS.has(school.id)) return 6
  return 2
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

  // Raw scores (each on its own scale)
  const raw = {
    career:        scoreCareer(school, formData),
    geography:     scoreGeography(school, formData),
    affordability: scoreAffordability(school),
    international: scoreInternational(school),
    culture:       scoreCulture(school, formData),
    gmat:          scoreGmat(school, formData),
    employment:    scoreEmployment(school),
    prestige:      scorePrestige(school, formData),
  }

  // Max possible raw score for each dimension (for normalisation)
  const maxRaw = {
    career: 25, geography: 15, affordability: 15,
    international: 15, culture: 15, gmat: 10, employment: 10, prestige: 10,
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
 * A school is a "stretch" if the user's GMAT is > 30 pts below the school avg.
 * Only applies when the user has entered a GMAT score.
 */
function isStretch(school, gmatInput) {
  const gmat = parseInt(gmatInput)
  if (!gmat || gmat === 0) return false
  return gmat < school.classProfile.avgGMAT - 30
}

/**
 * Score the same school but treat GMAT as neutral (7/10).
 * Used to determine if a stretch school is still "otherwise a reasonable fit."
 */
function scoreWithNeutralGmat(school, formData) {
  const neutralForm = { ...formData, gmatScore: '0' }
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
 *   strongFit:     ScoredSchool[],
 *   worthExploring: ScoredSchool[],
 *   stretch:       ScoredSchool[],
 *   hiddenGems:    ScoredSchool[],
 *   allScored:     ScoredSchool[],
 * }}
 */
export function runMatching(schools, formData) {
  // Score every school
  const scored = schools.map(s => scoreSchool(s, formData))

  // Sort descending by fit score
  scored.sort((a, b) => b.totalScore - a.totalScore)

  // Separate stretch vs non-stretch
  const stretchPool  = []
  const regularPool  = []

  for (const s of scored) {
    if (isStretch(s.school, formData.gmatScore)) {
      // Only include as stretch if it would otherwise be a reasonable fit
      const neutralScore = scoreWithNeutralGmat(s.school, formData)
      if (neutralScore >= 40) {
        stretchPool.push({ ...s, tier: 'stretch' })
      }
      // If score is very low even with neutral GMAT, omit from stretch tier
    } else {
      regularPool.push(s)
    }
  }

  // Tier the regular pool
  const STRONG_THRESHOLD   = 65
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
  const strongFit     = strongFitRaw.map(s => ({ ...s, tier: 'strong' }))
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
