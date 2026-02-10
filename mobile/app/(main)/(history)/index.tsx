import { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';
import { useConversationStore } from '@/stores/conversationStore';
import { formatDuration, truncate } from '@/utils/formatters';
import { COLORS, SPACING, FONT_SIZE } from '@/utils/constants';

export default function HistoryScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { conversations, loading, fetchConversations } = useConversationStore();

  useEffect(() => {
    if (user) fetchConversations(user.id);
  }, [user?.id]);

  return (
    <ScreenWrapper>
      <Text style={styles.title}>Conversation History</Text>

      <FlatList
        data={conversations}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={() => user && fetchConversations(user.id)}
        ListEmptyComponent={
          <Text style={styles.empty}>No conversations yet.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              router.push({ pathname: '/(main)/(history)/[id]', params: { id: item.id } })
            }
          >
            <Card>
              <Text style={styles.convTitle}>
                {item.title ?? truncate(item.topic ?? 'Conversation', 40)}
              </Text>
              <View style={styles.meta}>
                <Text style={styles.metaText}>
                  {new Date(item.started_at).toLocaleDateString()}
                </Text>
                {item.duration_seconds != null && (
                  <Text style={styles.metaText}>{formatDuration(item.duration_seconds)}</Text>
                )}
                <Text
                  style={[
                    styles.status,
                    item.status === 'completed' ? styles.statusDone : styles.statusOther,
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            </Card>
          </TouchableOpacity>
        )}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: {
    color: COLORS.text,
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  list: { gap: SPACING.sm, paddingBottom: SPACING.lg },
  empty: { color: COLORS.textMuted, fontSize: FONT_SIZE.md, textAlign: 'center', marginTop: SPACING.xxl },
  convTitle: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '600' },
  meta: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xs },
  metaText: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  status: { fontSize: FONT_SIZE.xs, fontWeight: '600' },
  statusDone: { color: COLORS.secondary },
  statusOther: { color: COLORS.textMuted },
});
