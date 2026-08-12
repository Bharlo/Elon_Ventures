import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' }
const database = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    const client = database(); const { data: { user } } = await client.auth.getUser(token)
    if (!user) return Response.json({ message: 'Sign in is required.' }, { status: 401, headers: corsHeaders })
    const { data: admin } = await client.from('support_admins').select('user_id').eq('user_id', user.id).maybeSingle()
    if (!admin) return Response.json({ message: 'Support admin access is required.' }, { status: 403, headers: corsHeaders })
    const { subscription } = await request.json(); const endpoint = subscription?.endpoint
    if (!endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) return Response.json({ message: 'Invalid notification subscription.' }, { status: 400, headers: corsHeaders })
    const { error } = await client.from('support_push_subscriptions').upsert({ admin_id: user.id, endpoint, subscription, updated_at: new Date().toISOString() }, { onConflict: 'endpoint' })
    if (error) throw error
    return Response.json({ ok: true }, { headers: corsHeaders })
  } catch (error) { return Response.json({ message: error.message || 'Could not save notification settings.' }, { status: 500, headers: corsHeaders }) }
})
