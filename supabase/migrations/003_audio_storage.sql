-- Add audio_url to conversations for full-session recording
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Create storage bucket for conversation audio (if not created via config.toml)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'conversation-audio',
  'conversation-audio',
  false,
  52428800, -- 50 MiB
  ARRAY['audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can upload to their own conversation path
CREATE POLICY "Users upload own audio"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'conversation-audio'
    AND auth.uid() IS NOT NULL
  );

-- Storage RLS: users can read their own audio
CREATE POLICY "Users read own audio"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'conversation-audio'
    AND auth.uid() IS NOT NULL
  );

-- Storage RLS: users can delete their own audio
CREATE POLICY "Users delete own audio"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'conversation-audio'
    AND auth.uid() IS NOT NULL
  );

-- Service role full access to storage
CREATE POLICY "Service role storage access"
  ON storage.objects FOR ALL
  USING (auth.role() = 'service_role');
