import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { registerGlobals } from '@livekit/react-native';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore } from '@/stores/profileStore';

registerGlobals();

export default function RootLayout() {
  const { initialize, initialized, session } = useAuthStore();
  const { profile, fetchProfile } = useProfileStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchProfile(session.user.id).catch(() => {});
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (!initialized) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (!session) {
      if (!inAuth) router.replace('/(auth)/welcome');
    } else if (!profile?.onboarding_completed) {
      if (!inOnboarding) router.replace('/(onboarding)/language');
    } else {
      if (inAuth || inOnboarding) router.replace('/(main)/(home)');
    }
  }, [initialized, session, profile?.onboarding_completed, segments]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Slot />
    </SafeAreaProvider>
  );
}
