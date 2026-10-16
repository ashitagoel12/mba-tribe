// Browser-side calls to the /api functions, with a per-tab cache so a page
// refresh does not pay for the same readout twice.

const PROFILE_KEY = 'mbatribe:lastProfile'

function cacheGet(key) {
  try { return JSON.parse(sessionStorage.getItem(key)) } catch { return null }
}
function cacheSet(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable */ }
}

export function rememberProfile(formData) { cacheSet(PROFILE_KEY, formData) }
export function lastProfile() { return cacheGet(PROFILE_KEY) }

async function post(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`)
  return json
}

export async function fetchExplanation(formData, schoolIds) {
  const key = 'mbatribe:explain:' + JSON.stringify([formData, schoolIds])
  const hit = cacheGet(key)
  if (hit) return hit
  const out = await post('/api/explain', { formData, schoolIds })
  cacheSet(key, out)
  return out
}

export function askSchool(schoolId, question, formData) {
  return post('/api/ask', { schoolId, question, formData })
}
