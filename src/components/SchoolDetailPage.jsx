import React from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ExternalLink, ArrowLeft, Calendar, FileText, CheckCircle2,
  ChevronRight, BarChart2, Briefcase, MapPin, Mail, BookOpen,
  GraduationCap, Building2, ExternalLink as LinkIcon, Users,
  Clock, Award, Layers
} from 'lucide-react'
import NavBar from './NavBar.jsx'
import AskSchool from './AskSchool.jsx'
import schoolsData from '../../data/mba_schools_data.json'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const M7_IDS = new Set([
  'harvard-hbs', 'stanford-gsb', 'wharton-penn',
  'booth-chicago', 'kellogg-northwestern', 'sloan-mit', 'columbia-cbs',
])

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

const PROGRAM_TYPE_COLORS = {
  'full-time':   'bg-indigo-50 text-indigo-700',
  'part-time':   'bg-violet-50 text-violet-700',
  'executive':   'bg-amber-50 text-amber-700',
  'joint-degree':'bg-emerald-50 text-emerald-700',
  'deferred':    'bg-sky-50 text-sky-700',
}

const QUICK_LINK_ICONS = {
  'application': FileText,
  'stats':       BarChart2,
  'career':      Briefcase,
  'calendar':    Calendar,
  'tour':        MapPin,
  'contact':     Mail,
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionCard({ id, title, icon: Icon, children }) {
  return (
    <section id={id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800 mb-5">
        {Icon && <Icon size={18} className="text-indigo-500 shrink-0" />}
        {title}
      </h2>
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
// Rich sections (schools with comprehensive data merged in)
// ---------------------------------------------------------------------------

function ProgramsSection({ school }) {
  const programs = school.programs
  if (!programs?.length) return null

  const typeLabel = {
    'full-time':    'Full-Time',
    'part-time':    'Part-Time',
    'executive':    'Executive',
    'joint-degree': 'Joint Degree',
    'deferred':     'Deferred',
  }

  return (
    <SectionCard id="programs" title="Programs Offered" icon={GraduationCap}>
      <div className="grid sm:grid-cols-2 gap-3">
        {programs.map((prog, i) => (
          <a
            key={i}
            href={prog.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 border border-slate-100 rounded-lg p-4 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-slate-800 group-hover:text-indigo-700 transition-colors leading-snug">
                {prog.name}
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PROGRAM_TYPE_COLORS[prog.type] ?? 'bg-slate-100 text-slate-600'}`}>
                  {typeLabel[prog.type] ?? prog.type}
                </span>
                {prog.duration && (
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock size={10} />
                    {prog.duration}
                  </span>
                )}
              </div>
            </div>
            <ExternalLink size={13} className="text-slate-300 group-hover:text-indigo-400 mt-1 shrink-0 transition-colors" />
          </a>
        ))}
      </div>
    </SectionCard>
  )
}

function AcademicsSection({ school }) {
  const ac = school.academics
  if (!ac) return null

  return (
    <SectionCard id="academics" title="Academics" icon={BookOpen}>
      {/* Curriculum */}
      {(ac.curriculum?.year1 || ac.curriculum?.year2) && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">Curriculum</h3>
          <div className="space-y-2">
            {ac.curriculum.year1 && (
              <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">
                <span className="font-semibold text-slate-500 mr-2">Year 1</span>
                {ac.curriculum.year1}
              </div>
            )}
            {ac.curriculum.year2 && (
              <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">
                <span className="font-semibold text-slate-500 mr-2">Year 2</span>
                {ac.curriculum.year2}
              </div>
            )}
          </div>
          {ac.curriculum.url && (
            <a href={ac.curriculum.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 mt-2 font-medium">
              View full curriculum <ExternalLink size={11} />
            </a>
          )}
        </div>
      )}

      {/* Learning Methods */}
      {ac.learningMethods?.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">Learning Approach</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {ac.learningMethods.map((method, i) => (
              <div key={i} className="border border-slate-100 rounded-lg p-3">
                <a
                  href={method.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-sm text-slate-800 hover:text-indigo-600 transition-colors"
                >
                  {method.name}
                </a>
                {method.description && (
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{method.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Centers */}
      {ac.centers?.length > 0 && (
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">Centers & Institutes</h3>
          <div className="flex flex-wrap gap-2">
            {ac.centers.map((center, i) => (
              <a
                key={i}
                href={center.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
              >
                <Building2 size={11} />
                {center.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Course Catalog */}
      {ac.courseCatalog && (
        <a
          href={ac.courseCatalog}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Layers size={14} />
          Browse Course Catalog
        </a>
      )}
    </SectionCard>
  )
}

function EventsSection({ school }) {
  const ev = school.eventsAndEngagement
  if (!ev) return null

  return (
    <SectionCard id="events" title="Events & Campus Visits" icon={Calendar}>

      {/* Event categories */}
      {ev.eventCategories?.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-3">Connect With Us</h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {ev.eventCategories.map((cat, i) => (
              <a
                key={i}
                href={cat.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between border border-slate-100 rounded-lg px-4 py-3 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors"
              >
                <span className="text-sm font-medium text-slate-700 group-hover:text-indigo-700 transition-colors">
                  {cat.name}
                </span>
                <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Virtual tour + calendar CTAs */}
      <div className="flex flex-wrap gap-3">
        {ev.eventsCalendarUrl && (
          <a
            href={ev.eventsCalendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <Calendar size={14} />
            View Full Events Calendar
          </a>
        )}
        {ev.virtualTourUrl && (
          <a
            href={ev.virtualTourUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <MapPin size={14} />
            Take Virtual Tour
          </a>
        )}
      </div>
    </SectionCard>
  )
}

function QuickLinksSection({ school }) {
  const links = school.quickLinks
  if (!links?.length) return null

  return (
    <SectionCard id="quick-links" title="Quick Access" icon={LinkIcon}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {links.map((link, i) => {
          const Icon = QUICK_LINK_ICONS[link.icon] ?? ExternalLink
          return (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-2 border border-slate-100 rounded-xl p-4 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors text-center"
            >
              <div className="w-9 h-9 rounded-full bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                <Icon size={16} className="text-indigo-600" />
              </div>
              <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-700 transition-colors leading-tight">
                {link.name}
              </span>
            </a>
          )
        })}
      </div>
    </SectionCard>
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

  const hasDeadlines    = !!school.applicationInfo?.deadlines
  const hasEssays       = (school.applicationInfo?.essayQuestions?.length ?? 0) > 0
  const hasRequirements = !!school.applicationInfo?.requirements
  // Legacy scraped events — only show when rich eventsAndEngagement is absent
  const hasLegacyEvents = !school.eventsAndEngagement && (school.events?.length ?? 0) > 0

  const tabs = [
    { href: '#overview',    label: 'Overview',       always: true },
    { href: '#programs',    label: 'Programs',        show: !!school.programs?.length },
    { href: '#academics',   label: 'Academics',       show: !!school.academics },
    { href: '#application', label: 'Application',     show: hasDeadlines },
    { href: '#events',      label: 'Events',          show: !!school.eventsAndEngagement || hasLegacyEvents },
    { href: '#outcomes',    label: 'Outcomes',        always: true },
    { href: '#quick-links', label: 'Quick Links',     show: !!school.quickLinks?.length },
  ].filter(t => t.always || t.show)

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

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{school.name}</h1>
              <p className="text-slate-500 mt-1">{school.university}</p>
              <p className="text-sm text-slate-400 font-mono mt-0.5">
                {school.location.city}, {school.location.state}
              </p>
            </div>
            {M7_IDS.has(school.id) && (
              <span className="shrink-0 bg-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest mt-1">
                M7
              </span>
            )}
          </div>

          {/* Description (schools with comprehensive data) */}
          {school.description && (
            <p className="text-sm text-slate-600 mt-3 leading-relaxed max-w-2xl">{school.description}</p>
          )}
        </div>
      </header>

      {/* ── Sticky tab nav ──────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-slate-200 sticky top-[53px] z-10">
        <div className="max-w-4xl mx-auto px-4 flex gap-0 overflow-x-auto">
          {tabs.map(t => (
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

        {/* ── Disclaimer ──────────────────────────────────────────────────── */}
        <div className="border-l-4 border-indigo-300 bg-indigo-50 rounded-r-lg px-4 py-3">
          <p className="text-sm text-indigo-700 leading-relaxed">
            {school.lastVerified
              ? `Key figures checked against ${school.shortName || school.name}'s own website on ${school.lastVerified}. Confirm details directly with the school before applying.`
              : 'Figures come from public school data, last audited in October 2026. Confirm details directly with each school before applying.'}
          </p>
          {school.sources && (
            <details className="mt-2 text-xs text-indigo-700">
              <summary className="cursor-pointer font-medium">Sources ({Object.keys(school.sources).length})</summary>
              <ul className="mt-2 space-y-1">
                {Object.entries(school.sources).map(([field, src]) => (
                  <li key={field}>
                    <span className="font-medium">{field.replace(/_/g, ' ')}</span>
                    {src.asOf ? ` · ${src.asOf}` : ''} ·{' '}
                    <a href={src.url} target="_blank" rel="noopener noreferrer" className="underline">source</a>
                    {src.note ? ` · ${src.note}` : ''}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        {/* ── Overview ────────────────────────────────────────────────────── */}
        <SectionCard id="overview" title="Overview" icon={Users}>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Class Profile
              </h3>
              <ul className="space-y-1.5 text-sm text-slate-700">
                <li><span className="text-slate-400">Class size:</span> {school.classProfile.size}</li>
                <li><span className="text-slate-400">Avg work exp:</span> {school.classProfile.avgWorkExperience} yrs</li>
                <li><span className="text-slate-400">Avg GMAT:</span> {school.classProfile.avgGMAT ?? 'Not published'}</li>
                <li><span className="text-slate-400">International:</span> {school.classProfile.internationalStudentPct}%</li>
                {school.classProfile.womenPercentage != null && (
                  <li><span className="text-slate-400">Women:</span> {school.classProfile.womenPercentage}%</li>
                )}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Costs
              </h3>
              <ul className="space-y-1.5 text-sm text-slate-700">
                <li><span className="text-slate-400">Annual tuition:</span> {fmt(school.costs.annualTuition)}</li>
                <li><span className="text-slate-400">Total program:</span> {fmt(school.costs.totalProgramCost)}</li>
                {school.financialAid?.totalCostOfAttendance && (
                  <li><span className="text-slate-400">Cost of attendance:</span> {school.financialAid.totalCostOfAttendance}/yr</li>
                )}
                {school.financialAid?.financialAidUrl && (
                  <li>
                    <a href={school.financialAid.financialAidUrl} target="_blank" rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-medium inline-flex items-center gap-1">
                      Financial aid info <ExternalLink size={10} />
                    </a>
                  </li>
                )}
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

          {/* Student Life */}
          {school.studentLife && (
            <div className="mt-6 border-t border-slate-100 pt-5">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Student Life
              </h3>
              <div className="grid sm:grid-cols-2 gap-3 text-sm text-slate-700">
                {school.studentLife.clubs && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Clubs & Activities</div>
                    <div>{school.studentLife.clubs}</div>
                  </div>
                )}
                {school.studentLife.location && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Campus</div>
                    <div>{school.studentLife.location}</div>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-3 flex-wrap">
                {school.studentLife.housingUrl && (
                  <a href={school.studentLife.housingUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1">
                    Housing info <ExternalLink size={10} />
                  </a>
                )}
                {school.studentLife.studentBlogsUrl && (
                  <a href={school.studentLife.studentBlogsUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1">
                    Student blogs <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          )}
        </SectionCard>

        {/* ── Ask Claude about this school ───────────────────────────────── */}
        <AskSchool school={school} />

        {/* ── Programs ────────────────────────────────────────────────────── */}
        {school.programs?.length > 0 && <ProgramsSection school={school} />}

        {/* ── Academics ───────────────────────────────────────────────────── */}
        {school.academics && <AcademicsSection school={school} />}

        {/* ── Application Info ────────────────────────────────────────────── */}
        {hasDeadlines && (
          <SectionCard id="application" title="Application Information" icon={FileText}>

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
              {Object.values(school.applicationInfo.deadlines)
                .map(r => r?.deadline)
                .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d || ''))
                .every(d => new Date(d) < new Date()) && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
                  These dates are from a past application cycle. Check the school's admissions page for current deadlines.
                </p>
              )}
              {school.applicationInfo.applicationFee && (
                <p className="text-sm text-slate-500 mt-3">
                  Application fee: <span className="font-medium text-slate-700">${school.applicationInfo.applicationFee}</span>
                  {school.applicationInfo.feeWaiverAvailable && (
                    <span className="ml-2 text-emerald-600 text-xs font-medium">Fee waiver available</span>
                  )}
                </p>
              )}
              {school.admissions?.applicationUrl && (
                <a
                  href={school.admissions.applicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Apply Now <ExternalLink size={13} />
                </a>
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

        {/* ── Events (rich eventsAndEngagement) ───────────────────────────── */}
        {school.eventsAndEngagement && <EventsSection school={school} />}

        {/* ── Events (legacy scraped, only when rich data is absent) ───────── */}
        {hasLegacyEvents && (
          <SectionCard id="events" title="Upcoming Events" icon={Calendar}>
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
        <SectionCard id="outcomes" title="Employment Outcomes" icon={Award}>
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
              {school.career?.employmentReportUrl && (
                <a href={school.career.employmentReportUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-3">
                  Full employment report <ExternalLink size={10} />
                </a>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Top Industries
              </h3>
              {/* Rich industry breakdown with percentages (schools with comprehensive data) */}
              {school.career?.topIndustries?.length > 0 ? (
                <ul className="space-y-2">
                  {school.career.topIndustries.map((ind, i) => (
                    <li key={i} className="text-sm">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-slate-700">{ind.industry}</span>
                        <span className="text-xs font-semibold text-indigo-600">{ind.percentage}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-400 rounded-full"
                          style={{ width: `${ind.percentage}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <ol className="space-y-1.5 text-sm text-slate-700 list-decimal list-inside">
                  {school.employment.top3Industries.map((ind, i) => (
                    <li key={i}>{ind}</li>
                  ))}
                </ol>
              )}
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

        {/* ── Quick Links ──────────────────────────────────────────────────── */}
        {school.quickLinks?.length > 0 && <QuickLinksSection school={school} />}

        {/* ── Action buttons ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 pb-4">
          <a
            href={school.website ?? school.programUrl}
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
