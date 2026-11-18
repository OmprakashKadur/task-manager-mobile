import React, { useEffect, useState } from 'react';
import { AppState, AppStateStatus, Appearance, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { initDatabase } from '@/db/database';
import { useThemeStore } from '@/store/useThemeStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useCategoryStore } from '@/store/useCategoryStore';
import { useTaskStore } from '@/store/useTaskStore';
import { trackInstall, trackLastActive } from '@/services/appTracking';
import {
  initNotifications,
  resyncNotificationSchedule,
  setupNotificationListeners,
} from '@/services/notifications';
import { UndoSnackbar } from '@/components/ui';
import { OnboardingModal } from '@/components/OnboardingModal';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const isDark = useThemeStore((s) => s.isDark);
  const colors = useThemeStore((s) => s.colors);
  const initTheme = useThemeStore((s) => s.initTheme);
  const setSystemScheme = useThemeStore((s) => s.setSystemScheme);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const loadCategories = useCategoryStore((s) => s.loadCategories);
  const userName = useSettingsStore((s) => s.settings.user_name);
  const isSettingsLoaded = useSettingsStore((s) => s.isLoaded);
  const triggerRefresh = useTaskStore((s) => s.triggerRefresh);

  useEffect(() => {
    async function initialize() {
      try {
        // 1. Initialize SQLite schema & defaults
        initDatabase();

        // 2. Initialize settings, theme & categories
        loadSettings();
        initTheme();
        loadCategories();

        // 3. Initialize notifications & schedule
        await initNotifications();
        await resyncNotificationSchedule();

        // 4. Track initial installation (non-blocking, fails silently offline)
        trackInstall().catch(() => {});
        trackLastActive().catch(() => {});
      } catch (e) {
        console.error('[RootLayout] Init error:', e);
      } finally {
        setIsReady(true);
      }
    }

    initialize();
  }, [loadSettings, initTheme, loadCategories]);

  // Hide splash screen only when both fonts and database initialization are ready
  useEffect(() => {
    if (isReady && (fontsLoaded || fontError)) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isReady, fontsLoaded, fontError]);

  // Setup notification response listeners (action buttons & taps)
  useEffect(() => {
    const cleanup = setupNotificationListeners(triggerRefresh);
    return () => {
      cleanup();
    };
  }, [triggerRefresh]);

  // AppState listener for tracking foreground transitions and resyncing notification schedule
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        trackLastActive().catch(() => {});
        resyncNotificationSchedule().catch(() => {});
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // System appearance listener
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });

    return () => {
      subscription.remove();
    };
  }, [setSystemScheme]);

  if (!isReady || (!fontsLoaded && !fontError)) {
    return <View style={[styles.container, { backgroundColor: colors.background }]} />;
  }

  const showOnboarding = isReady && isSettingsLoaded && !userName.trim();

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="task/new"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="task/[id]"
          options={{
            presentation: 'card',
            headerShown: false,
          }}
        />
      </Stack>
      <UndoSnackbar />
      <OnboardingModal visible={showOnboarding} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
