-- Allow users to delete their own conversations
CREATE POLICY "Users delete own conversations"
  ON public.conversations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Allow users to delete their own messages (via cascade or direct)
CREATE POLICY "Users delete own messages"
  ON public.messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
    )
  );

-- Allow users to delete their own feedback
CREATE POLICY "Users delete own feedback"
  ON public.conversation_feedback
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_feedback.conversation_id AND c.user_id = auth.uid()
    )
  );
