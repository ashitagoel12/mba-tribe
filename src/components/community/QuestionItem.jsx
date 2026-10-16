import React from 'react'
import { MessageSquare } from 'lucide-react'
import { timeAgo } from '../../utils/community.js'

export default function QuestionItem({ q }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
        {q.schoolName && <span className="bg-indigo-50 text-indigo-700 rounded-full px-2 py-0.5 font-medium">{q.schoolName}</span>}
        <span>{q.askedBy} · {timeAgo(q.createdAt)}</span>
      </div>
      <p className="font-medium text-slate-800">{q.title}</p>
      {q.body && <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{q.body}</p>}
      {q.answers.length > 0 ? (
        <div className="mt-4 space-y-3">
          {q.answers.map((a, i) => (
            <div key={i} className="border-l-2 border-indigo-200 pl-3">
              <p className="text-xs text-slate-500 mb-0.5">
                <span className="font-semibold text-slate-700">{a.mentor.name}</span>
                {a.mentor.schoolName ? ` · ${a.mentor.schoolName} ${a.mentor.role === 'alum' ? 'alum' : 'student'}` : ''} · {timeAgo(a.createdAt)}
              </p>
              <p className="text-sm text-slate-700 whitespace-pre-line">{a.body}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-400 flex items-center gap-1.5"><MessageSquare size={13} /> Waiting for a student or alum to answer</p>
      )}
    </div>
  )
}
