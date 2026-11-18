import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
  Pressable,
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
import { BorderRadius, Spacing } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  hapticFeedback?: boolean;
  fullWidth?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  style,
  textStyle,
  hapticFeedback = true,
  fullWidth = false,
}: ButtonProps) {
  const { colors } = useTheme();
  const hapticsEnabled = useSettingsStore((s) => s.settings.haptics_enabled);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled || loading) return;
    scale.value = withSpring(0.97, { damping: 15, stiffness: 350 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 350 });
  };

  const handlePress = () => {
    if (disabled || loading) return;
    if (hapticFeedback && hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress();
  };

  // Colors per variant
  let bgColor = colors.accent;
  let textColor = '#FFFFFF';
  let borderColor = 'transparent';

  if (variant === 'secondary') {
    bgColor = colors.surfaceVariant;
    textColor = colors.textPrimary;
    borderColor = colors.borderSubtle;
  } else if (variant === 'outline') {
    bgColor = 'transparent';
    textColor = colors.accent;
    borderColor = colors.border;
  } else if (variant === 'ghost') {
    bgColor = 'transparent';
    textColor = colors.textSecondary;
  } else if (variant === 'danger' || variant === 'destructive') {
    bgColor = colors.danger;
    textColor = '#FFFFFF';
  }

  // Size specifications
  let minHeight = 44;
  let paddingVertical = Spacing.sm;
  let paddingHorizontal = Spacing.lg;
  let textVariant: 'caption' | 'bodyMedium' | 'subheading' = 'bodyMedium';

  if (size === 'sm') {
    minHeight = 36;
    paddingVertical = 6;
    paddingHorizontal = Spacing.md;
    textVariant = 'caption';
  } else if (size === 'lg') {
    minHeight = 52;
    paddingVertical = Spacing.md;
    paddingHorizontal = Spacing.xl;
    textVariant = 'bodyMedium';
  }

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.button,
        animatedStyle,
        {
          backgroundColor: bgColor,
          borderColor,
          borderWidth: borderColor !== 'transparent' ? 1 : 0,
          minHeight,
          paddingVertical,
          paddingHorizontal,
          opacity: disabled ? 0.45 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          <ThemedText
            variant={textVariant}
            style={[
              styles.text,
              { color: textColor, fontWeight: '600' },
              textStyle,
            ]}
          >
            {title}
          </ThemedText>
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
  text: {
    textAlign: 'center',
  },
});
