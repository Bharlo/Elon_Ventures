const baseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const visitorSessionKey = 'orbital-support-visitor-session'

function configured() { return Boolean(baseUrl && publicKey) }
function headers(session, extra = {}) { return { apikey: publicKey, Authorization: `Bearer ${session?.access_token || publicKey}`, ...extra } }
async function call(path, session, options = {}) {
  if (!configured()) throw new Error('Support is not configured yet.')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  let response
  try {
    response = await fetch(`${baseUrl}${path}`, { ...options, headers: headers(session, options.headers), signal: controller.signal })
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Support is taking too long to respond. Please try again.', { cause: error })
    throw new Error('Unable to reach support right now. Please check your connection and try again.', { cause: error })
  } finally {
    clearTimeout(timeout)
  }
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.message || payload?.error_description || 'Support service is temporarily unavailable.')
  return payload
}
function saveVisitorSession(session) { localStorage.setItem(visitorSessionKey, JSON.stringify(session)); return session }
function sessionExpiresSoon(session) {
  if (!session?.access_token) return true
  try {
    const payload = JSON.parse(atob(session.access_token.split('.')[1]))
    return !payload.exp || payload.exp * 1000 < Date.now() + 60000
  } catch { return true }
}
async function refreshVisitorSession(session) {
  if (!session?.refresh_token) return null
  try {
    const data = await call('/auth/v1/token?grant_type=refresh_token', null, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: session.refresh_token }) })
    return saveVisitorSession(data)
  } catch {
    localStorage.removeItem(visitorSessionKey)
    return null
  }
}

export async function visitorSession() {
  const saved = JSON.parse(localStorage.getItem(visitorSessionKey) || 'null')
  if (saved?.access_token && saved?.user?.id && !sessionExpiresSoon(saved)) return saved
  const refreshed = await refreshVisitorSession(saved)
  if (refreshed?.access_token && refreshed?.user?.id) return refreshed
  const data = await call('/auth/v1/signup', null, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { support_visitor: true } }) })
  return saveVisitorSession(data)
}

export async function adminSignIn(email, password) {
  const data = await call('/auth/v1/token?grant_type=password', null, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
  return data
}

export async function currentConversation(session, visitorName = 'Website visitor') {
  const found = await call(`/rest/v1/support_conversations?owner_id=eq.${session.user.id}&order=updated_at.desc&limit=1`, session)
  if (found.length) return found[0]
  const created = await call('/rest/v1/support_conversations', session, { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ owner_id: session.user.id, visitor_name: visitorName }) })
  return created[0]
}

export async function messagesFor(session, conversationId) { return call(`/rest/v1/support_messages?conversation_id=eq.${conversationId}&order=created_at.asc`, session) }
export async function sendMessage(session, conversationId, body, senderRole = 'visitor') {
  return call('/rest/v1/support_messages', session, { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ conversation_id: conversationId, sender_id: session.user.id, sender_role: senderRole, body }) })
}
export async function conversationsForAdmin(session) { return call('/rest/v1/support_conversations?select=*&order=updated_at.desc', session) }
export { configured }
