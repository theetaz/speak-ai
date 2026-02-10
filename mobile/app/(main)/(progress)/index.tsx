import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/services/supabase';
import { type DailyProgress } from '@/types/database';
import { formatMinutes } from '@/utils/formatters';
import { COLORS, SPACING, FONT_SIZE } from '@/utils/constants';

export default function ProgressScreen() {
  const user = useAuthStore((s) => s.user);
  const [progress, setProgress] = useState<DailyProgress[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('daily_progress')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(30)
      .then(({ data }) => setProgress(data ?? []));
  }, [user?.id]);

  const totalSessions = progress.reduce((a, p) => a + p.sessions_count, 0);
  const totalTime = progress.reduce((a, p) => a + p.total_duration_seconds, 0);
  const totalWords = progress.reduce((a, p) => a + p.words_spoken, 0);
  const streak = calculateStreak(progress);

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Your Progress</Text>

        <View style={styles.statsGrid}>
          <StatCard label="Sessions" value={String(totalSessions)} />
          <StatCard label="Practice Time" value={formatMinutes(totalTime)} />
          <StatCard label="Words Spoken" value={String(totalWords)} />
          <StatCard label="Day Streak" value={`${streak}d`} />
        </View>

        <Text style={styles.sectionTitle}>Last 7 Days</Text>
        {progress.slice(0, 7).map((p) => (
          <Card key={p.id} style={styles.dayCard}>
            <View style={styles.dayRow}>
              <Text style={styles.dayDate}>{new Date(p.date).toLocaleDateString()}</Text>
              <Text style={styles.dayStat}>{p.sessions_count} sessions</Text>
              <Text style={styles.dayStat}>{formatMinutes(p.total_duration_seconds)}</Text>
            </View>
          </Card>
        ))}

        {progress.length === 0 && (
          <Text style={styles.empty}>Start a conversation to see your progress here.</Text>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function calculateStreak(progress: DailyProgress[]): number {
  if (!progress.length) return 0;
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const p of progress) {
    const d = new Date(p.date);
    d.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
    if (diff === streak && p.sessions_count > 0) streak++;
    else break;
  }
  return streak;
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: SPACING.xxl },
  title: { color: COLORS.text, fontSize: FONT_SIZE.xl, fontWeight: '700', marginTop: SPACING.md, marginBottom: SPACING.lg },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.xl },
  stat: { flex: 1, minWidth: '45%', alignItems: 'center', gap: SPACING.xs },
  statValue: { color: COLORS.primary, fontSize: FONT_SIZE.xxl, fontWeight: '800' },
  statLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  sectionTitle: {
    color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACING.sm,
  },
  dayCard: { marginBottom: SPACING.xs },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayDate: { color: COLORS.text, fontSize: FONT_SIZE.sm, fontWeight: '500' },
  dayStat: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  empty: { color: COLORS.textMuted, fontSize: FONT_SIZE.md, textAlign: 'center', marginTop: SPACING.xxl },
});
