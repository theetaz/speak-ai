export const COLORS = {
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  secondary: '#10B981',
  secondaryLight: '#34D399',
  accent: '#F59E0B',
  background: '#0F172A',
  surface: '#1E293B',
  surfaceLight: '#334155',
  card: '#1E293B',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#334155',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0,0,0,0.5)',
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const FONT_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 34,
} as const;

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type CEFRLevel = (typeof CEFR_LEVELS)[number];

export const LEARNING_GOALS = [
  { id: 'pronunciation', label: 'Pronunciation', icon: '🗣️' },
  { id: 'grammar', label: 'Grammar', icon: '📝' },
  { id: 'fluency', label: 'Fluency', icon: '💬' },
  { id: 'vocabulary', label: 'Vocabulary', icon: '📚' },
] as const;

export const TOPICS = [
  { id: 'daily_life', label: 'Daily Life', icon: '🏠' },
  { id: 'business', label: 'Business', icon: '💼' },
  { id: 'travel', label: 'Travel', icon: '✈️' },
  { id: 'academic', label: 'Academic', icon: '🎓' },
  { id: 'technology', label: 'Technology', icon: '💻' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎬' },
] as const;
