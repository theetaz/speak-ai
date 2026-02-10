const LIVEKIT_API_KEY = Deno.env.get('LIVEKIT_API_KEY') ?? 'devkey';
const LIVEKIT_API_SECRET = Deno.env.get('LIVEKIT_API_SECRET') ?? 'secret';
const LIVEKIT_URL = Deno.env.get('LIVEKIT_URL') ?? 'ws://localhost:7880';

async function createLiveKitToken(
  identity: string,
  roomName: string,
  metadata: string,
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: LIVEKIT_API_KEY,
    sub: identity,
    iat: now,
    nbf: now,
    exp: now + 3600,
    name: identity,
    metadata,
    video: {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const data = `${encode(header)}.${encode(payload)}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(LIVEKIT_API_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigStr = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${data}.${sigStr}`;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Accept user token from x-user-token header (avoids edge runtime ES256
    // JWT verification bug) or fall back to the standard Authorization header.
    const userToken = req.headers.get('x-user-token');
    const authHeader = userToken
      ? `Bearer ${userToken}`
      : req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing auth header');

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error('Unauthorized');

    const { conversation_id } = await req.json();
    if (!conversation_id) throw new Error('Missing conversation_id');

    const { data: conv } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversation_id)
      .eq('user_id', user.id)
      .single();
    if (!conv) throw new Error('Conversation not found');

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const metadata = JSON.stringify({
      user_id: user.id,
      conversation_id,
      english_level: profile?.english_level ?? 'B1',
      native_language: profile?.native_language ?? 'unknown',
      learning_goals: profile?.learning_goals ?? [],
      preferred_topics: profile?.preferred_topics ?? [],
      display_name: profile?.display_name ?? 'Learner',
    });

    const roomName = conv.livekit_room_name ?? `conv_${conversation_id}`;
    const token = await createLiveKitToken(user.id, roomName, metadata);

    return new Response(JSON.stringify({ url: LIVEKIT_URL, token, roomName }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
