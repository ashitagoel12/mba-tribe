// Tiny key-value store on Upstash Redis (REST). Connected from Vercel's Storage tab,
// which sets KV_REST_API_URL / KV_REST_API_TOKEN (or the UPSTASH_REDIS_* names).
// Tests pass an in-memory store with the same three methods.

export function redisStore(env = process.env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  const call = async (path, body) => {
    const res = await fetch(url.replace(/\/$/, '') + path, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Storage error (HTTP ${res.status})`)
    return res.json()
  }
  return {
    cmd: async (...args) => (await call('', args)).result,
    pipe: async cmds => (await call('/pipeline', cmds)).map(r => r.result),
  }
}

/** In-memory store implementing the commands the app uses. For tests. */
export function memoryStore() {
  const kv = new Map(), sets = new Map(), zsets = new Map(), exp = new Map()
  const run = (c, ...a) => {
    switch (c.toUpperCase()) {
      case 'GET': return kv.get(a[0]) ?? null
      case 'SET': kv.set(a[0], a[1]); return 'OK'
      case 'DEL': return [a[0]].filter(k => kv.delete(k) | sets.delete(k) | zsets.delete(k)).length
      case 'MGET': return a.map(k => kv.get(k) ?? null)
      case 'INCR': { const v = Number(kv.get(a[0]) || 0) + 1; kv.set(a[0], String(v)); return v }
      case 'EXPIRE': exp.set(a[0], a[1]); return 1
      case 'SADD': { const s = sets.get(a[0]) || new Set(); a.slice(1).forEach(x => s.add(x)); sets.set(a[0], s); return 1 }
      case 'SREM': { const s = sets.get(a[0]); a.slice(1).forEach(x => s?.delete(x)); return 1 }
      case 'SMEMBERS': return [...(sets.get(a[0]) || [])]
      case 'ZADD': { const z = zsets.get(a[0]) || new Map(); z.set(a[2], Number(a[1])); zsets.set(a[0], z); return 1 }
      case 'ZREM': { zsets.get(a[0])?.delete(a[1]); return 1 }
      case 'ZREVRANGE': {
        const z = [...(zsets.get(a[0]) || new Map())].sort((x, y) => y[1] - x[1]).map(x => x[0])
        return z.slice(Number(a[1]), Number(a[2]) + 1)
      }
      default: throw new Error('unsupported ' + c)
    }
  }
  return { cmd: async (...a) => run(...a), pipe: async cmds => cmds.map(c => run(...c)), _kv: kv }
}
