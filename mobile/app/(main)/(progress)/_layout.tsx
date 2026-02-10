import { Stack } from 'expo-router';
import { COLORS } from '@/utils/constants';

export default function ProgressLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background } }} />
  );
}
