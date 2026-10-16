import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users } from 'lucide-react'
import MentorCard from './MentorCard.jsx'
import QuestionItem from './QuestionItem.jsx'
import AskForm from './AskForm.jsx'
import { getMentors, getQuestions } from '../../utils/community.js'

/** On a school page: book a call with its students/alums, and its Q&A. Hidden if the feature isn't set up. */
export default function SchoolCommunity({ school }) {
  const [d, setD] = useState(null)
  const load = () => Promise.all([getMentors(school.id), getQuestions(school.id)])
    .then(([mentors, questions]) => setD({ mentors, questions })).catch(() => setD(false))
  useEffect(() => { load() }, [school.id]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!d) return null
  const name = school.shortName || school.name
  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5">
      <h2 className="flex items-center gap-2 font-semibold text-slate-800"><Users size={17} className="text-indigo-500" /> Talk to {name} students and alumni</h2>
      {d.mentors.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-4 mt-4">{d.mentors.slice(0, 4).map(m => <MentorCard key={m.id} m={m} />)}</div>
      ) : (
        <p className="text-sm text-slate-500 mt-2">No {name} mentors yet. Ask below and we'll find someone. <Link to="/mentors/apply" className="text-indigo-600 underline">Are you a {name} student or alum?</Link></p>
      )}
      <div className="mt-6 space-y-4">
        {d.questions.slice(0, 3).map(q => <QuestionItem key={q.id} q={q} />)}
        {d.questions.length > 3 && <Link to="/questions" className="text-sm text-indigo-600">See all questions →</Link>}
        <AskForm defaultSchool={school.id} onAsked={load} />
      </div>
    </section>
  )
}
