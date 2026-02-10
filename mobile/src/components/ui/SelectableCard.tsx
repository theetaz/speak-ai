import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '@/utils/constants';

interface SelectableCardProps {
  label: string;
  subtitle?: string;
  icon?: string;
  selected: boolean;
  onPress: () => void;
}

export function SelectableCard({ label, subtitle, icon, selected, onPress }: SelectableCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.card, selected && styles.selected]}
    >
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  selected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(99,102,241,0.1)',
  },
  icon: { fontSize: 28 },
  label: {
    color: COLORS.text,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    textAlign: 'center',
  },
  labelSelected: { color: COLORS.primary },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.xs,
    textAlign: 'center',
  },
});
