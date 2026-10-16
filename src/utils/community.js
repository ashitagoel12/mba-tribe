// Browser client for /api/community
import schoolsData from '../../data/mba_schools_data.json'

export const SCHOOL_OPTIONS = schoolsData.schools
  .map(s => ({ id: s.id, name: s.shortName || s.name }))
  .sort((a, b) => a.name.localeCompare(b.name))

async function call(action, { method = 'GET', body, query = {}, headers = {} } = {}) {
  const qs = new URLSearchParams({ action, ...Object.fromEntries(Object.entries(query).filter(([, v]) => v)) })
  const res = await fetch(`/api/community?${qs}`, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
  return json
}

export const getMentors = school => call('mentors', { query: { school } })
export const getQuestions = school => call('questions', { query: { school } })
export const applyAsMentor = body => call('apply', { method: 'POST', body })
export const askQuestion = body => call('ask', { method: 'POST', body })
export const mentorHome = token => call('mentor-home', { headers: { 'x-mentor-token': token } })
export const answer = (token, questionId, body) => call('answer', { method: 'POST', body: { questionId, body }, headers: { 'x-mentor-token': token } })
export const adminOverview = token => call('admin', { headers: { 'x-admin-token': token } })
export const adminAction = (token, body) => call('admin', { method: 'POST', body, headers: { 'x-admin-token': token } })

export const timeAgo = ts => {
  const d = Math.floor((Date.now() - ts) / 86400000)
  return d < 1 ? 'today' : d === 1 ? 'yesterday' : d < 30 ? `${d} days ago` : new Date(ts).toLocaleDateString()
}
