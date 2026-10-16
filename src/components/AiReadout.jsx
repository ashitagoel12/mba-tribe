import React, { useEffect, useState } from 'react'
import { Sparkles, ShieldCheck } from 'lucide-react'
import { fetchExplanation } from '../utils/aiClient.js'

/**
 * Claude's read on the top matches. Explains each match using the parts of
 * the profile the scoring rules can't read: industry, function and notes.
 * Hidden entirely if the AI service is unavailable, so the page never breaks.
 */
export default function AiReadout({ formData, topSchools }) {
  const [state, setState] = useState({ status: 'loading' })
  const ids = topSchools.map(s => s.school.id)

  useEffect(() => {
    let live = true
    fetchExplanation(formData, ids)
      .then(data => live && setState({ status: 'ok', data }))
      .catch(() => live && setState({ status: 'error' }))
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(formData), ids.join(',')])

  if (state.status === 'error') return null

  const nameOf = id => topSchools.find(s => s.school.id === id)?.school.shortName
    || topSchools.find(s => s.school.id === id)?.school.name || id

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 mb-10" aria-live="polite">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={16} className="text-indigo-500" />
        <h2 className="text-sm font-semibold text-slate-800">AI read on your top matches</h2>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Written by Claude from your answers and the school data on this page.
      </p>

      {state.status === 'loading' && (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-slate-100 rounded w-11/12" />
          <div className="h-3 bg-slate-100 rounded w-9/12" />
          <div className="h-3 bg-slate-100 rounded w-10/12" />
        </div>
      )}

      {state.status === 'ok' && (
        <>
          {state.data.overview && (
            <p className="text-sm text-slate-700 leading-relaxed mb-4">{state.data.overview}</p>
          )}
          <ul className="space-y-4">
            {state.data.schools.filter(r => !r.withheld).map(r => (
              <li key={r.id} className="border-l-2 border-indigo-200 pl-3">
                <p className="text-sm font-semibold text-slate-800">{nameOf(r.id)}</p>
                <p className="text-sm text-slate-700 leading-relaxed">{r.read}</p>
                {r.question_to_ask && (
                  <p className="text-xs text-slate-500 mt-1">Ask them: {r.question_to_ask}</p>
                )}
              </li>
            ))}
          </ul>
          <p className="flex items-center gap-1.5 text-xs text-slate-400 mt-4">
            <ShieldCheck size={13} />
            Every number above was checked against our dataset before it was shown.
            {state.data.checks?.withheld > 0 && ` ${state.data.checks.withheld} item(s) failed the check and were hidden.`}
          </p>
        </>
      )}
    </section>
  )
}
