import { useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Button } from '@/components/ui/Button';
import { SelectableCard } from '@/components/ui/SelectableCard';
import { useProfileStore } from '@/stores/profileStore';
import { useAuthStore } from '@/stores/authStore';
import { COLORS, SPACING, FONT_SIZE } from '@/utils/constants';

const LANGUAGES = [
  { code: 'es', label: 'Spanish', icon: '🇪🇸' },
  { code: 'zh', label: 'Chinese', icon: '🇨🇳' },
  { code: 'ja', label: 'Japanese', icon: '🇯🇵' },
  { code: 'ko', label: 'Korean', icon: '🇰🇷' },
  { code: 'pt', label: 'Portuguese', icon: '🇧🇷' },
  { code: 'fr', label: 'French', icon: '🇫🇷' },
  { code: 'de', label: 'German', icon: '🇩🇪' },
  { code: 'ar', label: 'Arabic', icon: '🇸🇦' },
  { code: 'hi', label: 'Hindi', icon: '🇮🇳' },
  { code: 'si', label: 'Sinhala', icon: '🇱🇰' },
  { code: 'other', label: 'Other', icon: '🌍' },
];

export default function LanguageScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const createProfile = useProfileStore((s) => s.createProfile);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!selected || !user) return;
    setLoading(true);
    try {
      await createProfile({
        id: user.id,
        display_name: user.user_metadata?.display_name ?? null,
        native_language: selected,
        english_level: 'A1',
        learning_goals: [],
        preferred_topics: [],
        avatar_url: null,
        onboarding_completed: false,
        timezone: null,
      });
      router.push('/(onboarding)/level');
    } catch {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.step}>Step 1 of 4</Text>
        <Text style={styles.title}>What's your native language?</Text>
        <Text style={styles.subtitle}>This helps us tailor conversations to your needs.</Text>
      </View>

      <FlatList
        data={LANGUAGES}
        numColumns={3}
        keyExtractor={(i) => i.code}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <View style={styles.gridItem}>
            <SelectableCard
              label={item.label}
              icon={item.icon}
              selected={selected === item.code}
              onPress={() => setSelected(item.code)}
            />
          </View>
        )}
      />

      <Button
        title="Next"
        onPress={handleNext}
        disabled={!selected}
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
