import React from 'react'
import { ArrowLeft, ExternalLink, BookOpen } from 'lucide-react'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n) {
  if (!n && n !== 0) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`
  return `$${n}`
}

// ---------------------------------------------------------------------------
// Row layouts
// ---------------------------------------------------------------------------

function RowLabel({ label }) {
  return (
    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide py-3 px-4 bg-slate-50 border-b border-slate-100 sticky left-0 z-10 min-w-[140px]">
      {label}
    </div>
  )
}

function Cell({ children, highlight }) {
  return (
    <div className={`py-3 px-4 border-b border-slate-100 text-sm text-slate-700 leading-relaxed ${highlight ? 'bg-indigo-50' : 'bg-white'}`}>
      {children}
    </div>
  )
}

function TagList({ items, color = 'slate' }) {
  const colours = {
    slate:  'bg-slate-100 text-slate-600',
    indigo: 'bg-indigo-100 text-indigo-700',
    emerald:'bg-emerald-50 text-emerald-700',
  }
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item, i) => (
        <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${colours[color] ?? colours.slate}`}>
          {item}
        </span>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Comparison row definition
// ---------------------------------------------------------------------------

const ROWS = [
  {
    label: 'Location',
    render: s => `${s.location.city}, ${s.location.state}`,
  },
  {
    label: 'Annual tuition',
    render: s => fmt(s.costs.annualTuition),
  },
  {
    label: 'Class size',
    render: s => s.classProfile.size,
  },
  {
    label: 'Avg GMAT',
    render: s => s.classProfile.avgGMAT,
  },
  {
    label: 'Avg GRE',
    render: s => s.classProfile.avgGRE ?? '—',
  },
  {
    label: 'Avg work exp.',
    render: s => `${s.classProfile.avgWorkExperience} yrs`,
  },
  {
    label: 'Intl students',
    render: s => `${s.classProfile.internationalStudentPct}%`,
  },
  {
    label: 'Placed (3 mo)',
    render: s => `${s.employment.employmentRate3Months}%`,
  },
  {
    label: 'Avg salary',
    render: s => fmt(s.employment.avgStartingSalary),
  },
  {
    label: 'Signing bonus',
    render: s => fmt(s.employment.medianSigningBonus),
  },
  {
    label: 'Top industries',
    render: s => <TagList items={s.employment.top3Industries} color="indigo" />,
  },
  {
    label: 'Top companies',
    render: s => <TagList items={s.employment.top5Companies.slice(0, 3)} color="slate" />,
  },
  {
    label: 'Culture',
    render: s => <TagList items={s.culture} color="emerald" />,
  },
  {
    label: 'Academic strengths',
    render: s => <TagList items={s.academicStrengths} color="slate" />,
  },
]

// ---------------------------------------------------------------------------
// ComparisonView
// ---------------------------------------------------------------------------

export default function ComparisonView({ selectedSchools, onBack }) {
  const count = selectedSchools.length

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
          >
            <ArrowLeft size={15} />
            Back to results
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <BookOpen size={15} className="text-indigo-600" />
            <span className="font-semibold text-slate-800 text-sm tracking-tight">MBA Tribe</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">

        <div className="mb-6">
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">Side-by-Side</p>
          <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
            Comparing {count} Program{count !== 1 ? 's' : ''}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Go back to results to change your selection.
          </p>
        </div>

        {/* ── Table — horizontally scrollable on small screens ─────────── */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
          <div
            className="grid"
            style={{ gridTemplateColumns: `140px repeat(${count}, minmax(200px, 1fr))` }}
          >

            {/* ── Header row ─────────────────────────────────────────────── */}
            {/* Empty label cell */}
            <div className="bg-slate-800 py-4 px-4 sticky left-0 z-10" />

            {/* School name headers */}
            {selectedSchools.map((school, i) => (
              <div key={school.id} className={`py-4 px-4 ${i % 2 === 1 ? 'bg-indigo-700' : 'bg-slate-800'}`}>
                <div className="font-semibold text-white text-sm leading-snug mb-0.5">{school.name}</div>
                <div className="text-slate-400 text-xs">{school.university}</div>
                <a
                  href={school.programUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-300 hover:text-white text-xs mt-2 transition-colors"
                >
                  Visit site <ExternalLink size={10} />
                </a>
              </div>
            ))}

            {/* ── Data rows ──────────────────────────────────────────────── */}
            {ROWS.map(({ label, render }) => (
              <React.Fragment key={label}>
                <RowLabel label={label} />
                {selectedSchools.map((school, i) => (
                  <Cell key={school.id} highlight={i % 2 === 1}>
                    {render(school)}
                  </Cell>
                ))}
              </React.Fragment>
            ))}

          </div>
        </div>

        {/* ── Back button ──────────────────────────────────────────────── */}
        <div className="mt-8 text-center">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium text-sm transition-colors shadow-sm"
          >
            <ArrowLeft size={15} />
            Back to Results
          </button>
        </div>

      </main>

    </div>
  )
}
