import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/services/supabase';
import { useConversationStore } from '@/stores/conversationStore';
import { type Conversation, type ConversationFeedback, type Message } from '@/types/database';
import { formatDuration } from '@/utils/formatters';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '@/utils/constants';

export default function ConversationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { fetchFeedback } = useConversationStore();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [feedback, setFeedback] = useState<ConversationFeedback | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from('conversations').select('*').eq('id', id).single().then(({ data }) => setConversation(data));
    supabase.from('messages').select('*').eq('conversation_id', id).order('timestamp_ms').then(({ data }) => setMessages(data ?? []));
    fetchFeedback(id).then(setFeedback);
  }, [id]);

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{conversation?.title ?? 'Conversation'}</Text>

        {conversation && (
          <View style={styles.metaRow}>
            <Text style={styles.meta}>{new Date(conversation.started_at).toLocaleString()}</Text>
            {conversation.duration_seconds != null && (
              <Text style={styles.meta}>{formatDuration(conversation.duration_seconds)}</Text>
            )}
          </View>
        )}

        {feedback && (
          <Card style={styles.feedbackCard}>
            <Text style={styles.feedbackTitle}>AI Feedback</Text>
            {feedback.overall_feedback && (
              <Text style={styles.feedbackText}>{feedback.overall_feedback}</Text>
            )}
            {feedback.fluency_score != null && (
              <Text style={styles.score}>Fluency: {feedback.fluency_score}/10</Text>
            )}
            {feedback.grammar_score != null && (
              <Text style={styles.score}>Grammar: {feedback.grammar_score}/10</Text>
            )}
          </Card>
        )}

        <Text style={styles.sectionTitle}>Transcript</Text>

        {messages.length === 0 ? (
          <Text style={styles.empty}>No transcript available.</Text>
        ) : (
          messages.map((msg) => (
            <View
              key={msg.id}
              style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}
            >
              <Text style={styles.bubbleRole}>{msg.role === 'user' ? 'You' : 'Teacher'}</Text>
              <Text style={styles.bubbleText}>{msg.content}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: SPACING.xxl, gap: SPACING.sm },
  title: { color: COLORS.text, fontSize: FONT_SIZE.xl, fontWeight: '700', marginTop: SPACING.md },
  metaRow: { flexDirection: 'row', gap: SPACING.md },
  meta: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  feedbackCard: { marginTop: SPACING.sm },
  feedbackTitle: { color: COLORS.primary, fontSize: FONT_SIZE.md, fontWeight: '700', marginBottom: SPACING.xs },
  feedbackText: { color: COLORS.text, fontSize: FONT_SIZE.md, lineHeight: 22 },
  score: { color: COLORS.secondary, fontSize: FONT_SIZE.sm, fontWeight: '600', marginTop: SPACING.xs },
  sectionTitle: {
    color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 1, marginTop: SPACING.lg,
  },
  empty: { color: COLORS.textMuted, fontSize: FONT_SIZE.md, textAlign: 'center', marginTop: SPACING.lg },
  bubble: { maxWidth: '85%', padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, marginTop: SPACING.xs },
  userBubble: { alignSelf: 'flex-end', backgroundColor: COLORS.primary },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  bubbleRole: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginBottom: 2 },
  bubbleText: { color: COLORS.text, fontSize: FONT_SIZE.md },
});
