import React, { useEffect, useState } from 'react'
import { ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react'
import { generateFitBullets, generateWatchOut } from '../utils/bulletGenerator.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n) {
  if (!n && n !== 0) return '—'
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`
  return `$${n}`
}

function FitScoreBar({ score, tier }) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setWidth(score), 120)
    return () => clearTimeout(t)
  }, [score])

  const colour = tier === 'stretch' ? 'bg-amber-400' : 'bg-indigo-400'
  const textColour = tier === 'stretch' ? 'text-amber-600' : 'text-indigo-600'

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all duration-1000 ease-out ${colour}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className={`font-mono text-xs font-bold ${textColour}`}>{score}%</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Compact card — used in Worth Exploring and Stretch tiers
// ---------------------------------------------------------------------------

export default function SchoolCardCompact({ scored, formData, allScoredResults, isSelectable, isSelected, isDisabled, atLimit, onToggleSelect }) {
  const { school, totalScore, tier } = scored
  const bullets  = generateFitBullets(school, formData, allScoredResults)
  const watchOuts = generateWatchOut(school, formData, allScoredResults)

  const isStretch = tier === 'stretch'

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow ${
      isSelected ? 'border-indigo-400 ring-2 ring-indigo-200' : isStretch ? 'border-amber-200' : 'border-slate-100'
    }`}>

      {/* ── Top row: compare checkbox (left) + Visit site (right) ──────── */}
      <div className="flex items-center justify-between mb-3">
        {isSelectable ? (
          <div>
            <button
              onClick={() => onToggleSelect(school.id)}
              disabled={isDisabled}
              title={isSelected ? 'Remove from comparison' : isDisabled ? 'Max 3 schools selected' : 'Add to comparison'}
              className="flex items-center gap-1.5 group"
            >
              <span className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                isSelected
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : isDisabled
                  ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
                  : 'border-slate-300 group-hover:border-indigo-400 bg-white cursor-pointer'
              }`}>
                {isSelected && (
                  <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              <span className={`text-xs font-medium transition-colors ${
                isSelected ? 'text-indigo-600' : isDisabled ? 'text-slate-300' : 'text-slate-400 group-hover:text-indigo-500'
              }`}>
                {isSelected ? 'Added' : 'Compare'}
              </span>
            </button>
            {atLimit && (
              <p className="text-[10px] text-slate-400 mt-0.5 ml-5 leading-tight whitespace-nowrap">
                Remove a school to add another
              </p>
            )}
          </div>
        ) : (
          <div />
        )}
        <a
          href={school.programUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-500 hover:text-indigo-700 transition-colors"
          aria-label={`Visit ${school.name} website`}
        >
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Stretch badge */}
      {isStretch && (
        <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-200 mb-3">
          Stretch / Reach
        </div>
      )}

      {/* ── School name + location ─────────────────────────────────────── */}
      <div className="mb-3">
        <h3 className="font-semibold text-slate-800 text-base leading-snug">{school.name}</h3>
        <p className="text-xs text-slate-400 mt-0.5 font-mono">
          {school.location.city}, {school.location.state}
        </p>
      </div>

      {/* ── Fit score ──────────────────────────────────────────────────── */}
      <div className="mb-3">
        <FitScoreBar score={totalScore} tier={tier} />
      </div>

      {/* ── Watch out first (show top warning only in compact view) ────── */}
      <div className="flex gap-2 bg-amber-50 rounded-lg p-2.5 border border-amber-100 mb-3">
        <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">{watchOuts[0]}</p>
      </div>

      {/* ── Top 2 fit bullets ──────────────────────────────────────────── */}
      <ul className="space-y-1.5 mb-4">
        {bullets.slice(0, 2).map((bullet, i) => (
          <li key={i} className="flex gap-2 text-xs text-slate-600 leading-relaxed">
            <CheckCircle2 size={12} className="text-emerald-500 shrink-0 mt-0.5" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>

      {/* ── Mini stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Avg GMAT', value: school.classProfile.avgGMAT ?? '—' },
          { label: 'Tuition / yr', value: fmt(school.costs.annualTuition) },
          { label: 'Placed', value: `${school.employment.employmentRate3Months}%` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-50 rounded-lg p-2 text-center">
            <div className="font-mono font-semibold text-slate-700 text-xs leading-none mb-0.5">{value}</div>
            <div className="text-xs text-slate-400">{label}</div>
          </div>
        ))}
      </div>

    </div>
  )
}
