export interface Profile {
  id: string;
  display_name: string | null;
  native_language: string;
  english_level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  learning_goals: string[];
  preferred_topics: string[];
  avatar_url: string | null;
  onboarding_completed: boolean;
  timezone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  topic: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  english_level_at_time: string | null;
  status: 'active' | 'completed' | 'abandoned';
  livekit_room_name: string | null;
  metadata: Record<string, unknown>;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  audio_url: string | null;
  timestamp_ms: number;
  created_at: string;
}

export interface ConversationFeedback {
  id: string;
  conversation_id: string;
  grammar_corrections: GrammarCorrection[];
  pronunciation_notes: PronunciationNote[];
  vocabulary_suggestions: VocabularySuggestion[];
  overall_feedback: string | null;
  fluency_score: number | null;
  grammar_score: number | null;
  created_at: string;
}

export interface GrammarCorrection {
  original: string;
  corrected: string;
  explanation: string;
}

export interface PronunciationNote {
  word: string;
  issue: string;
  tip: string;
}

export interface VocabularySuggestion {
  word: string;
  definition: string;
  example: string;
}

export interface DailyProgress {
  id: string;
  user_id: string;
  date: string;
  sessions_count: number;
  total_duration_seconds: number;
  words_spoken: number;
  grammar_errors: number;
  new_vocabulary: number;
}
