import { View, StyleSheet, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '@/utils/constants';

interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}

export function ScreenWrapper({ children, style, padded = true }: ScreenWrapperProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.container, padded && styles.padded, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  padded: { paddingHorizontal: SPACING.lg },
});
