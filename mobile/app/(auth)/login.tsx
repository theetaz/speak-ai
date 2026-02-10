import { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { signIn } from '@/services/auth';
import { COLORS, SPACING, FONT_SIZE } from '@/utils/constants';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please fill in all fields.');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err: any) {
      Alert.alert('Login failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue your learning journey</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Password"
            placeholder="Your password"
            value={password}
            onChangeText={setPassword}
            isPassword
          />
          <Button title="Sign In" onPress={handleLogin} loading={loading} size="lg" />
        </View>

        <Button
          title="Don't have an account? Sign Up"
          onPress={() => router.replace('/(auth)/register')}
          variant="ghost"
        />
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', gap: SPACING.xl },
  header: { gap: SPACING.xs },
  title: { fontSize: FONT_SIZE.xxl, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: FONT_SIZE.md, color: COLORS.textSecondary },
  form: { gap: SPACING.md },
});
