-- Enable real-time for conversation_feedback so the frontend can subscribe
-- to updates when analysis is completed by the cron job
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversation_feedback'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_feedback;
  END IF;
END $$;
