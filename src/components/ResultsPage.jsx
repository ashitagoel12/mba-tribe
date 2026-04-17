import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { RotateCcw, BookOpen, Users, MessageCircle, HelpCircle, Sparkles, ChevronRight, X } from 'lucide-react'
import { runMatching } from '../utils/matchingAlgorithm.js'
import { generateUserInsights } from '../utils/userInsights.js'
import SchoolCard from './SchoolCard.jsx'
import SchoolCardCompact from './SchoolCardCompact.jsx'
import CompareModal from './CompareModal.jsx'
import {
  POST_MBA_GOALS,
  CAMPUS_ENV_OPTIONS,
  PRIORITIES,
  M7_IDS,
  T15_IDS,
} from '../utils/constants.js'

// ---------------------------------------------------------------------------
// Summary sentence generator
// ---------------------------------------------------------------------------

function buildSummary(formData, results) {
  const goalLabel  = POST_MBA_GOALS.find(g => g.value === formData.postMBAGoal)?.label ?? 'your target role'
  const envLabel   = CAMPUS_ENV_OPTIONS.find(o => o.value === formData.campusEnv)?.label ?? null
  const isIntl     = formData.currentRegion !== 'north-america'

  // Find the top-2 rated priorities by the user
  const sortedPriorities = Object.entries(formData.priorities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([key]) => PRIORITIES.find(p => p.key === key)?.label?.toLowerCase() ?? key)

  const priorityPhrase = sortedPriorities.length >= 2
    ? `${sortedPriorities[0]} and ${sortedPriorities[1]}`
    : sortedPriorities[0] ?? 'fit'

  let summary = `You're targeting ${goalLabel}.`
  if (formData.campusEnv && formData.campusEnv !== 'no-preference' && envLabel) {
    summary += ` You prefer a ${formData.campusEnv === 'urban' ? 'big-city campus' : 'quieter campus-town setting'}.`
  }
  summary += ` Your highest-rated priorities are ${priorityPhrase}.`
  if (isIntl) summary += ` As an international applicant, we've given extra weight to programs with strong global communities and international student support.`
  summary += ` We've sorted all ${results.allScored ? results.allScored.length : 100} programs accordingly. Programs that genuinely over-index on what matters to you appear first.`

  return summary
}

// ---------------------------------------------------------------------------
// Personalised visit questions
// ---------------------------------------------------------------------------

function buildVisitQuestions(formData) {
  const { priorities, campusEnv, currentRegion, postMBAGoal, budgetSensitivity, scholarshipImportance } = formData
  const isInternational = currentRegion !== 'north-america'
  const questions = []

  if (isInternational || priorities.internationalSupport >= 4) {
    questions.push('What percentage of your career team focuses specifically on international student recruiting, and how do you support students seeking visa sponsorship?')
  }
  if (budgetSensitivity === 'major-factor' || scholarshipImportance === 'deal-breaker' || priorities.affordability >= 4) {
    questions.push('What is the median scholarship awarded to admitted students, and what factors distinguish those who receive significant aid?')
  }
  if (postMBAGoal === 'consulting') {
    questions.push('Which consulting firms recruit exclusively on-campus, and what is your first-round interview invite rate for full-time candidates?')
  }
  if (postMBAGoal === 'finance') {
    questions.push('How many investment banking summer associate positions are filled through on-campus recruiting versus off-cycle processes each year?')
  }
  if (postMBAGoal === 'entrepreneurship') {
    questions.push('What resources exist for students who want to launch a company during the program: funding competitions, mentorship access, dedicated incubator space?')
  }
  if (postMBAGoal === 'tech') {
    questions.push('Which tech companies specifically recruit MBAs for product management roles here, and how is that recruiting pipeline structured?')
  }
  if (postMBAGoal === 'social-impact') {
    questions.push('What percentage of graduates enter the social sector, and are there dedicated fellowship programs or social impact career support?')
  }
  if (priorities.collaborativeCulture >= 4) {
    questions.push('How would current students describe the dynamic between collaboration and competition, both in study groups and during the recruiting season?')
  }
  if (campusEnv && campusEnv !== 'no-preference') {
    questions.push('What do students say about day-to-day life on and around campus — how much of the social and professional energy stays within the school community versus the broader city?')
  }

  // Universal questions (always useful)
  questions.push('What has changed most about the program in the last 2–3 years, and where is the school investing next?')
  questions.push('What do your current students say they wish they had known before enrolling?')

  // Return top 5, de-duplicated
  return [...new Set(questions)].slice(0, 5)
}

// ---------------------------------------------------------------------------
// Section wrappers
// ---------------------------------------------------------------------------

function SectionHeading({ icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="mt-0.5 p-2 bg-indigo-50 rounded-lg shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="text-xl font-semibold text-slate-800 tracking-tight">{title}</h2>
        {subtitle && <p className="text-slate-500 text-sm mt-0.5 leading-relaxed">{subtitle}</p>}
      </div>
    </div>
  )
}

function Divider() {
  return <div className="border-t border-slate-100 my-12" />
}

// ---------------------------------------------------------------------------
// Hidden gems explanation
// ---------------------------------------------------------------------------

function hiddenGemNote(school, formData) {
  const intlPct = school.classProfile.internationalStudentPct
  const tuition = school.costs.annualTuition
  const empRate = school.employment.employmentRate3Months
  const notes = []

  if (tuition < 65_000) notes.push(`tuition of $${Math.round(tuition / 1000)}k/yr is well below average for this caliber`)
  if (empRate >= 93) notes.push(`${empRate}% employment within 3 months`)
  if (intlPct > 40) notes.push(`${intlPct}% international cohort`)
  if (school.classProfile.size < 200) notes.push(`very small class of ${school.classProfile.size} students`)

  const highlight = notes.slice(0, 2).join(', ')
  return `Often overlooked due to lower brand recognition, but scores strongly on your specific criteria. Notable: ${highlight || 'strong overall fit signals'}. Worth a closer look before finalising your list.`
}

// ---------------------------------------------------------------------------
// Main ResultsPage component
// ---------------------------------------------------------------------------

export default function ResultsPage({ schools, formData, onRetake }) {
  const results  = useMemo(() => runMatching(schools, formData), [schools, formData])
  const insights = useMemo(() => generateUserInsights(formData), [formData])

  const { strongFit, worthExploring, stretch, hiddenGems } = results
  const questions = useMemo(() => buildVisitQuestions(formData), [formData])

  const hasStretch    = stretch.length > 0
  const hasHiddenGems = hiddenGems.length > 0

  // ── Comparison mode state ───────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showModal, setShowModal]     = useState(false)
  const MAX_COMPARE = 3

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) }
      else if (next.size < MAX_COMPARE) { next.add(id) }
      return next
    })
  }

  // Ordered list of scored results for selected schools (preserves selection order)
  const selectedScoredList = useMemo(
    () => [...selectedIds]
      .map(id => results.allScored.find(r => r.school.id === id))
      .filter(Boolean),
    [selectedIds, results.allScored]
  )

  // Shared comparison props passed to every card
  const atLimit = selectedIds.size >= MAX_COMPARE
  const compareProps = (id) => ({
    isSelectable:   true,
    isSelected:     selectedIds.has(id),
    isDisabled:     !selectedIds.has(id) && atLimit,
    atLimit:        !selectedIds.has(id) && atLimit,
    onToggleSelect: toggleSelect,
  })

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-indigo-600" />
            <span className="font-semibold text-slate-800 text-sm tracking-tight">MBATribe</span>
          </div>
          <button
            onClick={onRetake}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
          >
            <RotateCcw size={14} />
            Retake
          </button>
        </div>
      </header>

      <main className={`max-w-4xl mx-auto px-4 py-10 ${selectedIds.size >= 2 ? 'pb-28' : ''}`}>

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-2">Your Results</p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-slate-800 tracking-tight mb-4">
            Your MBA Fit Report
          </h1>
        </div>

        {/* ── What matters to you ─────────────────────────────────────── */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 mb-10">
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0 mt-0.5">🎯</span>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-indigo-800 mb-1.5">What matters to you</h2>
              <p className="text-sm text-indigo-900 leading-relaxed mb-3">{insights.summary}</p>

              <div className="flex flex-wrap gap-4 text-xs">
                {insights.topPriorities.length > 0 && (
                  <div>
                    <span className="font-semibold text-indigo-700 uppercase tracking-wide">Optimising for · </span>
                    {insights.topPriorities.map((p, i) => (
                      <span key={i} className="inline-flex items-center bg-indigo-100 text-indigo-800 font-medium px-2 py-0.5 rounded-full mr-1 mb-1">{p}</span>
                    ))}
                  </div>
                )}
                {insights.flexibleOn.length > 0 && (
                  <div>
                    <span className="font-semibold text-indigo-400 uppercase tracking-wide">Flexible on · </span>
                    {insights.flexibleOn.map((p, i) => (
                      <span key={i} className="inline-flex items-center bg-white text-indigo-400 border border-indigo-200 font-medium px-2 py-0.5 rounded-full mr-1 mb-1">{p}</span>
                    ))}
                  </div>
                )}
              </div>

              {insights.profileNote && (
                <p className="text-xs text-indigo-700 mt-3 pt-3 border-t border-indigo-200 leading-relaxed">
                  💡 {insights.profileNote}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            TIER 1 — Strong Fit
        ════════════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeading
            icon={<Sparkles size={18} className="text-emerald-500" />}
            title="Strong Fit"
            subtitle={`${strongFit.length} program${strongFit.length !== 1 ? 's' : ''} that align well with your goals, priorities, and constraints`}
          />
          <p className="text-xs text-gray-400 italic mb-4">Data verified against official sources. Always confirm details directly with each school before applying.</p>
          <div className="space-y-5">
            {strongFit.map(scored => (
              <SchoolCard
                key={scored.school.id}
                scored={scored}
                formData={formData}
                allScoredResults={results.allScored}
                {...compareProps(scored.school.id)}
              />
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            TIER 2 — Worth Exploring
        ════════════════════════════════════════════════════════════════ */}
        {worthExploring.length > 0 && (
          <>
            <Divider />
            <section>
              <SectionHeading
                icon={<ChevronRight size={18} className="text-indigo-500" />}
                title="Worth Exploring"
                subtitle="Solid programs with real tradeoffs. Understand those tradeoffs before deciding"
              />
              <p className="text-xs text-gray-400 italic mb-4">Data verified against official sources. Always confirm details directly with each school before applying.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {worthExploring.map(scored => (
                  <SchoolCardCompact
                    key={scored.school.id}
                    scored={scored}
                    formData={formData}
                    allScoredResults={results.allScored}
                    {...compareProps(scored.school.id)}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TIER 3 — Stretch / Reach
        ════════════════════════════════════════════════════════════════ */}
        {hasStretch && (
          <>
            <Divider />
            <section>
              <SectionHeading
                icon={<ChevronRight size={18} className="text-amber-500" />}
                title="Stretch / Reach"
                subtitle="These programs are a reach given your current GMAT, but not out of reach with a standout application"
              />
              <p className="text-xs text-gray-400 italic mb-4">Data verified against official sources. Always confirm details directly with each school before applying.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                {stretch.map(scored => (
                  <SchoolCardCompact
                    key={scored.school.id}
                    scored={scored}
                    formData={formData}
                    allScoredResults={results.allScored}
                    {...compareProps(scored.school.id)}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            Hidden Gems
        ════════════════════════════════════════════════════════════════ */}
        {hasHiddenGems && (
          <>
            <Divider />
            <section>
              <SectionHeading
                icon={<Sparkles size={18} className="text-indigo-400" />}
                title="Schools You Might Be Overlooking"
                subtitle="Lower-ranked programs that score surprisingly well for your specific inputs. Worth a second look"
              />
              <div className="space-y-4">
                {hiddenGems.map(scored => (
                  <div key={scored.school.id} className="bg-white rounded-xl border border-indigo-100 shadow-sm p-5">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h3 className="font-semibold text-slate-800">{scored.school.name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5 font-mono">
                          {scored.school.location.city}, {scored.school.location.state}
                        </p>
                      </div>
                      <a
                        href={scored.school.programUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-500 hover:text-indigo-700 text-xs font-medium flex items-center gap-1 shrink-0 mt-0.5"
                      >
                        Visit site
                      </a>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-1.5 rounded-full bg-indigo-400"
                          style={{ width: `${scored.totalScore}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs font-bold text-indigo-600">{scored.totalScore}%</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {hiddenGemNote(scored.school, formData)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            Questions to Ask on Your Visit
        ════════════════════════════════════════════════════════════════ */}
        <Divider />
        <section>
          <SectionHeading
            icon={<HelpCircle size={18} className="text-indigo-500" />}
            title="Questions to Ask on Your School Visit"
            subtitle="Personalised based on what you told us. These will give you far more signal than a tour script"
          />
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <ol className="space-y-4">
              {questions.map((q, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-mono font-bold text-indigo-400 shrink-0 text-sm mt-0.5">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-slate-600 text-sm leading-relaxed">{q}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            A Note on Rankings
        ════════════════════════════════════════════════════════════════ */}
        <Divider />
        <section>
          <SectionHeading
            icon={<MessageCircle size={18} className="text-slate-400" />}
            title="A Note on Rankings"
          />
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
            <p className="text-slate-600 leading-relaxed mb-3">
              Rankings exist and they matter. A school's reputation affects recruiting pipelines,
              alumni networks, and how hiring managers respond to your application. We're not here
              to pretend otherwise.
            </p>
            <p className="text-slate-600 leading-relaxed mb-3">
              But rankings don't measure fit. They can't tell you whether a program's culture will
              energise or drain you, whether its alumni network is strong in your target city, whether
              its career services team actually excels in your industry, or whether a generous
              scholarship at a lower-ranked school produces better ROI than a full-price seat at a
              brand-name program.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Use rankings as one data point. Use this report as another. The decision that changes
              your career is the one you make with all the information, not just the shiniest number.
            </p>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════
            MBATribe CTA
        ════════════════════════════════════════════════════════════════ */}
        <Divider />
        <section>
          <div className="bg-indigo-600 rounded-2xl p-8 text-white text-center">
            <div className="flex justify-center mb-4">
              <div className="p-2 bg-indigo-500 rounded-xl">
                <Users size={22} className="text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight mb-3">
              Still building your shortlist?
            </h2>
            <p className="text-indigo-100 leading-relaxed mb-6 max-w-md mx-auto">
              MBATribe is a peer-support community of applicants who've been where you are.
              No consultants, no sales pitch, just people who've navigated this process and
              want to help you do the same.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="#"
                className="inline-flex items-center justify-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50 font-medium px-6 py-3 rounded-lg transition-colors"
              >
                Book a free 15-min guidance call
                <ChevronRight size={16} />
              </a>
              <a
                href="#"
                className="inline-flex items-center justify-center gap-2 border border-indigo-400 text-white hover:bg-indigo-700 font-medium px-6 py-3 rounded-lg transition-colors"
              >
                Join the MBATribe community
              </a>
            </div>
          </div>
        </section>

        {/* ── Retake + Browse ───────────────────────────────────────────── */}
        <div className="mt-10 text-center space-y-3">
          <div>
            <Link
              to="/schools"
              className="inline-flex items-center gap-2 border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Browse all 100 schools in our database
            </Link>
          </div>
          <div>
            <button
              onClick={onRetake}
              className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors px-4 py-2 rounded-lg hover:bg-slate-100 text-sm"
            >
              <RotateCcw size={15} />
              Retake the assessment
            </button>
          </div>
        </div>

      </main>

      {/* ── Sticky comparison bar (appears when ≥ 2 schools selected) ───── */}
      {selectedIds.size >= 2 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-2px_16px_rgba(0,0,0,0.08)]">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">

            {/* School name pills */}
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              {[...selectedIds].map(id => {
                const scored = results.allScored.find(r => r.school.id === id)
                if (!scored) return null
                const name = scored.school.shortName || scored.school.name
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-full border border-indigo-100"
                  >
                    <span className="max-w-[120px] truncate">{name}</span>
                    <button
                      onClick={() => toggleSelect(id)}
                      title={`Remove ${scored.school.name}`}
                      className="text-indigo-400 hover:text-indigo-700 transition-colors shrink-0"
                    >
                      <X size={11} />
                    </button>
                  </span>
                )
              })}
              {selectedIds.size < MAX_COMPARE && (
                <span className="text-xs text-slate-400 hidden sm:inline">
                  + add {MAX_COMPARE - selectedIds.size} more
                </span>
              )}
            </div>

            {/* Compare button */}
            <button
              onClick={() => setShowModal(true)}
              className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
            >
              Compare {selectedIds.size} Schools
            </button>

          </div>
        </div>
      )}

      {/* ── Comparison modal ─────────────────────────────────────────────── */}
      {showModal && selectedScoredList.length >= 2 && (
        <CompareModal
          scoredList={selectedScoredList}
          formData={formData}
          allScoredResults={results.allScored}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 bg-white mt-12 px-6 py-5">
        <div className="max-w-4xl mx-auto text-center text-sm text-slate-400">
          100 programs · Data updated 2025–2026 · MBATribe
        </div>
      </footer>

    </div>
  )
}
