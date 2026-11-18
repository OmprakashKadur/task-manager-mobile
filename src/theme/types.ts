import { TextStyle, ViewStyle } from 'react-native';

export interface ThemeColors {
  // Core theme tokens per spec
  background: string;
  surface: string;
  surfaceElevated: string;
  surfaceVariant: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  overlay: string;

  // Backward compatibility & convenience aliases
  primary: string;
  primaryLight: string;
  primaryDark: string;
  card: string;
  cardHighlighted: string;
  text: string;
  textMuted: string;
  textInverse: string;
  successLight: string;
  warningLight: string;
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
}

export interface CategoryColor {
  id: string;
  name: string;
  solid: string;
  soft: string;
  icon: string;
}

export interface PriorityToken {
  value: 'high' | 'medium' | 'low';
  label: string;
  solid: string;
  soft: string;
  icon: string;
}

export interface TypographyTokens {
  display: TextStyle;
  title: TextStyle;
  heading: TextStyle;
  subheading: TextStyle;
  body: TextStyle;
  bodyMedium: TextStyle;
  caption: TextStyle;
  micro: TextStyle;
  tabularNumbers: TextStyle;
  // Legacy aliases
  h1: TextStyle;
  h2: TextStyle;
  h3: TextStyle;
  subhead: TextStyle;
  badge: TextStyle;
}

export interface SpacingTokens {
  xxs: number;
  xs: number;
  sm: number;
  md: number;
  base: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
  huge: number;
  massive: number;
}

export interface RadiusTokens {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  full: number;
}

export interface ShadowTokens {
  none: ViewStyle;
  sm: ViewStyle;
  md: ViewStyle;
  lg: ViewStyle;
  xl: ViewStyle;
}

export interface Theme {
  isDark: boolean;
  colors: ThemeColors;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  radius: RadiusTokens;
  shadows: ShadowTokens;
  categories: CategoryColor[];
  priorities: Record<'high' | 'medium' | 'low', PriorityToken>;
}

