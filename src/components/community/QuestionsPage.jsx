import React, { useCallback, useEffect, useState } from 'react'
import NavBar from '../NavBar.jsx'
import AskForm from './AskForm.jsx'
import QuestionItem from './QuestionItem.jsx'
import { getQuestions, SCHOOL_OPTIONS } from '../../utils/community.js'

export default function QuestionsPage() {
  const [school, setSchool] = useState('')
  const [state, setState] = useState({ status: 'loading', questions: [] })
  const load = useCallback(() => {
    getQuestions(school).then(q => setState({ status: 'ok', questions: q })).catch(e => setState({ status: 'error', message: e.message, questions: [] }))
  }, [school])
  useEffect(load, [load])
  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-800 tracking-tight">Q&A with students and alumni</h1>
          <p className="text-slate-600 mt-2">Ask once, and everyone applying gets the answer. Answers come from current students and alumni.</p>
        </div>
        <AskForm defaultSchool={school} onAsked={load} />
        <select value={school} onChange={e => setSchool(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">All questions</option>
          {SCHOOL_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {state.status === 'error' && <p className="text-sm text-slate-500">{state.message}</p>}
        {state.status === 'ok' && state.questions.length === 0 && <p className="text-sm text-slate-500">No questions yet. Be the first to ask.</p>}
        <div className="space-y-4">{state.questions.map(q => <QuestionItem key={q.id} q={q} />)}</div>
      </main>
    </div>
  )
}
