// /api/community?action=...  Mentors (book a call) and the public Q&A board.
// One endpoint for all actions keeps the project within Vercel's function limit.
import { redisStore } from './_store.js'
import {
  UserError, listMentors, applyMentor, listQuestions, askQuestion,
  mentorHome, answerQuestion, checkAdmin, adminOverview, adminAction,
} from './_community.js'

export async function handle(req, store) {
  const action = String(req.query?.action || '')
  const body = req.body || {}
  const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim()
  const origin = `https://${req.headers['x-forwarded-host'] || req.headers.host || ''}`

  if (req.method === 'GET') {
    if (action === 'mentors') return listMentors(store, { schoolId: req.query.school })
    if (action === 'questions') return listQuestions(store, { schoolId: req.query.school, limit: req.query.limit })
    if (action === 'mentor-home') return mentorHome(store, req.headers['x-mentor-token'])
    if (action === 'admin') { checkAdmin(req.headers['x-admin-token']); return adminOverview(store) }
  }
  if (req.method === 'POST') {
    if (action === 'apply') return applyMentor(store, body, ip)
    if (action === 'ask') return askQuestion(store, body, ip)
    if (action === 'answer') return answerQuestion(store, { ...body, token: req.headers['x-mentor-token'] }, ip)
    if (action === 'admin') { checkAdmin(req.headers['x-admin-token']); return adminAction(store, body, origin) }
  }
  throw new UserError('Unknown request.', 404)
}

export default async function handler(req, res) {
  const store = redisStore()
  if (!store) return res.status(503).json({ error: 'Community features are not set up yet (storage not connected).' })
  try {
    const out = await handle(req, store)
    if (req.method === 'GET' && ['mentors', 'questions'].includes(req.query?.action)) {
      res.setHeader('cache-control', 's-maxage=30, stale-while-revalidate=120')
    }
    return res.status(200).json(out)
  } catch (err) {
    const status = err instanceof UserError ? err.status : 500
    return res.status(status).json({ error: status === 500 ? 'Something went wrong.' : err.message })
  }
}
