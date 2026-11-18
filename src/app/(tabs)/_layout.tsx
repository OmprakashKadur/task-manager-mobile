import React, { ComponentProps } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useSettingsStore } from '@/store/useSettingsStore';
import { FontFamily, BorderRadius } from '@/theme';
import { ThemedText } from '@/components/ui';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

interface TabConfig {
  label: string;
  iconFocused: keyof typeof Ionicons.glyphMap;
  iconUnfocused: keyof typeof Ionicons.glyphMap;
}

const TAB_CONFIG: Record<string, TabConfig> = {
  index: {
    label: 'Today',
    iconFocused: 'today',
    iconUnfocused: 'today-outline',
  },
  calendar: {
    label: 'Calendar',
    iconFocused: 'calendar',
    iconUnfocused: 'calendar-outline',
  },
  planner: {
    label: 'Planner',
    iconFocused: 'time',
    iconUnfocused: 'time-outline',
  },
  analytics: {
    label: 'Analytics',
    iconFocused: 'stats-chart',
    iconUnfocused: 'stats-chart-outline',
  },
  settings: {
    label: 'Settings',
    iconFocused: 'settings',
    iconUnfocused: 'settings-outline',
  },
};

function CustomTabBarItem({
  route,
  isFocused,
  onPress,
  onLongPress,
  colors,
}: {
  route: { key: string; name: string };
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const scale = useSharedValue(1);
  const config = TAB_CONFIG[route.name] || {
    label: route.name,
    iconFocused: 'ellipse' as const,
    iconUnfocused: 'ellipse-outline' as const,
  };

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      key={route.key}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={config.label}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabButton}
    >
      <Animated.View style={[styles.tabContent, animatedStyle]}>
        <View
          style={[
            styles.iconPill,
            isFocused && { backgroundColor: colors.accentSoft },
          ]}
        >
          <Ionicons
            name={isFocused ? config.iconFocused : config.iconUnfocused}
            size={22}
            color={isFocused ? colors.accent : colors.textTertiary}
          />
        </View>
        <ThemedText
          style={[
            styles.tabLabel,
            {
              color: isFocused ? colors.accent : colors.textTertiary,
              fontFamily: isFocused
                ? FontFamily.semiBold
                : FontFamily.medium,
            },
          ]}
        >
          {config.label}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
}

function CustomTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
}: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const safeInsets = useSafeAreaInsets();
  const hapticsEnabled = useSettingsStore((s) => s.settings.haptics_enabled);

  const bottomPadding = Math.max(insets?.bottom ?? safeInsets.bottom, 8);

  return (
    <View
      style={[
        styles.tabBarWrapper,
        {
          paddingBottom: bottomPadding,
          borderTopColor: colors.borderSubtle,
          backgroundColor:
            Platform.OS === 'ios'
              ? isDark
                ? 'rgba(13, 17, 23, 0.82)'
                : 'rgba(255, 255, 255, 0.88)'
              : colors.surface,
          shadowColor: '#000',
          shadowOpacity: isDark ? 0.35 : 0.06,
        },
      ]}
    >
      {Platform.OS === 'ios' && (
        <BlurView
          tint={isDark ? 'dark' : 'light'}
          intensity={90}
          style={StyleSheet.absoluteFill}
        />
      )}

      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          if (
            options.tabBarItemStyle &&
            (options.tabBarItemStyle as any).display === 'none'
          ) {
            return null;
          }

          const isFocused = state.index === index;

          const onPress = () => {
            if (hapticsEnabled) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }

            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
          };

          const onLongPress = () => {
            if (hapticsEnabled) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            emitter.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <CustomTabBarItem
              key={route.key}
              route={route}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
              colors={colors}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Tabs.Screen name="planner" options={{ title: 'Planner' }} />
      <Tabs.Screen name="analytics" options={{ title: 'Analytics' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: -3 },
    shadowRadius: 10,
    elevation: 8,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 2,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPill: {
    width: 48,
    height: 28,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 0.1,
  },
});
