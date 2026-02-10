import { supabase } from './supabase';

const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export interface ConnectionDetails {
  url: string;
  token: string;
  roomName: string;
}

export async function getLiveKitToken(conversationId: string): Promise<ConnectionDetails> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated. Please sign in again.');
  }

  // Supabase CLI v2.76+ signs user tokens with ES256, but the local edge
  // runtime can only verify HS256. Work around by sending the HS256 anon key
  // in Authorization (for the gateway) and the real user token in a custom
  // header that our edge function reads directly.
  const { data, error } = await supabase.functions.invoke('livekit-token', {
    body: { conversation_id: conversationId },
    headers: {
      Authorization: `Bearer ${ANON_KEY}`,
      'x-user-token': session.access_token,
    },
  });

  if (error) {
    console.error('[LiveKit] Token fetch error:', error);
    throw new Error(error.message ?? 'Failed to fetch LiveKit token');
  }

  if (!data?.url || !data?.token) {
    console.error('[LiveKit] Invalid response:', data);
    throw new Error(data?.error ?? 'Invalid token response');
  }

  return data as ConnectionDetails;
}
