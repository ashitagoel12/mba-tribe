import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Users, Target, DollarSign } from 'lucide-react'
import NavBar from './NavBar.jsx'

export default function WelcomeScreen({ onStart }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <NavBar />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center px-4 py-16 sm:py-24">
        <div className="max-w-2xl mx-auto text-center">

          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium px-4 py-2 rounded-full mb-8">
            <Target size={14} />
            <span>MBA Fit Copilot</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-semibold text-slate-800 tracking-tight leading-tight mb-6">
            Find Your MBA Fit
          </h1>

          <p className="text-lg sm:text-xl text-slate-500 leading-relaxed mb-10 max-w-xl mx-auto">
            This is not a rankings tool. It's a fit tool. Answer a few questions and
            we'll match you to programs that actually align with your goals, background,
            and constraints.
          </p>

          <button
            onClick={onStart}
            className="inline-flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-8 py-4 rounded-lg font-medium text-lg transition-colors shadow-sm"
          >
            Start My Assessment
            <ArrowRight size={20} />
          </button>

          <p className="mt-4 text-sm text-slate-400">
            Takes about 4 minutes · No sign-up required
          </p>

          <div className="mt-5">
            <Link
              to="/schools"
              className="inline-flex items-center gap-2 border border-slate-300 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 px-6 py-3 rounded-lg font-medium text-sm transition-colors"
            >
              Browse all 100 MBA schools
            </Link>
          </div>
        </div>
      </main>

      {/* ── Why I Built This ────────────────────────────────────────────── */}
      <section className="px-4 pb-12">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-5 tracking-tight">
            Why This Tool Exists
          </h2>
          <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
            <p>
              I built MBA Tribe when I was applying to business school as an international applicant.
              I was overwhelmed by rankings, prestige obsession, and expensive consultants who pushed
              the same "safe" schools to everyone — regardless of what I actually wanted from the degree.
            </p>
            <p>
              MBA Tribe grew to 2,000 members in four months because applicants need clarity, not more
              noise. This tool exists to help you find schools that actually fit your goals — not just
              the most famous names on a magazine list.
            </p>
            <p className="font-medium text-slate-700">
              This is peer-first, practical guidance. No sales pitch, no BS.
            </p>
          </div>
        </div>
      </section>

      {/* ── Value props ─────────────────────────────────────────────────── */}
      <section className="px-4 pb-16">
        <div className="max-w-3xl mx-auto grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: <Target size={20} className="text-indigo-500" />,
              heading: 'Fit, not rankings',
              body: "We weight what matters to you — placement, cost, culture, geography — not a magazine's formula.",
            },
            {
              icon: <Users size={20} className="text-indigo-500" />,
              heading: '100 programs analysed',
              body: 'Data from official class profiles and employment reports, updated for 2025–2026.',
            },
            {
              icon: <DollarSign size={20} className="text-indigo-500" />,
              heading: 'Honest tradeoffs',
              body: 'Every match includes a candid "watch out for" note so you go in with open eyes.',
            },
          ].map(({ icon, heading, body }) => (
            <div key={heading} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
              <div className="mb-3">{icon}</div>
              <h3 className="font-semibold text-slate-800 mb-1 text-sm">{heading}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-100 px-6 py-4">
        <div className="max-w-5xl mx-auto text-center text-sm text-slate-400">
          100 programs · Data updated 2025–2026 · Built by MBA Tribe
        </div>
      </footer>

    </div>
  )
}
