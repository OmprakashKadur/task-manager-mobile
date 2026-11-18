import { Platform } from 'react-native';
import { TypographyTokens } from './types';

export const FontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const Typography: TypographyTokens = {
  display: {
    fontFamily: FontFamily.bold,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  heading: {
    fontFamily: FontFamily.semiBold,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  subheading: {
    fontFamily: FontFamily.semiBold,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  bodyMedium: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  caption: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    letterSpacing: 0,
  },
  micro: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    letterSpacing: 0.2,
  },
  tabularNumbers: {
    fontVariant: ['tabular-nums'],
    ...Platform.select({
      ios: { fontFeatureSettings: '"tnum"' },
      android: { fontFeatureSettings: '"tnum"' },
    }),
  },

  // Legacy / convenience aliases
  h1: {
    fontFamily: FontFamily.bold,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.6,
  },
  h2: {
    fontFamily: FontFamily.bold,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  h3: {
    fontFamily: FontFamily.semiBold,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  subhead: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    letterSpacing: 0,
  },
  badge: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    letterSpacing: 0.2,
  },
};

