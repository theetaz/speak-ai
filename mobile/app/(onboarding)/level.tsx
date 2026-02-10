import { useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Button } from '@/components/ui/Button';
import { SelectableCard } from '@/components/ui/SelectableCard';
import { useProfileStore } from '@/stores/profileStore';
import { useAuthStore } from '@/stores/authStore';
import { CEFR_INFO } from '@/utils/cefr-levels';
import { CEFR_LEVELS, type CEFRLevel, COLORS, SPACING, FONT_SIZE } from '@/utils/constants';

export default function LevelScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const [selected, setSelected] = useState<CEFRLevel | ''>('');
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!selected || !user) return;
    setLoading(true);
    try {
      await updateProfile(user.id, { english_level: selected });
      router.push('/(onboarding)/goals');
    } catch {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.step}>Step 2 of 4</Text>
        <Text style={styles.title}>What's your English level?</Text>
        <Text style={styles.subtitle}>Don't worry, you can change this later.</Text>
      </View>

      <FlatList
        data={CEFR_LEVELS}
        numColumns={2}
        keyExtractor={(i) => i}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => {
          const info = CEFR_INFO[item];
          return (
            <View style={styles.gridItem}>
              <SelectableCard
                label={`${item} - ${info.name}`}
                subtitle={info.description}
                selected={selected === item}
                onPress={() => setSelected(item)}
              />
            </View>
          );
        }}
      />

      <Button title="Next" onPress={handleNext} disabled={!selected} loading={loading} size="lg" />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: { gap: SPACING.xs, marginTop: SPACING.lg, marginBottom: SPACING.lg },
  step: { color: COLORS.primary, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  title: { color: COLORS.text, fontSize: FONT_SIZE.xl, fontWeight: '700' },
  subtitle: { color: COLORS.textSecondary, fontSize: FONT_SIZE.md },
  grid: { gap: SPACING.sm },
  row: { gap: SPACING.sm },
  gridItem: { flex: 1 },
});
