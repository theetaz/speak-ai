import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY must be set');
    _client = createClient(url, key);
  }
  return _client;
}

export async function saveTranscript(
  conversationId: string,
  messages: { role: string; content: string; timestamp_ms: number }[],
) {
  if (!messages.length) return;
  const rows = messages.map((m) => ({
    conversation_id: conversationId,
    role: m.role,
    content: m.content,
    timestamp_ms: m.timestamp_ms,
  }));
  await supabase().from('messages').insert(rows);
}

export async function saveFeedback(
  conversationId: string,
  feedback: {
    grammar_corrections: unknown[];
    pronunciation_notes: unknown[];
    vocabulary_suggestions: unknown[];
    overall_feedback?: string;
    fluency_score?: number;
    grammar_score?: number;
    vocabulary_score?: number;
    pronunciation_score?: number;
    overall_score?: number;
    ai_analysis?: string;
  },
) {
  await supabase().from('conversation_feedback').insert({
    conversation_id: conversationId,
    ...feedback,
  });
}

export async function updateConversation(
  conversationId: string,
  updates: Record<string, unknown>,
) {
  await supabase().from('conversations').update(updates).eq('id', conversationId);
}

export async function upsertDailyProgress(
  userId: string,
  durationSeconds: number,
  wordsSpoken: number,
  grammarErrors: number,
  newVocabulary: number,
) {
  const today = new Date().toISOString().split('T')[0];
  const { data: existing } = await supabase()
    .from('daily_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (existing) {
    await supabase()
      .from('daily_progress')
      .update({
        sessions_count: existing.sessions_count + 1,
        total_duration_seconds: existing.total_duration_seconds + durationSeconds,
        words_spoken: existing.words_spoken + wordsSpoken,
        grammar_errors: existing.grammar_errors + grammarErrors,
        new_vocabulary: existing.new_vocabulary + newVocabulary,
      })
      .eq('id', existing.id);
  } else {
    await supabase().from('daily_progress').insert({
      user_id: userId,
      date: today,
      sessions_count: 1,
      total_duration_seconds: durationSeconds,
      words_spoken: wordsSpoken,
      grammar_errors: grammarErrors,
      new_vocabulary: newVocabulary,
    });
  }
}
