import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import NavBar from '../NavBar.jsx'
import MentorCard from './MentorCard.jsx'
import { getMentors, SCHOOL_OPTIONS } from '../../utils/community.js'

export default function MentorsPage() {
  const [school, setSchool] = useState('')
  const [state, setState] = useState({ status: 'loading', mentors: [] })
  useEffect(() => {
    setState(s => ({ ...s, status: 'loading' }))
    getMentors(school).then(m => setState({ status: 'ok', mentors: m })).catch(e => setState({ status: 'error', message: e.message, mentors: [] }))
  }, [school])
  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold text-slate-800 tracking-tight">Talk to students and alumni</h1>
        <p className="text-slate-600 mt-2 max-w-2xl">Skip the cold LinkedIn messages. Book a free call with someone who has been through the program, or post a question on the <Link to="/questions" className="text-indigo-600 underline">Q&A board</Link>.</p>
        <div className="flex flex-wrap items-center gap-3 mt-6 mb-6">
          <select value={school} onChange={e => setSchool(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">All schools</option>
            {SCHOOL_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Link to="/mentors/apply" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Student or alum? Become a mentor →</Link>
        </div>
        {state.status === 'loading' && <p className="text-sm text-slate-400">Loading…</p>}
        {state.status === 'error' && <p className="text-sm text-slate-500">{state.message}</p>}
        {state.status === 'ok' && state.mentors.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-sm text-slate-600">
            No mentors {school ? 'for this school ' : ''}yet. <Link to="/questions" className="text-indigo-600 underline">Post your question</Link> and we'll find someone to answer.
          </div>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.mentors.map(m => <MentorCard key={m.id} m={m} />)}
        </div>
      </main>
    </div>
  )
}
