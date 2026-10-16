import React, { useCallback, useState } from 'react'
import NavBar from '../NavBar.jsx'
import { adminOverview, adminAction } from '../../utils/community.js'

export default function AdminPage() {
  const [token, setToken] = useState(() => { try { return sessionStorage.getItem('mbatribe:admin') || '' } catch { return '' } })
  const [pw, setPw] = useState('')
  const [data, setData] = useState(null)
  const [msg, setMsg] = useState('')
  const [links, setLinks] = useState({})

  const load = useCallback(async (t = token) => {
    try { const d = await adminOverview(t); setData(d); setMsg('') } catch (e) { setData(null); setMsg(e.message) }
  }, [token])

  const signIn = async e => {
    e.preventDefault()
    try { sessionStorage.setItem('mbatribe:admin', pw) } catch { /* ignore */ }
    setToken(pw); load(pw)
  }
  const act = async (body, key) => {
    try {
      const r = await adminAction(token, body)
      if (r.mentorLink) setLinks(l => ({ ...l, [key]: r }))
      await load()
    } catch (e) { setMsg(e.message) }
  }
  React.useEffect(() => { if (token) load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        <h1 className="text-3xl font-semibold text-slate-800 tracking-tight">Admin</h1>
        {!data && (
          <form onSubmit={signIn} className="flex gap-2 max-w-md">
            <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Admin password" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <button className="text-sm font-medium bg-indigo-600 text-white rounded-lg px-4">Sign in</button>
          </form>
        )}
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        {data && (
          <>
            <section>
              <h2 className="font-semibold text-slate-800 mb-3">Mentor applications ({data.pending.length})</h2>
              {data.pending.length === 0 && <p className="text-sm text-slate-500">None waiting.</p>}
              <div className="space-y-3">
                {data.pending.map(m => (
                  <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-4 text-sm">
                    <p className="font-medium text-slate-800">{m.name} · {m.schoolName} · {m.role} {m.classYear}</p>
                    <p className="text-slate-500">{m.email} · <a className="underline" href={m.bookingUrl} target="_blank" rel="noopener noreferrer">booking link</a>{m.linkedin && <> · <a className="underline" href={m.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a></>}</p>
                    <p className="text-slate-600 mt-2">{m.bio}</p>
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => act({ action: 'approve', mentorId: m.id }, m.id)} className="bg-emerald-600 text-white rounded-lg px-3 py-1.5">Approve</button>
                      <button onClick={() => act({ action: 'reject', mentorId: m.id })} className="border border-slate-200 rounded-lg px-3 py-1.5">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
              {Object.entries(links).map(([id, r]) => (
                <div key={id} className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm">
                  <p className="text-emerald-800">Approved. Send this private link to <b>{r.email}</b>; it's shown only once:</p>
                  <input readOnly value={r.mentorLink} onFocus={e => e.target.select()} className="mt-2 w-full border border-emerald-200 rounded-lg px-3 py-2 font-mono text-xs bg-white" />
                </div>
              ))}
            </section>

            <section>
              <h2 className="font-semibold text-slate-800 mb-3">Held for review ({data.held.length})</h2>
              {data.held.length === 0 && <p className="text-sm text-slate-500">Nothing held.</p>}
              <div className="space-y-3">
                {data.held.map((h, i) => (
                  <div key={i} className="bg-white border border-amber-200 rounded-xl p-4 text-sm">
                    <p className="text-xs text-amber-700">{h.kind === 'answer' ? `Answer by ${h.author}` : 'Question'} · {h.reason}</p>
                    <p className="font-medium text-slate-800 mt-1">{h.title}</p>
                    {h.body && <p className="text-slate-600 mt-1 whitespace-pre-line">{h.body}</p>}
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => act({ action: 'publish', questionId: h.questionId, mentorId: h.mentorId })} className="bg-emerald-600 text-white rounded-lg px-3 py-1.5">Publish</button>
                      <button onClick={() => act({ action: 'hide', questionId: h.questionId, mentorId: h.mentorId })} className="border border-slate-200 rounded-lg px-3 py-1.5">Hide</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="font-semibold text-slate-800 mb-3">Active mentors ({data.approved.length})</h2>
              <div className="space-y-2">
                {data.approved.map(m => (
                  <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-3 text-sm flex items-center justify-between gap-3">
                    <span>{m.name} · {m.schoolName} · {m.email}</span>
                    <span className="flex gap-2 shrink-0">
                      <button onClick={() => act({ action: 'new-link', mentorId: m.id }, m.id)} className="border border-slate-200 rounded-lg px-2 py-1">New link</button>
                      <button onClick={() => { if (window.confirm(`Remove ${m.name}?`)) act({ action: 'remove', mentorId: m.id }) }} className="border border-red-200 text-red-600 rounded-lg px-2 py-1">Remove</button>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
