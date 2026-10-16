import React, { useState } from 'react'
import { MessageCircleQuestion } from 'lucide-react'
import { askSchool, lastProfile } from '../utils/aiClient.js'

const EXAMPLES = ['How strong is placement in consulting?', 'Is it a good fit for international students?', 'What are the main costs?']

/** Ask Claude one question about this school, answered only from its record. */
export default function AskSchool({ school }) {
  const [q, setQ] = useState('')
  const [state, setState] = useState({ status: 'idle' })

  const submit = async (question) => {
    const text = (question ?? q).trim()
    if (text.length < 3) return
    setQ(text)
    setState({ status: 'loading' })
    try {
      const out = await askSchool(school.id, text, lastProfile())
      setState({ status: 'ok', out })
    } catch (e) {
      setState({ status: 'error', message: e.message })
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 mb-1">
        <MessageCircleQuestion size={16} className="text-indigo-500" />
        Ask about {school.shortName || school.name}
      </h3>
      <p className="text-xs text-slate-500 mb-3">
        Claude answers from this page's data only, and says so when the data doesn't cover your question.
      </p>
      <form onSubmit={e => { e.preventDefault(); submit() }} className="flex gap-2">
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          maxLength={300}
          placeholder="e.g. How does it place in tech?"
          className="flex-1 min-w-0 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <button
          type="submit"
          disabled={state.status === 'loading'}
          className="text-sm font-medium bg-indigo-600 text-white rounded-lg px-4 py-2 disabled:opacity-60"
        >
          {state.status === 'loading' ? 'Asking…' : 'Ask'}
        </button>
      </form>
      {state.status === 'idle' && (
        <div className="flex flex-wrap gap-2 mt-3">
          {EXAMPLES.map(ex => (
            <button key={ex} type="button" onClick={() => submit(ex)}
              className="text-xs text-indigo-700 bg-indigo-50 rounded-full px-3 py-1 hover:bg-indigo-100">
              {ex}
            </button>
          ))}
        </div>
      )}
      {state.status === 'ok' && (
        <div className="mt-3 text-sm text-slate-700 leading-relaxed">
          <p>{state.out.answer}</p>
          {!state.out.in_data && (
            <p className="text-xs text-amber-700 mt-1">Not fully covered by our data. Confirm with the school.</p>
          )}
        </div>
      )}
      {state.status === 'error' && (
        <p className="mt-3 text-xs text-slate-500">The AI assistant is unavailable right now. Everything else on this page still works.</p>
      )}
    </div>
  )
}
