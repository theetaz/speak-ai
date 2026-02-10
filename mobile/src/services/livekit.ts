import { supabase } from './supabase';

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

  // With the new Supabase publishable key (sb_publishable_...) and
  // --no-verify-jwt on the edge function, the SDK handles auth automatically:
  // - apikey header: publishable key (sent by SDK)
  // - Authorization header: user's access_token (sent by SDK)
  // The edge function verifies the user token internally via supabase.auth.getUser().
  const { data, error } = await supabase.functions.invoke('livekit-token', {
    body: { conversation_id: conversationId },
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
