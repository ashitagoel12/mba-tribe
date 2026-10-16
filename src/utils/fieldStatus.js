// After a data refresh, each school records which figures were verified against
// its own website. Anything else is shown as a link to the school's page instead
// of a number we can't stand behind.

/** Returns the URL to check, or null when the figure is verified (or the school hasn't been refreshed yet). */
export function checkLink(school, field) {
  const r = school?.refresh
  if (!r) return null
  if (r.verified?.includes(field)) return null
  return r.links?.[field] || school.programUrl || null
}

export const isVerified = (school, field) => !checkLink(school, field)
