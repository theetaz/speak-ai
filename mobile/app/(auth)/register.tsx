import { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '@/components/ui/ScreenWrapper';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { signUp } from '@/services/auth';
import { COLORS, SPACING, FONT_SIZE } from '@/utils/constants';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password)
      return Alert.alert('Error', 'Please fill in all fields.');
    if (password.length < 6)
      return Alert.alert('Error', 'Password must be at least 6 characters.');

    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
    } catch (err: any) {
      Alert.alert('Registration failed', err.message);
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
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Start your English learning journey today</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Name"
            placeholder="Your name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
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
            placeholder="At least 6 characters"
            value={password}
            onChangeText={setPassword}
            isPassword
          />
          <Button title="Create Account" onPress={handleRegister} loading={loading} size="lg" />
        </View>

        <Button
          title="Already have an account? Sign In"
          onPress={() => router.replace('/(auth)/login')}
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
