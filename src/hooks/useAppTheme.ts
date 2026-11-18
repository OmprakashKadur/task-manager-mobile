import { useThemeStore } from '@/store/useThemeStore';

export function useAppTheme() {
  const colors = useThemeStore((s) => s.colors);
  const isDark = useThemeStore((s) => s.isDark);
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return {
    colors,
    isDark,
    mode,
    setMode,
  };
}

