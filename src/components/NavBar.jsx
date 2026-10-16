import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Menu, X } from 'lucide-react'

export default function NavBar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  const links = [
    { to: '/',        label: 'Take Assessment' },
    { to: '/schools', label: 'Browse Schools'  },
    { to: '/mentors', label: 'Talk to Students' },
    { to: '/questions', label: 'Q&A' },
  ]

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <BookOpen size={17} className="text-indigo-600" />
          <span className="font-semibold text-slate-800 tracking-tight text-sm">MBATribe</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {links.map(({ to, label }) => {
            const active = pathname === to || (to !== '/' && pathname.startsWith(to))
            return (
              <Link
                key={to}
                to={to}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="sm:hidden border-t border-slate-100 bg-white px-4 py-2">
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className="block py-2.5 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
