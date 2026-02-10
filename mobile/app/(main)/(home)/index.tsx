import { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { useConversationStore } from '@/stores/conversationStore';
import { formatDuration, truncate } from '@/utils/formatters';
import { COLORS, SPACING, FONT_SIZE } from '@/utils/constants';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const profile = useProfileStore((s) => s.profile);
  const { conversations, fetchConversations, createConversation } = useConversationStore();

  useEffect(() => {
    if (user) fetchConversations(user.id);
  }, [user?.id]);

  const handleNewConversation = async () => {
    if (!user) return;
    try {
      const conv = await createConversation(user.id);
      router.push({ pathname: '/(main)/(home)/conversation', params: { id: conv.id } });
    } catch {}
  };

  const displayName = profile?.display_name ?? 'Learner';
  const recentConversations = conversations.slice(0, 5);

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {displayName}!</Text>
          <Text style={styles.level}>Level: {profile?.english_level ?? '...'}</Text>
        </View>
      </View>

      <Button
        title="Start Conversation"
        onPress={handleNewConversation}
        size="lg"
        style={styles.startBtn}
      />

      <Text style={styles.sectionTitle}>Recent Conversations</Text>

      {recentConversations.length === 0 ? (
        <Card>
          <Text style={styles.emptyText}>
            No conversations yet. Tap above to start your first one!
          </Text>
        </Card>
      ) : (
        <FlatList
          data={recentConversations}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                router.push({ pathname: '/(main)/(history)/[id]', params: { id: item.id } })
              }
            >
              <Card>
                <Text style={styles.convTitle}>
                  {item.title ?? truncate(item.topic ?? 'Conversation', 30)}
                </Text>
                <View style={styles.convMeta}>
                  <Text style={styles.convDate}>
                    {new Date(item.started_at).toLocaleDateString()}
                  </Text>
                  {item.duration_seconds != null && (
                    <Text style={styles.convDuration}>
                      {formatDuration(item.duration_seconds)}
                    </Text>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  greeting: { color: COLORS.text, fontSize: FONT_SIZE.xl, fontWeight: '700' },
  level: { color: COLORS.primary, fontSize: FONT_SIZE.sm, fontWeight: '600', marginTop: 2 },
  startBtn: { marginBottom: SPACING.xl },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  list: { gap: SPACING.sm },
  emptyText: { color: COLORS.textMuted, fontSize: FONT_SIZE.md, textAlign: 'center' },
  convTitle: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '600' },
  convMeta: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xs },
  convDate: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  convDuration: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
});
