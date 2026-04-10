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

export default function SchoolCardCompact({ scored, formData }) {
  const { school, totalScore, breakdown, tier } = scored
  const bullets = generateFitBullets(school, formData, breakdown)
  const watchOut = generateWatchOut(school, formData)

  const isStretch = tier === 'stretch'

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow ${
      isStretch ? 'border-amber-200' : 'border-slate-100'
    }`}>

      {/* Stretch badge */}
      {isStretch && (
        <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-200 mb-3">
          Stretch / Reach
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 text-base leading-snug">{school.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            {school.location.city}, {school.location.state}
          </p>
        </div>
        <a
          href={school.programUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-500 hover:text-indigo-700 transition-colors shrink-0 mt-0.5"
          aria-label={`Visit ${school.name} website`}
        >
          <ExternalLink size={14} />
        </a>
      </div>

      {/* ── Fit score ──────────────────────────────────────────────────── */}
      <div className="mb-3">
        <FitScoreBar score={totalScore} tier={tier} />
      </div>

      {/* ── Watch out first (more prominent in this tier) ───────────────── */}
      <div className="flex gap-2 bg-amber-50 rounded-lg p-2.5 border border-amber-100 mb-3">
        <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">{watchOut}</p>
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
          { label: 'Avg GMAT', value: school.classProfile.avgGMAT },
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
