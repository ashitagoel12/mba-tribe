import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react'
import { generateFitBullets, generateWatchOut } from '../utils/bulletGenerator.js'

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
// Animated fit-score bar
// ---------------------------------------------------------------------------

function FitScoreBar({ score }) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setWidth(score), 100)
    return () => clearTimeout(t)
  }, [score])

  const colour =
    score >= 65 ? 'bg-emerald-500'
    : score >= 45 ? 'bg-indigo-400'
    : 'bg-amber-400'

  const textColour =
    score >= 65 ? 'text-emerald-600'
    : score >= 45 ? 'text-indigo-600'
    : 'text-amber-600'

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-1000 ease-out ${colour}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className={`font-mono text-sm font-bold ${textColour}`}>{score}%</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Quick stat tile
// ---------------------------------------------------------------------------

function StatTile({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 text-center">
      <div className="font-mono font-semibold text-slate-800 text-sm leading-none mb-1">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component — Full card used in Strong Fit tier
// ---------------------------------------------------------------------------

export default function SchoolCard({ scored, formData, allScoredResults, isSelectable, isSelected, isDisabled, atLimit, onToggleSelect }) {
  const { school, totalScore, tier } = scored
  const bullets  = generateFitBullets(school, formData, allScoredResults)
  const watchOuts = generateWatchOut(school, formData, allScoredResults)

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-shadow ${
      isSelected ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-slate-100'
    }`}>

      {/* ── Compare checkbox — top-left, clearly labelled ──────────────── */}
      {isSelectable && (
        <div className="mb-4">
          <button
            onClick={() => onToggleSelect(school.id)}
            disabled={isDisabled}
            title={isSelected ? 'Remove from comparison' : isDisabled ? 'Max 3 schools selected' : 'Add to comparison'}
            className="flex items-center gap-2 group"
          >
            <span className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
              isSelected
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : isDisabled
                ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
                : 'border-slate-300 group-hover:border-indigo-400 bg-white cursor-pointer'
            }`}>
              {isSelected && (
                <svg width="9" height="7" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </span>
            <span className={`text-xs font-medium transition-colors ${
              isSelected ? 'text-indigo-600' : isDisabled ? 'text-slate-300' : 'text-slate-400 group-hover:text-indigo-500'
            }`}>
              {isSelected ? 'Added to compare' : 'Compare'}
            </span>
          </button>
          {atLimit && (
            <p className="text-[10px] text-slate-400 mt-1 ml-6 leading-tight">
              Remove a school to add another
            </p>
          )}
        </div>
      )}

      {/* ── Header — school name (left) + Visit site (right) ───────────── */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-slate-800 leading-snug">{school.name}</h3>
          <p className="text-sm text-slate-500 mt-0.5">{school.university}</p>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            {school.location.city}, {school.location.state}
          </p>
        </div>
        <a
          href={school.programUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors mt-0.5"
          aria-label={`Visit ${school.name} website`}
        >
          Visit site
          <ExternalLink size={13} />
        </a>
      </div>

      {/* ── Fit score ──────────────────────────────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span>Fit score</span>
          <span>based on your inputs</span>
        </div>
        <FitScoreBar score={totalScore} />
      </div>

      {/* ── Why this fits you ──────────────────────────────────────────── */}
      <div className="mb-5">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Why this fits you
        </h4>
        <ul className="space-y-2.5">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-slate-600 leading-relaxed">
              <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Quick stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        <StatTile label="Avg GMAT" value={school.classProfile.avgGMAT} />
        <StatTile label="Placed (3 mo)" value={`${school.employment.employmentRate3Months}%`} />
        <StatTile label="Tuition / yr" value={fmt(school.costs.annualTuition)} />
        <StatTile label="Avg Salary" value={fmt(school.employment.avgStartingSalary)} />
      </div>

      {/* ── Watch out ──────────────────────────────────────────────────── */}
      <div className="bg-amber-50 rounded-lg p-3.5 border border-amber-100 space-y-2.5">
        {watchOuts.map((warning, i) => (
          <div key={i} className="flex gap-2.5">
            <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 leading-relaxed">{warning}</p>
          </div>
        ))}
      </div>

      {/* ── View full profile ───────────────────────────────────────────── */}
      <div className="mt-4">
        <Link
          to={`/schools/${school.id}`}
          className="block w-full text-center bg-indigo-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          View Full Profile
        </Link>
      </div>

    </div>
  )
}
