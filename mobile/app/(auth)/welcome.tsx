import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Button } from '@/components/ui/Button';
import { COLORS, SPACING, FONT_SIZE } from '@/utils/constants';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <ScreenWrapper style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.emoji}>🎙️</Text>
        <Text style={styles.title}>SpeakEasy AI</Text>
        <Text style={styles.subtitle}>
          Your AI English conversation partner.{'\n'}Practice speaking anytime, anywhere.
        </Text>
      </View>

      <View style={styles.features}>
        {[
          { icon: '🗣️', text: 'Real-time voice conversations' },
          { icon: '📝', text: 'Grammar & pronunciation feedback' },
          { icon: '📈', text: 'Track your progress over time' },
        ].map((f) => (
          <View key={f.text} style={styles.featureRow}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button title="Get Started" onPress={() => router.push('/(auth)/register')} size="lg" />
        <Button
          title="I already have an account"
          onPress={() => router.push('/(auth)/login')}
          variant="ghost"
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'space-between', paddingVertical: SPACING.xxl },
  hero: { alignItems: 'center', gap: SPACING.md, marginTop: SPACING.xxl },
  emoji: { fontSize: 64 },
  title: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  features: { gap: SPACING.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  featureIcon: { fontSize: 24 },
  featureText: { color: COLORS.text, fontSize: FONT_SIZE.md },
  actions: { gap: SPACING.sm },
});
