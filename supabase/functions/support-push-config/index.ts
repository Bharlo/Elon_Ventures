const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' }

Deno.serve(request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  return Response.json({ publicKey: Deno.env.get('VAPID_PUBLIC_KEY') || '' }, { headers: corsHeaders })
})
