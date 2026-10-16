// POST /api/explain  { formData, schoolIds: string[] }
// Returns a short Claude-written readout for the top matches. Any school read
// that quotes a number not found in the data is withheld before it is sent.
import {
  SCHOOLS, slimProfile, slimSchool, buildExplainRequest, callClaude,
  ungroundedNumbers, rateLimited, clientIp,
} from './_ai.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (rateLimited(clientIp(req))) return res.status(429).json({ error: 'Too many requests. Try again in an hour.' })

  const { formData, schoolIds } = req.body || {}
  const ids = Array.isArray(schoolIds) ? schoolIds.slice(0, 5) : []
  const schools = ids.map(id => SCHOOLS[id]).filter(Boolean)
  if (!formData || !schools.length) return res.status(400).json({ error: 'formData and schoolIds are required' })

  const profile = slimProfile(formData)
  try {
    const { output, usage } = await callClaude(buildExplainRequest(profile, schools))
    const sources = { profile, schools: schools.map(slimSchool) }
    const allowed = new Set(ids)

    const reads = (output.schools || [])
      .filter(r => allowed.has(r.id))
      .map(r => {
        // Checked against this school's own record, so a number from another
        // school can't be attributed to it.
        const bad = ungroundedNumbers(`${r.read} ${r.question_to_ask || ''}`, { profile, school: slimSchool(SCHOOLS[r.id]) })
        return bad.length ? { id: r.id, withheld: true } : r
      })
    const overviewBad = ungroundedNumbers(output.overview || '', sources)

    return res.status(200).json({
      overview: overviewBad.length ? null : output.overview,
      schools: reads,
      checks: {
        withheld: reads.filter(r => r.withheld).length + (overviewBad.length ? 1 : 0),
        model: usage ? 'ok' : 'unknown',
      },
    })
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message })
  }
}
