// Offline tests for mentors + Q&A: node scripts/community.test.mjs
import { memoryStore } from '../api/_store.js'
import { handle } from '../api/community.js'
import { validBookingUrl, moderate } from '../api/_community.js'

let fails = 0
const check = (n, ok, d = '') => { if (!ok) fails++; console.log(`${ok ? '✓' : '✗'} ${n}${d ? '  ' + d : ''}`) }
const store = memoryStore()
process.env.ADMIN_TOKEN = 'admin-secret-123456'
// Fake moderation: block anything containing "BUY NOW"
globalThis.fetch = async (_u, opts) => {
  const text = JSON.parse(opts.body).messages[0].content
  return { ok: true, json: async () => ({ content: [{ type: 'tool_use', input: { allow: !/BUY NOW/.test(text), reason: 'spam' } }] }) }
}
process.env.ANTHROPIC_API_KEY = 'test'
const req = (method, action, { body, headers = {}, query = {} } = {}) =>
  handle({ method, query: { action, ...query }, body, headers: { 'x-forwarded-for': '1.1.1.1', host: 'mba-tribe.vercel.app', ...headers } }, store)
const fails_with = async (p, status) => { try { await p; return false } catch (e) { return e.status === status } }

const apply = { name: 'Ashita Goel', email: 'a@example.com', schoolId: 'nyu-stern', classYear: '2026', role: 'alum',
  bio: 'Stern MBA 2026. Happy to talk about career switches and international applications.', topics: ['Career switch', 'International'],
  linkedin: 'https://www.linkedin.com/in/ashitagoel', bookingUrl: 'https://calendly.com/ashita/20min' }

// Validation
check('Calendly and Cal.com links accepted', validBookingUrl('https://calendly.com/x') && validBookingUrl('https://cal.com/x/15'))
check('other links rejected as booking links', !validBookingUrl('https://evil.com/calendly.com') && !validBookingUrl('http://calendly.com/x'))
check('bad booking link rejected on apply', await fails_with(req('POST', 'apply', { body: { ...apply, bookingUrl: 'https://example.com' } }), 400))
check('unknown school rejected', await fails_with(req('POST', 'apply', { body: { ...apply, schoolId: 'nope' } }), 400))

// Mentor flow
await req('POST', 'apply', { body: apply })
check('pending mentor not public', (await req('GET', 'mentors')).length === 0)
check('admin needs the password', await fails_with(req('GET', 'admin', { headers: { 'x-admin-token': 'wrong' } }), 401))
const ov = await req('GET', 'admin', { headers: { 'x-admin-token': 'admin-secret-123456' } })
check('admin sees pending application with email', ov.pending.length === 1 && ov.pending[0].email === 'a@example.com')
const ap = await req('POST', 'admin', { headers: { 'x-admin-token': 'admin-secret-123456' }, body: { action: 'approve', mentorId: ov.pending[0].id } })
check('approval returns a private mentor link', /^https:\/\/mba-tribe\.vercel\.app\/mentor\?token=[0-9a-f]{48}$/.test(ap.mentorLink), ap.mentorLink)
const token = new URL(ap.mentorLink).searchParams.get('token')
const pub = await req('GET', 'mentors', { query: { school: 'nyu-stern' } })
check('approved mentor listed for their school', pub.length === 1 && pub[0].bookingUrl === apply.bookingUrl)
check('public listing hides email', !JSON.stringify(pub).includes('a@example.com'))

// Q&A
const q1 = await req('POST', 'ask', { body: { schoolId: 'nyu-stern', title: 'How strong is Stern for tech PM roles?', body: 'Coming from ops.' } })
const q2 = await req('POST', 'ask', { body: { title: 'BUY NOW cheap essay editing services', body: 'BUY NOW' } })
check('normal question goes live', q1.status === 'visible')
check('spam is held, not shown', q2.status === 'held' && (await req('GET', 'questions')).length === 1)
check('short question rejected', await fails_with(req('POST', 'ask', { body: { title: 'hi' } }), 400))
check('mentor link required to answer', await fails_with(req('POST', 'answer', { headers: { 'x-mentor-token': 'x'.repeat(48) }, body: { questionId: q1.id, body: 'x'.repeat(30) } }), 401))
const home = await req('GET', 'mentor-home', { headers: { 'x-mentor-token': token } })
check('mentor sees questions for their school', home.questions.some(q => q.id === q1.id))
await req('POST', 'answer', { headers: { 'x-mentor-token': token }, body: { questionId: q1.id, body: 'Stern places well in tech; join the Tech club early and network in Q1.' } })
const qs = await req('GET', 'questions', { query: { school: 'nyu-stern' } })
check('answer shows with mentor name', qs[0].answers.length === 1 && qs[0].answers[0].mentor.name === 'Ashita Goel')
const ov2 = await req('GET', 'admin', { headers: { 'x-admin-token': 'admin-secret-123456' } })
check('held spam listed for admin review', ov2.held.some(h => h.kind === 'question'))
await req('POST', 'admin', { headers: { 'x-admin-token': 'admin-secret-123456' }, body: { action: 'hide', questionId: q2.id } })
check('admin can clear held items', (await req('GET', 'admin', { headers: { 'x-admin-token': 'admin-secret-123456' } })).held.length === 0)

// Rate limit and failure modes
let limited = false
for (let i = 0; i < 6; i++) { try { await req('POST', 'ask', { body: { title: 'Another real question here?' } }) } catch (e) { limited = e.status === 429 } }
check('posting is rate limited', limited)
delete process.env.ANTHROPIC_API_KEY
check('if moderation is unavailable, posts are held', (await moderate('anything')).allow === false)
await req('POST', 'admin', { headers: { 'x-admin-token': 'admin-secret-123456' }, body: { action: 'remove', mentorId: pub[0].id } })
check('removed mentor link stops working', await fails_with(req('GET', 'mentor-home', { headers: { 'x-mentor-token': token } }), 401))

console.log(fails ? `\n${fails} failed` : '\nAll checks passed'); process.exitCode = fails ? 1 : 0
