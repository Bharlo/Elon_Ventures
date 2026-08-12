import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' }
const database = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', ''); const client = database(); const { data: { user } } = await client.auth.getUser(token)
    if (!user) return Response.json({ message: 'Sign in is required.' }, { status: 401, headers: corsHeaders })
    const { conversationId, messageId } = await request.json(); const { data: message } = await client.from('support_messages').select('id,conversation_id,sender_id,sender_role').eq('id', messageId).eq('conversation_id', conversationId).maybeSingle()
    const { data: conversation } = await client.from('support_conversations').select('owner_id').eq('id', conversationId).maybeSingle()
    if (!message || !conversation || conversation.owner_id !== user.id || message.sender_id !== user.id || message.sender_role !== 'visitor') return Response.json({ message: 'Message cannot send notifications.' }, { status: 403, headers: corsHeaders })
    const { data: subscriptions } = await client.from('support_push_subscriptions').select('id,endpoint,subscription')
    webpush.setVapidDetails('mailto:support@elon-ventures.onrender.com', Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)
    const payload = JSON.stringify({ title: 'New message from Chat Support', body: 'A visitor sent you a new message.', tag: `support-${conversationId}` })
    await Promise.all((subscriptions || []).map(async item => { try { await webpush.sendNotification(item.subscription, payload) } catch (error) { if (error.statusCode === 404 || error.statusCode === 410) await client.from('support_push_subscriptions').delete().eq('id', item.id) } }))
    return Response.json({ ok: true }, { headers: corsHeaders })
  } catch (error) { return Response.json({ message: error.message || 'Could not send notification.' }, { status: 500, headers: corsHeaders }) }
})
