import React, { useCallback, useEffect, useState } from 'react'
import NavBar from '../NavBar.jsx'
import { mentorHome, answer, timeAgo } from '../../utils/community.js'

const KEY = 'mbatribe:mentorToken'

function AnswerBox({ token, q, onDone }) {
  const [text, setText] = useState('')
  const [state, setState] = useState({ status: 'idle' })
  const submit = async e => {
    e.preventDefault(); setState({ status: 'sending' })
    try { const r = await answer(token, q.id, text); setState({ status: r.status }); onDone() }
    catch (err) { setState({ status: 'error', message: err.message }) }
  }
  return (
    <form onSubmit={submit} className="mt-3 space-y-2">
      <textarea rows={3} value={text} onChange={e => setText(e.target.value)} maxLength={3000}
        placeholder={q.answeredByMe ? 'Edit your answer' : 'Write your answer'} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
      <div className="flex items-center gap-3">
        <button disabled={state.status === 'sending' || text.trim().length < 20} className="text-sm font-medium bg-indigo-600 text-white rounded-lg px-4 py-1.5 disabled:opacity-50">
          {q.answeredByMe ? 'Update answer' : 'Post answer'}
        </button>
        {state.status === 'visible' && <span className="text-xs text-emerald-700">Posted.</span>}
        {state.status === 'held' && <span className="text-xs text-amber-700">Saved; it will appear after review.</span>}
        {state.status === 'error' && <span className="text-xs text-red-600">{state.message}</span>}
      </div>
    </form>
  )
}

export default function MentorDashboard() {
  const [token] = useState(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('token')
    try { if (fromUrl) sessionStorage.setItem(KEY, fromUrl) } catch { /* ignore */ }
    try { return fromUrl || sessionStorage.getItem(KEY) || '' } catch { return fromUrl || '' }
  })
  const [state, setState] = useState({ status: 'loading' })
  const [filter, setFilter] = useState('open')
  const load = useCallback(() => {
    if (!token) return setState({ status: 'error', message: 'Open this page from your private mentor link.' })
    mentorHome(token).then(d => setState({ status: 'ok', ...d })).catch(e => setState({ status: 'error', message: e.message }))
  }, [token])
  useEffect(() => {
    if (window.location.search) window.history.replaceState(null, '', '/mentor') // keep the token out of the address bar
    load()
  }, [load])

  const qs = state.status === 'ok' ? state.questions.filter(q => filter === 'all' || (filter === 'open' ? !q.answeredByMe : q.answeredByMe)) : []
  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <h1 className="text-3xl font-semibold text-slate-800 tracking-tight">Mentor inbox</h1>
        {state.status === 'loading' && <p className="text-sm text-slate-400">Loading…</p>}
        {state.status === 'error' && <p className="text-sm text-slate-600">{state.message}</p>}
        {state.status === 'ok' && (
          <>
            <p className="text-slate-600">Hi {state.mentor.name.split(' ')[0]}. These are open questions about {state.mentor.schoolName} and general MBA questions. Keep this link private; it's how the site knows it's you.</p>
            <div className="flex gap-2 text-sm">
              {[['open', 'Not answered by me'], ['mine', 'My answers'], ['all', 'All']].map(([k, l]) => (
                <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 rounded-lg ${filter === k ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{l}</button>
              ))}
            </div>
            {qs.length === 0 && <p className="text-sm text-slate-500">Nothing here right now.</p>}
            {qs.map(q => (
              <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="text-xs text-slate-400">{q.schoolName || 'General'} · {q.askedBy} · {timeAgo(q.createdAt)} · {q.answers.length} answer(s)</p>
                <p className="font-medium text-slate-800 mt-1">{q.title}</p>
                {q.body && <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{q.body}</p>}
                <AnswerBox token={token} q={q} onDone={load} />
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  )
}
