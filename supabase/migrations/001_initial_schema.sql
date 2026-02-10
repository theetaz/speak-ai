-- Profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  native_language TEXT NOT NULL,
  english_level TEXT NOT NULL CHECK (english_level IN ('A1','A2','B1','B2','C1','C2')),
  learning_goals TEXT[] DEFAULT '{}',
  preferred_topics TEXT[] DEFAULT '{}',
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  timezone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations
CREATE TABLE public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  topic TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  english_level_at_time TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','abandoned')),
  livekit_room_name TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Messages (transcript)
CREATE TABLE public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  audio_url TEXT,
  timestamp_ms INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI feedback per conversation
CREATE TABLE public.conversation_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  grammar_corrections JSONB DEFAULT '[]',
  pronunciation_notes JSONB DEFAULT '[]',
  vocabulary_suggestions JSONB DEFAULT '[]',
  overall_feedback TEXT,
  fluency_score INTEGER CHECK (fluency_score BETWEEN 1 AND 10),
  grammar_score INTEGER CHECK (grammar_score BETWEEN 1 AND 10),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily progress (aggregated)
CREATE TABLE public.daily_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  sessions_count INTEGER DEFAULT 0,
  total_duration_seconds INTEGER DEFAULT 0,
  words_spoken INTEGER DEFAULT 0,
  grammar_errors INTEGER DEFAULT 0,
  new_vocabulary INTEGER DEFAULT 0,
  UNIQUE(user_id, date)
);

-- Indexes
CREATE INDEX idx_conversations_user ON public.conversations(user_id, started_at DESC);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, timestamp_ms);
CREATE INDEX idx_feedback_conversation ON public.conversation_feedback(conversation_id);
CREATE INDEX idx_progress_user_date ON public.daily_progress(user_id, date DESC);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_progress ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Conversations policies
CREATE POLICY "Users read own conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own conversations" ON public.conversations
  FOR UPDATE USING (auth.uid() = user_id);

-- Messages policies (via conversation ownership)
CREATE POLICY "Users read own messages" ON public.messages
  FOR SELECT USING (
    conversation_id IN (SELECT id FROM public.conversations WHERE user_id = auth.uid())
  );
CREATE POLICY "Users insert own messages" ON public.messages
  FOR INSERT WITH CHECK (
    conversation_id IN (SELECT id FROM public.conversations WHERE user_id = auth.uid())
  );

-- Feedback policies
CREATE POLICY "Users read own feedback" ON public.conversation_feedback
  FOR SELECT USING (
    conversation_id IN (SELECT id FROM public.conversations WHERE user_id = auth.uid())
  );

-- Progress policies
CREATE POLICY "Users read own progress" ON public.daily_progress
  FOR SELECT USING (auth.uid() = user_id);

-- Service role bypass (for agent backend)
CREATE POLICY "Service role full access profiles" ON public.profiles
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access conversations" ON public.conversations
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access messages" ON public.messages
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access feedback" ON public.conversation_feedback
  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access progress" ON public.daily_progress
  FOR ALL USING (auth.role() = 'service_role');
