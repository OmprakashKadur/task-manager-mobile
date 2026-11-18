import { create } from 'zustand';
import { Appearance, ColorSchemeName } from 'react-native';
import { ThemeMode } from '@/types';
import { lightColors, darkColors, ThemeColors } from '@/theme/colors';
import { getSetting, setSetting } from '@/db/settings';

type ColorSchemeType = ColorSchemeName | null | undefined;

interface ThemeState {
  mode: ThemeMode;
  systemScheme: ColorSchemeType;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  setSystemScheme: (scheme: ColorSchemeType) => void;
  initTheme: () => void;
}

function resolveIsDark(mode: ThemeMode, systemScheme: ColorSchemeType): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return systemScheme === 'dark';
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  systemScheme: Appearance.getColorScheme(),
  isDark: Appearance.getColorScheme() === 'dark',
  colors: Appearance.getColorScheme() === 'dark' ? darkColors : lightColors,

  initTheme: () => {
    const savedMode = (getSetting('theme_mode', 'system') as ThemeMode) || 'system';
    const systemScheme = Appearance.getColorScheme();
    const isDark = resolveIsDark(savedMode, systemScheme);
    set({
      mode: savedMode,
      systemScheme,
      isDark,
      colors: isDark ? darkColors : lightColors,
    });
  },

  setMode: (mode: ThemeMode) => {
    setSetting('theme_mode', mode);
    const { systemScheme } = get();
    const isDark = resolveIsDark(mode, systemScheme);
    set({
      mode,
      isDark,
      colors: isDark ? darkColors : lightColors,
    });
  },

  setSystemScheme: (systemScheme: ColorSchemeType) => {
    const { mode } = get();
    const isDark = resolveIsDark(mode, systemScheme);
    set({
      systemScheme,
      isDark,
      colors: isDark ? darkColors : lightColors,
    });
  },
}));
