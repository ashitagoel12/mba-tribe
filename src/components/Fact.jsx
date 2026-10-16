import React from 'react'
import { checkLink } from '../utils/fieldStatus.js'

/** Shows a figure if it was verified; otherwise a link to the school's own page. */
export default function Fact({ school, field, children }) {
  const url = checkLink(school, field)
  if (!url) return <>{children}</>
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="text-indigo-600 hover:text-indigo-800 underline decoration-dotted text-[0.85em] font-medium whitespace-nowrap"
      title="We couldn't verify this figure on the school's website. Click to check it there.">
      See school site ↗
    </a>
  )
}
