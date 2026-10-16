import React from 'react'
import { CalendarCheck, Linkedin } from 'lucide-react'

export default function MentorCard({ m }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-800">{m.name}</p>
          <p className="text-xs text-slate-500">{m.schoolName} · {m.role === 'alum' ? 'Alum' : 'Student'}, Class of {m.classYear}</p>
        </div>
        {m.linkedin && (
          <a href={m.linkedin} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-indigo-600" aria-label={`${m.name} on LinkedIn`}>
            <Linkedin size={16} />
          </a>
        )}
      </div>
      <p className="text-sm text-slate-600 leading-relaxed mt-3 flex-1">{m.bio}</p>
      {m.topics?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {m.topics.map(t => <span key={t} className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{t}</span>)}
        </div>
      )}
      <a href={m.bookingUrl} target="_blank" rel="noopener noreferrer"
        className="mt-4 inline-flex items-center justify-center gap-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2">
        <CalendarCheck size={15} /> Book a free call
      </a>
    </div>
  )
}
