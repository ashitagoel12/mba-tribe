/**
 * userInsights.js
 * ---------------------------------------------------------------------------
 * Pure function that reads the user's formData and produces a short
 * "What matters to you" narrative card for the top of the results page.
 *
 * No React imports. Deterministic given the same inputs.
 * ---------------------------------------------------------------------------
 */

import { POST_MBA_GOALS, CAMPUS_ENV_OPTIONS } from './constants.js'

// Human-readable labels for each priority key
const PRIORITY_LABELS = {
  prestige:             'academic prestige',
  industryPlacement:    'strong industry placement',
  campusEnvironment:    'campus vibe & environment',
  affordability:        'affordability',
  scholarship:          'scholarship potential',
  internationalSupport: 'international student support',
  collaborativeCulture: 'collaborative culture',
}

/**
 * Analyse the user's form data and return a short insights object.
 *
 * @param {object} formData — the full form state from App.jsx
 * @returns {{
 *   summary: string,
 *   topPriorities: string[],
 *   flexibleOn: string[],
 *   profileNote: string | null,
 * }}
 */
export function generateUserInsights(formData) {
  const { priorities, postMBAGoal, campusEnv, currentRegion,
          budgetSensitivity, scholarshipImportance, examScore, examType } = formData

  const isInternational = currentRegion !== 'north-america'
  const goalLabel  = POST_MBA_GOALS.find(g => g.value === postMBAGoal)?.label ?? 'your target role'
  const envLabel   = CAMPUS_ENV_OPTIONS.find(o => o.value === campusEnv)?.label ?? null

  // Sort priorities by rating
  const sorted = Object.entries(priorities).sort((a, b) => b[1] - a[1])

  // Top priorities: rated 4 or 5
  const topKeys = sorted.filter(([, v]) => v >= 4).map(([k]) => k)
  // Flexible areas: rated 1 or 2
  const flexKeys = sorted.filter(([, v]) => v <= 2).map(([k]) => k)

  // Fallback: if nothing rated 4+, take the top 2 whatever they are
  const displayTop = topKeys.length > 0 ? topKeys : sorted.slice(0, 2).map(([k]) => k)

  const topLabels  = displayTop.map(k => PRIORITY_LABELS[k] ?? k)
  const flexLabels = flexKeys.map(k => PRIORITY_LABELS[k] ?? k)

  // ── Build summary sentence ─────────────────────────────────────────────
  let summary = ''

  if (topLabels.length === 1) {
    summary = `You're optimising for ${topLabels[0]} above everything else`
  } else if (topLabels.length === 2) {
    summary = `You're optimising for ${topLabels[0]} and ${topLabels[1]}`
  } else {
    const rest = topLabels.slice(0, -1).join(', ')
    summary = `You're optimising for ${rest}, and ${topLabels[topLabels.length - 1]}`
  }

  // Add goal context
  summary += `, with a clear target of ${goalLabel}`
  if (campusEnv && campusEnv !== 'no-preference' && envLabel) {
    summary += `. You prefer a ${campusEnv === 'urban' ? 'big-city campus' : 'quieter campus-town setting'}`
  }
  summary += '.'

  // Flexibility sentence
  if (flexLabels.length > 0) {
    const flexPhrase = flexLabels.length === 1
      ? flexLabels[0]
      : `${flexLabels.slice(0, -1).join(', ')} and ${flexLabels[flexLabels.length - 1]}`
    summary += ` You've indicated you're flexible on ${flexPhrase}, which gives us more room to surface strong-fit programs you might not have considered.`
  } else {
    summary += ` You've rated all factors fairly high — we've weighted them proportionally.`
  }

  // ── Profile note (optional contextual observation) ─────────────────────
  let profileNote = null

  const gmat = parseInt(examScore)
  if (isInternational && priorities.internationalSupport >= 4) {
    profileNote = 'As an international applicant who also prioritises international support, we\'ve up-weighted programs with strong global communities and cross-border career services.'
  } else if (isInternational) {
    profileNote = 'As an international applicant, we\'ve given extra weight to programs with higher international cohort percentages and dedicated global career support.'
  } else if (budgetSensitivity === 'major-factor' || scholarshipImportance === 'deal-breaker') {
    profileNote = 'Cost is a real constraint for you — programs with tuition below $65k/yr and strong scholarship track records are weighted more heavily in your results.'
  } else if (examType && examType !== 'none' && gmat > 0 && gmat < 680) {
    profileNote = 'With a score below 680, some top-ranked programs may be stretch territory. We\'ve surfaced programs where your profile is genuinely competitive.'
  } else if (postMBAGoal === 'entrepreneurship') {
    profileNote = 'Entrepreneurship paths vary a lot by program — we\'ve weighted academic strength in this area alongside access to startup ecosystems.'
  } else if (postMBAGoal === 'social-impact') {
    profileNote = 'Social impact careers are best supported by programs with dedicated Social Enterprise tracks and non-profit alumni networks — we\'ve highlighted those.'
  }

  return {
    summary,
    topPriorities: topLabels,
    flexibleOn: flexLabels,
    profileNote,
  }
}
