const BASE = '/api'

async function request(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`
    try {
      const j = await res.json()
      if (j.detail) msg = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail)
    } catch {
      /* not JSON */
    }
    throw new Error(msg)
  }
  return res.json()
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b || {}),
  del: (p) => request('DELETE', p),
}

// Fire-and-forget interaction logging for the study.
export function logEvent(pid, task, type, data = {}) {
  if (!pid) return
  api.post(`/sessions/${pid}/events`, { task, type, data }).catch(() => {})
}
