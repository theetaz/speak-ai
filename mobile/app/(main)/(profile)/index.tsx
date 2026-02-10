import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';
import { CEFR_INFO } from '@/utils/cefr-levels';
import { type CEFRLevel, COLORS, SPACING, FONT_SIZE } from '@/utils/constants';

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const { profile } = useProfileStore();

  const handleSignOut = () =>
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);

  const levelInfo = profile?.english_level
    ? CEFR_INFO[profile.english_level as CEFRLevel]
    : null;

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Profile</Text>

        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(profile?.display_name ?? user?.email ?? '?')[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{profile?.display_name ?? 'Learner'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>English Level</Text>
          <Text style={styles.levelBadge}>
            {profile?.english_level} {levelInfo ? `- ${levelInfo.name}` : ''}
          </Text>
          {levelInfo && <Text style={styles.levelDesc}>{levelInfo.description}</Text>}
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Learning Goals</Text>
          <View style={styles.tags}>
            {profile?.learning_goals?.map((g) => (
              <View key={g} style={styles.tag}>
                <Text style={styles.tagText}>{g}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Preferred Topics</Text>
          <View style={styles.tags}>
            {profile?.preferred_topics?.map((t) => (
              <View key={t} style={styles.tag}>
                <Text style={styles.tagText}>{t}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Button title="Sign Out" onPress={handleSignOut} variant="outline" size="lg" />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: SPACING.xxl, gap: SPACING.md },
  title: { color: COLORS.text, fontSize: FONT_SIZE.xl, fontWeight: '700', marginTop: SPACING.md },
  profileCard: { alignItems: 'center', gap: SPACING.sm },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: COLORS.white, fontSize: FONT_SIZE.xxl, fontWeight: '700' },
  name: { color: COLORS.text, fontSize: FONT_SIZE.lg, fontWeight: '700' },
  email: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  cardTitle: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: '600', marginBottom: SPACING.xs },
  levelBadge: { color: COLORS.primary, fontSize: FONT_SIZE.lg, fontWeight: '700' },
  levelDesc: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, marginTop: SPACING.xs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  tag: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: 8,
  },
  tagText: { color: COLORS.primary, fontSize: FONT_SIZE.sm, fontWeight: '500' },
});
