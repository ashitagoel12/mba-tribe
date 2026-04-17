import React, { useState, useMemo, useCallback, memo } from 'react'
import { Link } from 'react-router-dom'
import { Search, ChevronDown, X, GraduationCap } from 'lucide-react'
import NavBar from './NavBar.jsx'
import allSchoolsData from '../../data/mba_schools_data.json'

// ---------------------------------------------------------------------------
// Data preparation — done once at module load (not on every render)
// ---------------------------------------------------------------------------

const ALL_SCHOOLS = allSchoolsData.schools  // array keeps original order = ranking order

// M7 school IDs — used for the M7 badge only
const M7_IDS = new Set([
  'harvard-hbs', 'stanford-gsb', 'wharton-penn',
  'booth-chicago', 'kellogg-northwestern', 'sloan-mit', 'columbia-cbs',
])

const STATES = ['All States', ...Array.from(new Set(ALL_SCHOOLS.map(s => s.location.state))).sort()]

const TIER_OPTIONS = [
  { label: 'All Schools', max: Infinity },
  { label: 'Top 10',      max: 10       },
  { label: 'Top 25',      max: 25       },
  { label: 'Top 50',      max: 50       },
  { label: 'Top 100',     max: 100      },
]

const SORT_OPTIONS = [
  { value: 'ranking',   label: 'Ranking'      },
  { value: 'alpha',     label: 'Alphabetical' },
  { value: 'gmat',      label: 'GMAT (high)'  },
  { value: 'size',      label: 'Class size'   },
  { value: 'salary',    label: 'Salary (high)'},
]

function fmt(n) {
  if (!n) return '—'
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`
  return `$${n}`
}

// ---------------------------------------------------------------------------
// School card (memoised)
// ---------------------------------------------------------------------------

const SchoolBrowseCard = memo(function SchoolBrowseCard({ school, rank }) {
  const hasComprehensiveData = !!school.description

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow ${hasComprehensiveData ? 'border-indigo-100' : 'border-slate-100'}`}>

      {/* Rank badge + name */}
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-7 h-7 rounded-full bg-slate-100 text-slate-400 text-xs font-mono font-semibold flex items-center justify-center mt-0.5">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <h3 className="font-semibold text-slate-800 text-sm leading-snug">{school.name}</h3>
            {M7_IDS.has(school.id) && (
              <span className="shrink-0 bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-widest">
                M7
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{school.university}</p>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            {school.location.city}, {school.location.state}
          </p>
        </div>
      </div>

      {/* Description snippet (schools with comprehensive data) */}
      {school.description && (
        <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
          {school.description}
        </p>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-50 rounded-lg py-2 px-1">
          <div className="text-xs font-mono font-semibold text-slate-700">
            {school.classProfile.avgGMAT || '—'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Avg GMAT</div>
        </div>
        <div className="bg-slate-50 rounded-lg py-2 px-1">
          <div className="text-xs font-mono font-semibold text-slate-700">
            {school.classProfile.size || '—'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Class size</div>
        </div>
        <div className="bg-slate-50 rounded-lg py-2 px-1">
          <div className="text-xs font-mono font-semibold text-slate-700">
            {fmt(school.employment.avgStartingSalary)}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Avg salary</div>
        </div>
      </div>

      {/* Programs count (schools with comprehensive data) */}
      {school.programs?.length > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <GraduationCap size={12} className="text-indigo-400 shrink-0" />
          <span>{school.programs.length} programs offered</span>
        </div>
      )}

      {/* Strengths */}
      {school.academicStrengths?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {school.academicStrengths.slice(0, 3).map((s, i) => (
            <span key={i} className="bg-indigo-50 text-indigo-600 text-[10px] font-medium px-2 py-0.5 rounded-full">
              {s}
            </span>
          ))}
        </div>
      )}

      {/* CTA */}
      <Link
        to={`/schools/${school.id}`}
        className="mt-auto block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
      >
        View Profile
      </Link>
    </div>
  )
})

// ---------------------------------------------------------------------------
// Select helper (styled)
// ---------------------------------------------------------------------------

function Select({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
      >
        {options.map(o => (
          <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
            {typeof o === 'string' ? o : o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function BrowseSchools() {
  const [query,    setQuery]    = useState('')
  const [state,    setState]    = useState('All States')
  const [tierIdx,  setTierIdx]  = useState(0)   // index into TIER_OPTIONS
  const [sort,     setSort]     = useState('ranking')

  const handleQuery = useCallback(e => setQuery(e.target.value), [])
  const clearQuery  = useCallback(() => setQuery(''), [])

  // 1. Filter
  const filtered = useMemo(() => {
    const q    = query.toLowerCase().trim()
    const tier = TIER_OPTIONS[tierIdx]

    return ALL_SCHOOLS.filter((school, idx) => {
      const rankOk  = idx < tier.max
      const stateOk = state === 'All States' || school.location.state === state
      const queryOk = !q || [
        school.name,
        school.university,
        school.location.city,
        school.location.state,
      ].some(field => field?.toLowerCase().includes(q))

      return rankOk && stateOk && queryOk
    })
  }, [query, state, tierIdx])

  // 2. Sort (preserve original indices for rank display)
  const withRanks = useMemo(
    () => filtered.map(school => ({ school, rank: ALL_SCHOOLS.indexOf(school) + 1 })),
    [filtered]
  )

  const sorted = useMemo(() => {
    const arr = [...withRanks]
    switch (sort) {
      case 'alpha':
        return arr.sort((a, b) => a.school.name.localeCompare(b.school.name))
      case 'gmat':
        return arr.sort((a, b) => (b.school.classProfile.avgGMAT || 0) - (a.school.classProfile.avgGMAT || 0))
      case 'size':
        return arr.sort((a, b) => (b.school.classProfile.size || 0) - (a.school.classProfile.size || 0))
      case 'salary':
        return arr.sort((a, b) => (b.school.employment.avgStartingSalary || 0) - (a.school.employment.avgStartingSalary || 0))
      case 'ranking':
      default:
        return arr.sort((a, b) => a.rank - b.rank)
    }
  }, [withRanks, sort])

  const hasActiveFilters = query || state !== 'All States' || tierIdx !== 0

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
            Browse MBA Programs
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm sm:text-base">
            Explore all 100 programs in our database. Find your fit, then dive into details.
          </p>
        </div>
      </div>

      {/* ── Controls bar ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 sticky top-[53px] z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row gap-3">

          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by school, university, city…"
              value={query}
              onChange={handleQuery}
              className="w-full pl-8 pr-8 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            />
            {query && (
              <button onClick={clearQuery} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={state}
              onChange={setState}
              options={STATES}
            />
            <Select
              value={String(tierIdx)}
              onChange={v => setTierIdx(Number(v))}
              options={TIER_OPTIONS.map((t, i) => ({ value: String(i), label: t.label }))}
            />
            <Select
              value={sort}
              onChange={setSort}
              options={SORT_OPTIONS}
            />
            {hasActiveFilters && (
              <button
                onClick={() => { setQuery(''); setState('All States'); setTierIdx(0) }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors whitespace-nowrap"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Results count */}
        <div className="max-w-6xl mx-auto px-4 pb-2">
          <p className="text-xs text-slate-400">
            Showing <span className="font-semibold text-slate-600">{sorted.length}</span> of{' '}
            <span className="font-semibold text-slate-600">{ALL_SCHOOLS.length}</span> schools
          </p>
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {sorted.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl mb-3">🔍</p>
            <p className="text-slate-600 font-medium mb-1">No schools match your filters</p>
            <p className="text-sm text-slate-400 mb-5">Try adjusting the search or clearing filters</p>
            <button
              onClick={() => { setQuery(''); setState('All States'); setTierIdx(0) }}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sorted.map(({ school, rank }) => (
              <SchoolBrowseCard key={school.id} school={school} rank={rank} />
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 bg-white px-6 py-4 mt-4">
        <div className="max-w-6xl mx-auto text-center text-xs text-slate-400">
          100 programs · Data updated 2025–2026 · Built by MBATribe
        </div>
      </footer>
    </div>
  )
}
