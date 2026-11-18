import React from 'react';
import {
  StyleSheet,
  Pressable,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useSettingsStore } from '@/store/useSettingsStore';
import { BorderRadius } from '@/theme';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  color?: string; // Custom accent color (e.g. category color)
  softBg?: string;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  count?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  color,
  softBg,
  size = 'md',
  style,
  textStyle,
  count,
}: ChipProps) {
  const { colors, isDark } = useTheme();
  const hapticsEnabled = useSettingsStore((s) => s.settings.haptics_enabled);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!onPress) return;
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    if (!onPress) return;
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    if (!onPress) return;
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress();
  };

  const activeColor = color || colors.accent;
  const isSmall = size === 'sm';

  let backgroundColor = colors.surfaceVariant;
  let textColor = colors.textSecondary;
  let borderColor = colors.borderSubtle;

  if (selected) {
    backgroundColor = activeColor;
    textColor = '#FFFFFF';
    borderColor = activeColor;
  } else if (color) {
    backgroundColor = softBg || (isDark ? `${color}20` : `${color}12`);
    textColor = isDark ? '#F0F6FC' : color;
    borderColor = isDark ? `${color}40` : `${color}28`;
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.chip,
        animatedStyle,
        {
          backgroundColor,
          borderColor,
          borderWidth: 1,
          paddingVertical: isSmall ? 4 : 7,
          paddingHorizontal: isSmall ? 8 : 12,
          minHeight: isSmall ? 28 : 36,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <ThemedText
          variant={isSmall ? 'micro' : 'caption'}
          style={[
            styles.label,
            {
              color: textColor,
              fontWeight: selected ? '700' : '500',
            },
            textStyle,
          ]}
        >
          {label}
        </ThemedText>
        {typeof count === 'number' && (
          <View
            style={[
              styles.countBadge,
              {
                backgroundColor: selected
                  ? 'rgba(255, 255, 255, 0.25)'
                  : isDark
                  ? 'rgba(255, 255, 255, 0.1)'
                  : 'rgba(0, 0, 0, 0.06)',
              },
            ]}
          >
            <ThemedText
              variant="micro"
              tabular
              style={{ color: textColor, fontWeight: '700', fontSize: 10 }}
            >
              {count}
            </ThemedText>
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 5,
  },
  label: {
    includeFontPadding: false,
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
  },
});
