/**
 * CompareModal.jsx
 * ---------------------------------------------------------------------------
 * Full-screen modal overlay that shows 2–3 selected schools side by side.
 * Highlights the best value in each numeric row in green.
 * Scrollable vertically; table horizontally scrollable on small screens.
 * ---------------------------------------------------------------------------
 */

import React, { useEffect } from 'react'
import { X, CheckCircle2, AlertCircle } from 'lucide-react'
import { generateFitBullets, generateWatchOut } from '../utils/bulletGenerator.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n) {
  if (n == null) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`
  return `$${n}`
}

// ---------------------------------------------------------------------------
// Row definitions
// ---------------------------------------------------------------------------
// Each row: { key, label, better, getValue, render }
//   better: 'higher' | 'lower' | null  (null = no best-value highlight)
//   getValue: scored → number | null    (for comparison; null = no compare)
//   render:  scored → React node        (for display)
// ---------------------------------------------------------------------------

const ROWS = [
  {
    key: 'fitScore',
    label: 'Fit Score',
    better: 'higher',
    getValue: s => s.totalScore ?? null,
    render: s => s.totalScore != null ? `${s.totalScore}%` : '—',
  },
  {
    key: 'avgGMAT',
    label: 'Avg GMAT',
    better: 'higher',
    getValue: s => s.school.classProfile?.avgGMAT ?? null,
    render: s => s.school.classProfile?.avgGMAT ?? '—',
  },
  {
    key: 'tuition',
    label: 'Annual Tuition',
    better: 'lower',
    getValue: s => s.school.costs?.annualTuition ?? null,
    render: s => fmt(s.school.costs?.annualTuition),
  },
  {
    key: 'salary',
    label: 'Avg Starting Salary',
    better: 'higher',
    getValue: s => s.school.employment?.avgStartingSalary ?? null,
    render: s => fmt(s.school.employment?.avgStartingSalary),
  },
  {
    key: 'empRate',
    label: 'Employment Rate',
    better: 'higher',
    getValue: s => s.school.employment?.employmentRate3Months ?? null,
    render: s => {
      const r = s.school.employment?.employmentRate3Months
      return r != null ? `${r}% at 3 months` : '—'
    },
  },
  {
    key: 'classSize',
    label: 'Class Size',
    better: null,
    getValue: () => null,
    render: s => s.school.classProfile?.size ?? '—',
  },
  {
    key: 'workExp',
    label: 'Avg Work Experience',
    better: null,
    getValue: () => null,
    render: s => {
      const v = s.school.classProfile?.avgWorkExperience
      return v != null ? `${v} years` : '—'
    },
  },
  {
    key: 'intlPct',
    label: 'International %',
    better: null,
    getValue: () => null,
    render: s => {
      const v = s.school.classProfile?.internationalStudentPct
      return v != null ? `${v}%` : '—'
    },
  },
  {
    key: 'stemOpt',
    label: 'STEM OPT',
    better: null,
    getValue: () => null,
    render: s => (s.school.stemOpt ? 'Yes' : 'No'),
  },
  {
    key: 'campus',
    label: 'Campus Type',
    better: null,
    getValue: () => null,
    render: s => {
      const t = s.school.campusType
      return t === 'urban' ? 'Urban' : t === 'campus-town' ? 'Campus-town' : '—'
    },
  },
  {
    key: 'whyFits',
    label: 'Why It Fits',
    better: null,
    isList: true,
    listType: 'positive',
  },
  {
    key: 'watchOut',
    label: 'Watch Out',
    better: null,
    isList: true,
    listType: 'warning',
  },
]

// ---------------------------------------------------------------------------
// Best-value detection
// ---------------------------------------------------------------------------

/**
 * Returns a Set of indices (into scoredList) that hold the best value for
 * this row. Returns an empty Set if no comparison makes sense.
 */
function getBestIndices(row, scoredList) {
  if (!row.better) return new Set()
  const vals = scoredList.map(s => row.getValue(s))
  const numeric = vals.filter(v => typeof v === 'number')
  // Need at least 2 valid values to compare; also skip if all equal
  if (numeric.length < 2) return new Set()
  if (numeric.every(v => v === numeric[0])) return new Set()

  const best = row.better === 'higher' ? Math.max(...numeric) : Math.min(...numeric)
  return new Set(vals.map((v, i) => (v === best ? i : null)).filter(i => i !== null))
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LabelCell({ label, shaded }) {
  return (
    <div
      className={`py-3.5 px-4 border-b border-slate-100 flex items-start ${
        shaded ? 'bg-slate-50' : 'bg-white'
      }`}
    >
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide leading-snug">
        {label}
      </span>
    </div>
  )
}

function ValueCell({ children, isBest, shaded }) {
  return (
    <div
      className={`py-3.5 px-4 border-b border-slate-100 text-sm ${
        isBest
          ? 'bg-emerald-50 text-emerald-700 font-semibold'
          : shaded
          ? 'bg-slate-50 text-slate-700'
          : 'bg-white text-slate-700'
      }`}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * @param {Array}   scoredList       — [{ school, totalScore, tier, … }, …]
 * @param {object}  formData         — user form state (for bullet generation)
 * @param {Array}   allScoredResults — full runMatching().allScored (for comparative bullets)
 * @param {Function} onClose         — called to close the modal
 */
export default function CompareModal({ scoredList, formData, allScoredResults, onClose }) {
  // Close on Escape key
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  if (!scoredList?.length) return null

  const count = scoredList.length

  // Pre-compute bullets and watch-outs for each school
  const bulletsPerSchool  = scoredList.map(s => generateFitBullets(s.school, formData, allScoredResults))
  const watchOutsPerSchool = scoredList.map(s => generateWatchOut(s.school, formData, allScoredResults))

  return (
    /* ── Backdrop — click outside modal to close ─────────────────────────── */
    <div
      className="fixed inset-0 z-50 bg-black/50 overflow-y-auto"
      onClick={onClose}
    >
      <div className="min-h-full flex items-start justify-center p-3 sm:p-6">

        {/* ── Modal card ─────────────────────────────────────────────────── */}
        <div
          className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl my-4"
          onClick={e => e.stopPropagation()}
        >

          {/* ── Header ────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100">
            <div>
              <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-widest mb-0.5">
                Side-by-Side
              </p>
              <h2 className="text-lg sm:text-xl font-semibold text-slate-800 tracking-tight">
                Comparing {count} Program{count !== 1 ? 's' : ''}
              </h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Close comparison"
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* ── Table — horizontal scroll on small screens ─────────────────── */}
          <div className="overflow-x-auto">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `160px repeat(${count}, minmax(190px, 1fr))`,
              }}
            >

              {/* ── School name headers ──────────────────────────────────── */}
              <div className="bg-slate-800 py-4 px-4" /> {/* empty label corner */}
              {scoredList.map((s, i) => (
                <div
                  key={s.school.id}
                  className={`py-4 px-4 ${i % 2 === 1 ? 'bg-indigo-700' : 'bg-slate-800'}`}
                >
                  <p className="font-semibold text-white text-sm leading-snug mb-0.5 line-clamp-2">
                    {s.school.name}
                  </p>
                  <p className="text-slate-400 text-xs">
                    {s.school.location.city}, {s.school.location.state}
                  </p>
                  <span className={`inline-block mt-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    s.tier === 'strong'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : s.tier === 'stretch'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-indigo-400/20 text-indigo-200'
                  }`}>
                    {s.tier === 'strong' ? 'Strong Fit' : s.tier === 'stretch' ? 'Stretch' : 'Worth Exploring'}
                  </span>
                </div>
              ))}

              {/* ── Data rows ─────────────────────────────────────────────── */}
              {ROWS.map((row, rowIdx) => {
                const shaded = rowIdx % 2 === 0

                /* List rows (Why It Fits / Watch Out) */
                if (row.isList) {
                  const isPositive = row.listType === 'positive'
                  return (
                    <React.Fragment key={row.key}>
                      <LabelCell label={row.label} shaded={shaded} />
                      {scoredList.map((s, i) => {
                        const items = isPositive ? bulletsPerSchool[i] : watchOutsPerSchool[i]
                        return (
                          <ValueCell key={s.school.id} isBest={false} shaded={shaded}>
                            <ul className="space-y-2">
                              {items.map((item, j) => (
                                <li key={j} className="flex gap-1.5 leading-relaxed text-xs">
                                  {isPositive
                                    ? <CheckCircle2 size={11} className="text-emerald-500 shrink-0 mt-0.5" />
                                    : <AlertCircle  size={11} className="text-amber-500  shrink-0 mt-0.5" />
                                  }
                                  <span className={isPositive ? 'text-slate-600' : 'text-amber-800'}>
                                    {item}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </ValueCell>
                        )
                      })}
                    </React.Fragment>
                  )
                }

                /* Numeric / text rows */
                const bestIdx = getBestIndices(row, scoredList)
                return (
                  <React.Fragment key={row.key}>
                    <LabelCell label={row.label} shaded={shaded} />
                    {scoredList.map((s, i) => (
                      <ValueCell key={s.school.id} isBest={bestIdx.has(i)} shaded={shaded}>
                        <span className="font-mono">{row.render(s)}</span>
                        {bestIdx.has(i) && (
                          <span className="ml-1.5 text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">
                            best
                          </span>
                        )}
                      </ValueCell>
                    ))}
                  </React.Fragment>
                )
              })}

            </div>
          </div>

          {/* ── Footer ─────────────────────────────────────────────────────── */}
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
            <p className="text-xs text-slate-400 text-center">
              Green highlight = best value in this row · Data verified against official sources · MBATribe
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
