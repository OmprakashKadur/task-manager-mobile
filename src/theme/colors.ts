export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  card: string;
  cardHighlighted: string;
  border: string;
  borderSubtle: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  danger: string;
  dangerLight: string;
  info: string;
  infoLight: string;
  tabBar: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
  timelineTrack: string;
  currentTimeIndicator: string;
  priorityHigh: string;
  priorityMedium: string;
  priorityLow: string;
  overlay: string;
}

export const lightColors: ThemeColors = {
  primary: '#2563EB',        // Clean modern blue
  primaryLight: '#EFF6FF',
  primaryDark: '#1D4ED8',
  background: '#F8FAFC',     // Crisp modern slate-50
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  card: '#FFFFFF',
  cardHighlighted: '#EEF2FF',
  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',
  text: '#0F172A',           // Slate-900
  textSecondary: '#64748B',  // Slate-500
  textMuted: '#94A3B8',      // Slate-400
  textInverse: '#FFFFFF',
  success: '#10B981',        // Emerald-500
  successLight: '#ECFDF5',
  warning: '#F59E0B',        // Amber-500
  warningLight: '#FFFBEB',
  danger: '#EF4444',         // Red-500
  dangerLight: '#FEF2F2',
  info: '#3B82F6',           // Blue-500
  infoLight: '#EFF6FF',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E2E8F0',
  tabBarActive: '#2563EB',
  tabBarInactive: '#94A3B8',
  timelineTrack: '#E2E8F0',
  currentTimeIndicator: '#EF4444',
  priorityHigh: '#EF4444',
  priorityMedium: '#F59E0B',
  priorityLow: '#10B981',
  overlay: 'rgba(15, 23, 42, 0.45)',
};

export const darkColors: ThemeColors = {
  primary: '#3B82F6',        // Accessible blue in dark mode
  primaryLight: '#1E293B',
  primaryDark: '#60A5FA',
  background: '#0B0F19',     // Deep midnight blue/gray
  surface: '#111827',        // Gray-900
  surfaceVariant: '#1F2937', // Gray-800
  card: '#161F30',           // Slightly elevated container
  cardHighlighted: '#1E2B45',
  border: '#1F2937',
  borderSubtle: '#192231',
  text: '#F8FAFC',           // Crisp white
  textSecondary: '#94A3B8',  // Slate-400
  textMuted: '#64748B',      // Slate-500
  textInverse: '#0B0F19',
  success: '#10B981',
  successLight: '#064E3B',
  warning: '#F59E0B',
  warningLight: '#78350F',
  danger: '#F87171',
  dangerLight: '#7F1D1D',
  info: '#60A5FA',
  infoLight: '#1E3A8A',
  tabBar: '#0F1626',
  tabBarBorder: '#1F2937',
  tabBarActive: '#3B82F6',
  tabBarInactive: '#64748B',
  timelineTrack: '#1F2937',
  currentTimeIndicator: '#F87171',
  priorityHigh: '#F87171',
  priorityMedium: '#FBBF24',
  priorityLow: '#34D399',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

