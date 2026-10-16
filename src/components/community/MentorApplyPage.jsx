import React, { useState } from 'react'
import NavBar from '../NavBar.jsx'
import { applyAsMentor, SCHOOL_OPTIONS } from '../../utils/community.js'

const field = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm'

export default function MentorApplyPage() {
  const [f, setF] = useState({ name: '', email: '', schoolId: '', role: 'student', classYear: '', linkedin: '', bookingUrl: '', bio: '', topics: '' })
  const [state, setState] = useState({ status: 'idle' })
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }))
  const submit = async e => {
    e.preventDefault(); setState({ status: 'sending' })
    try {
      await applyAsMentor({ ...f, topics: f.topics.split(',').map(t => t.trim()).filter(Boolean) })
      setState({ status: 'done' })
    } catch (err) { setState({ status: 'error', message: err.message }) }
  }
  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-semibold text-slate-800 tracking-tight">Become a mentor</h1>
        <p className="text-slate-600 mt-2">Applicants book free calls through your own scheduling link, so you control when you're available. You can also answer questions on the Q&A board.</p>
        {state.status === 'done' ? (
          <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-sm text-emerald-800">
            Thanks. We'll review your profile and email you a private link to answer questions once you're approved.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <input className={field} placeholder="Full name" value={f.name} onChange={set('name')} required maxLength={80} />
              <input className={field} type="email" placeholder="Email (not shown publicly)" value={f.email} onChange={set('email')} required />
              <select className={field} value={f.schoolId} onChange={set('schoolId')} required>
                <option value="">Your school</option>
                {SCHOOL_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <div className="flex gap-2">
                <select className={field} value={f.role} onChange={set('role')}><option value="student">Current student</option><option value="alum">Alum</option></select>
                <input className={field} placeholder="Class year" value={f.classYear} onChange={set('classYear')} required maxLength={4} inputMode="numeric" />
              </div>
            </div>
            <input className={field} placeholder="Booking link (Calendly or Cal.com), e.g. https://calendly.com/you/20min" value={f.bookingUrl} onChange={set('bookingUrl')} required />
            <input className={field} placeholder="LinkedIn (optional), https://www.linkedin.com/in/…" value={f.linkedin} onChange={set('linkedin')} />
            <textarea className={field} rows={4} maxLength={600} placeholder="Short bio: your background before the MBA, what you're doing now, what applicants can ask you about" value={f.bio} onChange={set('bio')} required />
            <input className={field} placeholder="Topics, comma separated (e.g. Career switch, Consulting recruiting, International applicants)" value={f.topics} onChange={set('topics')} />
            <p className="text-xs text-slate-500">No calendar link yet? Calendly and Cal.com both have free plans. Make a 20-minute event and paste its link here.</p>
            <button disabled={state.status === 'sending'} className="text-sm font-medium bg-indigo-600 text-white rounded-lg px-5 py-2 disabled:opacity-60">
              {state.status === 'sending' ? 'Sending…' : 'Apply'}
            </button>
            {state.status === 'error' && <p className="text-sm text-red-600">{state.message}</p>}
          </form>
        )}
      </main>
    </div>
  )
}
