import React, { useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { useSettingsStore } from '@/store/useSettingsStore';

export interface CheckboxProps {
  checked: boolean;
  onToggle: (nextState: boolean) => void;
  size?: number; // Visual size (defaults to 24)
  color?: string; // Checked color (defaults to theme.success)
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Checkbox({
  checked,
  onToggle,
  size = 24,
  color,
  disabled = false,
  style,
  accessibilityLabel = 'Toggle task completion',
}: CheckboxProps) {
  const { colors } = useTheme();
  const hapticsEnabled = useSettingsStore((s) => s.settings.haptics_enabled);

  const activeColor = color || colors.success;
  const scale = useSharedValue(1);
  const checkScale = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    checkScale.value = withSpring(checked ? 1 : 0, {
      damping: 14,
      stiffness: 300,
    });
  }, [checked, checkScale]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkScale.value,
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    if (disabled) return;
    if (hapticsEnabled) {
      Haptics.impactAsync(
        checked
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Medium
      ).catch(() => {});
    }
    // Bounce effect
    scale.value = withSequence(
      withSpring(1.15, { damping: 12, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 350 })
    );
    onToggle(!checked);
  };

  const borderRadius = size / 2;
  const iconSize = Math.round(size * 0.62);

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={Math.max(10, (44 - size) / 2)}
      style={[
        styles.container,
        containerAnimatedStyle,
        {
          width: size,
          height: size,
          borderRadius,
          borderColor: checked ? activeColor : colors.border,
          backgroundColor: checked ? activeColor : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      <Animated.View style={checkAnimatedStyle}>
        <Ionicons name="checkmark-sharp" size={iconSize} color="#FFFFFF" />
      </Animated.View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

