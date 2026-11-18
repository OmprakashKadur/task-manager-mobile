import { useMemo } from 'react';
import { useThemeStore } from '@/store/useThemeStore';
import { Typography } from '@/theme/typography';
import { Spacing, BorderRadius } from '@/theme/spacing';
import { Shadows } from '@/theme/shadows';
import { categoryPalette } from '@/theme/categories';
import { priorityTokens } from '@/theme/priorities';
import { Theme } from '@/theme/types';

export function useTheme() {
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const systemScheme = useThemeStore((s) => s.systemScheme);

  const theme: Theme = useMemo(
    () => ({
      isDark,
      colors,
      typography: Typography,
      spacing: Spacing,
      radius: BorderRadius,
      shadows: Shadows,
      categories: categoryPalette,
      priorities: priorityTokens,
    }),
    [isDark, colors]
  );

  return {
    theme,
    colors,
    typography: Typography,
    spacing: Spacing,
    radius: BorderRadius,
    shadows: Shadows,
    isDark,
    mode,
    setMode,
    systemScheme,
  };
}

export const useAppTheme = useTheme;

