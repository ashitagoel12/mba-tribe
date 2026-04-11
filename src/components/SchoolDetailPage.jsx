import React from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { ExternalLink, ArrowLeft, Calendar, FileText, CheckCircle2, ChevronRight } from 'lucide-react'
import NavBar from './NavBar.jsx'
import schoolsData from '../../data/mba_schools_data.json'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n) {
  if (!n && n !== 0) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`
  return `$${n}`
}

function formatDate(dateStr) {
  if (!dateStr || dateStr.includes('XX')) return dateStr ?? '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionCard({ id, title, children }) {
  return (
    <section id={id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-5">{title}</h2>
      {children}
    </section>
  )
}

function DeadlineCard({ round, label }) {
  if (!round) return null
  return (
    <div className="border border-slate-200 rounded-lg p-4">
      <div className="font-semibold text-indigo-600 text-sm mb-2">{label}</div>
      <div className="space-y-1 text-sm text-slate-700">
        <div>
          <span className="text-slate-400">Deadline: </span>
          {formatDate(round.deadline)}
        </div>
        <div>
          <span className="text-slate-400">Decision: </span>
          {formatDate(round.decisionDate)}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SchoolDetailPage() {
  const { schoolId } = useParams()
  const school = schoolsData.schools.find(s => s.id === schoolId)

  if (!school) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <p className="text-xl font-semibold text-slate-700 mb-4">School not found</p>
            <Link to="/schools" className="text-indigo-600 hover:text-indigo-800 font-medium">
              ← Browse all schools
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const hasDeadlines = !!school.applicationInfo?.deadlines
  const hasEssays = (school.applicationInfo?.essayQuestions?.length ?? 0) > 0
  const hasRequirements = !!school.applicationInfo?.requirements
  const hasEvents = (school.events?.length ?? 0) > 0

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Global nav ──────────────────────────────────────────────────── */}
      <NavBar />

      {/* ── School header ───────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-5">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
            <Link to="/" className="hover:text-indigo-600 transition-colors">Home</Link>
            <ChevronRight size={11} />
            <Link to="/schools" className="hover:text-indigo-600 transition-colors">Browse Schools</Link>
            <ChevronRight size={11} />
            <span className="text-slate-600 truncate max-w-[200px]">{school.name}</span>
          </nav>

          {/* Back link */}
          <Link
            to="/schools"
            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-4 transition-colors"
          >
            <ArrowLeft size={15} />
            Back to all schools
          </Link>

          <h1 className="text-3xl font-bold text-slate-900">{school.name}</h1>
          <p className="text-slate-500 mt-1">{school.university}</p>
          <p className="text-sm text-slate-400 font-mono mt-0.5">
            {school.location.city}, {school.location.state}
          </p>
        </div>
      </header>

      {/* ── Sticky tab nav ──────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-slate-200 sticky top-[53px] z-10">
        <div className="max-w-4xl mx-auto px-4 flex gap-0 overflow-x-auto">
          {[
            { href: '#overview', label: 'Overview', always: true },
            { href: '#application', label: 'Application', show: hasDeadlines },
            { href: '#events', label: 'Events', show: hasEvents },
            { href: '#outcomes', label: 'Outcomes', always: true },
          ]
            .filter(t => t.always || t.show)
            .map(t => (
              <a
                key={t.href}
                href={t.href}
                className="py-3.5 px-4 text-sm font-medium text-slate-500 hover:text-indigo-600 border-b-2 border-transparent hover:border-indigo-600 transition-colors whitespace-nowrap"
              >
                {t.label}
              </a>
            ))}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* ── Overview ────────────────────────────────────────────────────── */}
        <SectionCard id="overview" title="Overview">
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Class Profile
              </h3>
              <ul className="space-y-1.5 text-sm text-slate-700">
                <li><span className="text-slate-400">Class size:</span> {school.classProfile.size}</li>
                <li><span className="text-slate-400">Avg work exp:</span> {school.classProfile.avgWorkExperience} yrs</li>
                <li><span className="text-slate-400">Avg GMAT:</span> {school.classProfile.avgGMAT}</li>
                <li><span className="text-slate-400">International:</span> {school.classProfile.internationalStudentPct}%</li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Costs
              </h3>
              <ul className="space-y-1.5 text-sm text-slate-700">
                <li><span className="text-slate-400">Annual tuition:</span> {fmt(school.costs.annualTuition)}</li>
                <li><span className="text-slate-400">Total program:</span> {fmt(school.costs.totalProgramCost)}</li>
              </ul>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Academic Strengths
            </h3>
            <div className="flex flex-wrap gap-2">
              {school.academicStrengths.map((s, i) => (
                <span key={i} className="bg-indigo-50 text-indigo-700 text-xs font-medium px-3 py-1.5 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {school.culture?.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Culture
              </h3>
              <div className="flex flex-wrap gap-2">
                {school.culture.map((c, i) => (
                  <span key={i} className="bg-slate-100 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-full">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        {/* ── Application Info ────────────────────────────────────────────── */}
        {hasDeadlines && (
          <SectionCard id="application" title="Application Information">

            {/* Deadlines */}
            <div className="mb-6">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-3">
                <Calendar size={15} className="text-indigo-500" />
                Deadlines
              </h3>
              <div className="grid sm:grid-cols-3 gap-3">
                <DeadlineCard round={school.applicationInfo.deadlines.round1} label="Round 1" />
                <DeadlineCard round={school.applicationInfo.deadlines.round2} label="Round 2" />
                <DeadlineCard round={school.applicationInfo.deadlines.round3} label="Round 3" />
              </div>
              {school.applicationInfo.applicationFee && (
                <p className="text-sm text-slate-500 mt-3">
                  Application fee: <span className="font-medium text-slate-700">${school.applicationInfo.applicationFee}</span>
                  {school.applicationInfo.feeWaiverAvailable && (
                    <span className="ml-2 text-emerald-600 text-xs font-medium">Fee waiver available</span>
                  )}
                </p>
              )}
            </div>

            {/* Essays */}
            {hasEssays && (
              <div className="mb-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-3">
                  <FileText size={15} className="text-indigo-500" />
                  Essay Questions
                </h3>
                <div className="space-y-4">
                  {school.applicationInfo.essayQuestions.map((essay, i) => (
                    <div key={i} className="border-l-4 border-indigo-400 pl-4 py-1">
                      <div className="flex flex-wrap gap-2 items-center text-xs text-slate-400 mb-1.5">
                        <span>Essay {essay.id}</span>
                        {essay.wordLimit && <span>• {essay.wordLimit} words</span>}
                        {essay.characterLimit && <span>• {essay.characterLimit} chars</span>}
                        {essay.optional && (
                          <span className="text-amber-600 font-medium">• Optional</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">{essay.prompt}</p>
                      {essay.notes && (
                        <p className="text-xs text-slate-400 mt-1.5 italic">{essay.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Requirements */}
            {hasRequirements && (
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-3">
                  <CheckCircle2 size={15} className="text-indigo-500" />
                  Requirements
                </h3>
                <div className="grid sm:grid-cols-2 gap-3 text-sm text-slate-700">
                  {school.applicationInfo.requirements.gmat && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="font-medium text-slate-500 text-xs uppercase tracking-wider mb-1">GMAT</div>
                      <div>{school.applicationInfo.requirements.gmat.required ? 'Required' : 'Optional'}</div>
                      {school.applicationInfo.requirements.gmat.averageScore && (
                        <div className="text-slate-500 text-xs mt-0.5">
                          Avg {school.applicationInfo.requirements.gmat.averageScore}
                          {school.applicationInfo.requirements.gmat.range && ` (${school.applicationInfo.requirements.gmat.range})`}
                        </div>
                      )}
                    </div>
                  )}
                  {school.applicationInfo.requirements.gre?.accepted && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="font-medium text-slate-500 text-xs uppercase tracking-wider mb-1">GRE</div>
                      <div>Accepted</div>
                      {school.applicationInfo.requirements.gre.averageScore && (
                        <div className="text-slate-500 text-xs mt-0.5">
                          Avg {school.applicationInfo.requirements.gre.averageScore}
                        </div>
                      )}
                    </div>
                  )}
                  {school.applicationInfo.requirements.workExperience && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="font-medium text-slate-500 text-xs uppercase tracking-wider mb-1">Work Experience</div>
                      <div>{school.applicationInfo.requirements.workExperience.average} yrs avg</div>
                      {school.applicationInfo.requirements.workExperience.range && (
                        <div className="text-slate-500 text-xs mt-0.5">
                          Range: {school.applicationInfo.requirements.workExperience.range}
                        </div>
                      )}
                    </div>
                  )}
                  {school.applicationInfo.requirements.recommendations && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="font-medium text-slate-500 text-xs uppercase tracking-wider mb-1">Recommendations</div>
                      <div>{school.applicationInfo.requirements.recommendations.required ?? school.applicationInfo.requirements.recommendations} required</div>
                    </div>
                  )}
                  {school.applicationInfo.requirements.interviews && (
                    <div className="bg-slate-50 rounded-lg p-3 sm:col-span-2">
                      <div className="font-medium text-slate-500 text-xs uppercase tracking-wider mb-1">Interview</div>
                      <div>{school.applicationInfo.requirements.interviews.format}</div>
                      {school.applicationInfo.requirements.interviews.notes && (
                        <div className="text-slate-500 text-xs mt-0.5">
                          {school.applicationInfo.requirements.interviews.notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </SectionCard>
        )}

        {/* ── Events ──────────────────────────────────────────────────────── */}
        {hasEvents && (
          <SectionCard id="events" title="Upcoming Events">
            <div className="space-y-3">
              {school.events.map(event => (
                <div
                  key={event.id}
                  className="border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 text-sm leading-snug">{event.title}</h3>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-400 mt-1">
                        <span>{formatDate(event.date)}{event.time ? ` • ${event.time}` : ''}</span>
                        <span>{event.format === 'virtual' ? 'Virtual' : event.location ?? 'In person'}</span>
                      </div>
                      {event.description && (
                        <p className="text-sm text-slate-600 mt-1.5">{event.description}</p>
                      )}
                    </div>
                    {event.registrationUrl && (
                      <a
                        href={event.registrationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 bg-indigo-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Register
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Outcomes ────────────────────────────────────────────────────── */}
        <SectionCard id="outcomes" title="Employment Outcomes">
          <div className="grid sm:grid-cols-2 gap-6 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Quick Stats
              </h3>
              <ul className="space-y-1.5 text-sm text-slate-700">
                <li><span className="text-slate-400">Employment (3 mo):</span> {school.employment.employmentRate3Months}%</li>
                <li><span className="text-slate-400">Avg starting salary:</span> {fmt(school.employment.avgStartingSalary)}</li>
                <li><span className="text-slate-400">Median signing bonus:</span> {fmt(school.employment.medianSigningBonus)}</li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Top Industries
              </h3>
              <ol className="space-y-1.5 text-sm text-slate-700 list-decimal list-inside">
                {school.employment.top3Industries.map((ind, i) => (
                  <li key={i}>{ind}</li>
                ))}
              </ol>
            </div>
          </div>

          {school.employment.top5Companies?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Top Employers
              </h3>
              <div className="flex flex-wrap gap-2">
                {school.employment.top5Companies.map((c, i) => (
                  <span key={i} className="bg-slate-100 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-full">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        {/* ── Action buttons ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 pb-4">
          <a
            href={school.programUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors"
          >
            Visit official website
            <ExternalLink size={14} />
          </a>
          <Link
            to="/schools"
            className="inline-flex items-center gap-2 border border-slate-300 text-slate-600 px-5 py-2.5 rounded-lg hover:bg-slate-50 font-medium text-sm transition-colors"
          >
            <ArrowLeft size={14} />
            Back to all schools
          </Link>
        </div>

      </main>
    </div>
  )
}
