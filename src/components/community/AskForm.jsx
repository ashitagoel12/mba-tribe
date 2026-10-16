import React, { useState } from 'react'
import { askQuestion, SCHOOL_OPTIONS } from '../../utils/community.js'

export default function AskForm({ defaultSchool = '', onAsked }) {
  const [f, setF] = useState({ schoolId: defaultSchool, title: '', body: '', name: '' })
  const [state, setState] = useState({ status: 'idle' })
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }))
  const submit = async e => {
    e.preventDefault()
    setState({ status: 'sending' })
    try {
      const r = await askQuestion(f)
      setState({ status: r.status === 'visible' ? 'posted' : 'held' })
      setF(x => ({ ...x, title: '', body: '' }))
      onAsked?.()
    } catch (err) { setState({ status: 'error', message: err.message }) }
  }
  return (
    <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
      <h2 className="font-semibold text-slate-800">Ask students and alumni</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <select value={f.schoolId} onChange={set('schoolId')} className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Any school / general question</option>
          {SCHOOL_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input value={f.name} onChange={set('name')} maxLength={60} placeholder="Your first name (optional)" className="border border-slate-200 rounded-lg px-3 py-2 text-sm" />
      </div>
      <input value={f.title} onChange={set('title')} maxLength={150} required placeholder="Your question, e.g. How strong is placement into product management?"
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
      <textarea value={f.body} onChange={set('body')} maxLength={2000} rows={3} placeholder="Context (optional): your background, what you've already found"
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-400">Posted publicly. Don't include your email or phone number.</p>
        <button disabled={state.status === 'sending'} className="text-sm font-medium bg-indigo-600 text-white rounded-lg px-4 py-2 disabled:opacity-60">
          {state.status === 'sending' ? 'Posting…' : 'Post question'}
        </button>
      </div>
      {state.status === 'posted' && <p className="text-sm text-emerald-700">Posted. Students and alumni will see it.</p>}
      {state.status === 'held' && <p className="text-sm text-amber-700">Thanks. Your question will appear once it's reviewed.</p>}
      {state.status === 'error' && <p className="text-sm text-red-600">{state.message}</p>}
    </form>
  )
}
