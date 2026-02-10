import { useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Button } from '@/components/ui/Button';
import { SelectableCard } from '@/components/ui/SelectableCard';
import { useProfileStore } from '@/stores/profileStore';
import { useAuthStore } from '@/stores/authStore';
import { LEARNING_GOALS, COLORS, SPACING, FONT_SIZE } from '@/utils/constants';

export default function GoalsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );

  const handleNext = async () => {
    if (!selected.length || !user) return;
    setLoading(true);
    try {
      await updateProfile(user.id, { learning_goals: selected });
      router.push('/(onboarding)/topics');
    } catch {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.step}>Step 3 of 4</Text>
        <Text style={styles.title}>What do you want to improve?</Text>
        <Text style={styles.subtitle}>Select one or more goals.</Text>
      </View>

      <FlatList
        data={LEARNING_GOALS}
        numColumns={2}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <View style={styles.gridItem}>
            <SelectableCard
              label={item.label}
              icon={item.icon}
              selected={selected.includes(item.id)}
              onPress={() => toggle(item.id)}
            />
          </View>
        )}
      />

      <Button
        title="Next"
        onPress={handleNext}
        disabled={!selected.length}
        loading={loading}
        size="lg"
      />
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
