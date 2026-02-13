-- Extend conversation_feedback with additional score columns and AI analysis
ALTER TABLE public.conversation_feedback
  ADD COLUMN IF NOT EXISTS vocabulary_score INTEGER CHECK (vocabulary_score BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS pronunciation_score INTEGER CHECK (pronunciation_score BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS overall_score INTEGER CHECK (overall_score BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS ai_analysis TEXT;
