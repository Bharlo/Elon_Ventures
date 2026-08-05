const baseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const storedSessionKey = 'orbital-support-session'

function configured() { return Boolean(baseUrl && publicKey) }
function headers(session, extra = {}) { return { apikey: publicKey, Authorization: `Bearer ${session?.access_token || publicKey}`, ...extra } }
async function call(path, session, options = {}) {
  if (!configured()) throw new Error('Support is not configured yet.')
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: headers(session, options.headers) })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.message || payload?.error_description || 'Support service is temporarily unavailable.')
  return payload
}
function saveSession(session) { localStorage.setItem(storedSessionKey, JSON.stringify(session)); return session }

export async function visitorSession() {
  const saved = JSON.parse(localStorage.getItem(storedSessionKey) || 'null')
  if (saved?.access_token && saved?.user?.id) return saved
  const data = await call('/auth/v1/signup', null, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { support_visitor: true } }) })
  return saveSession(data)
}

export async function adminSignIn(email, password) {
  const data = await call('/auth/v1/token?grant_type=password', null, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
  return saveSession(data)
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
