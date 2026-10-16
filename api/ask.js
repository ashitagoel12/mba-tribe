// POST /api/ask  { schoolId, question, formData? }
// Answers one question about one school, using only that school's record.
import {
  SCHOOLS, slimProfile, slimSchool, buildAskRequest, callClaude,
  ungroundedNumbers, rateLimited, clientIp,
} from './_ai.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (rateLimited(clientIp(req))) return res.status(429).json({ error: 'Too many requests. Try again in an hour.' })

  const { schoolId, question, formData } = req.body || {}
  const school = SCHOOLS[schoolId]
  const q = typeof question === 'string' ? question.trim().slice(0, 300) : ''
  if (!school || q.length < 3) return res.status(400).json({ error: 'schoolId and question are required' })

  const profile = slimProfile(formData || {})
  try {
    const { output } = await callClaude(buildAskRequest(profile, school, q))
    const bad = ungroundedNumbers(output.answer || '', { profile, school: slimSchool(school), q })
    if (bad.length) {
      return res.status(200).json({
        answer: "I couldn't answer that reliably from our data. Check the school's admissions or employment report page.",
        in_data: false,
        withheld: true,
      })
    }
    return res.status(200).json(output)
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message })
  }
}
