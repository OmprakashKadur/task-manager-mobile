import React from 'react';
import {
  Pressable,
  ActivityIndicator,
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ThemedText } from './ThemedText';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useSettingsStore } from '@/store/useSettingsStore';
import { BorderRadius, Spacing } from '@/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
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
}

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
}: ButtonProps) {
  const { colors } = useAppTheme();
  const hapticsEnabled = useSettingsStore((s) => s.settings.haptics_enabled);

  const handlePress = () => {
    if (disabled || loading) return;
    if (hapticFeedback && hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress();
  };

  // Variant styles
  let bgColor = colors.primary;
  let textColor = colors.textInverse;
  let borderColor = 'transparent';

  if (variant === 'secondary') {
    bgColor = colors.surfaceVariant;
    textColor = colors.text;
  } else if (variant === 'outline') {
    bgColor = 'transparent';
    textColor = colors.primary;
    borderColor = colors.border;
  } else if (variant === 'ghost') {
    bgColor = 'transparent';
    textColor = colors.textSecondary;
  } else if (variant === 'danger') {
    bgColor = colors.danger;
    textColor = colors.textInverse;
  }

  // Size styles
  let paddingVertical: number = Spacing.md;
  let paddingHorizontal: number = Spacing.xl;
  let fontSizeVariant: 'caption' | 'bodyMedium' | 'subhead' = 'bodyMedium';

  if (size === 'sm') {
    paddingVertical = Spacing.xs;
    paddingHorizontal = Spacing.md;
    fontSizeVariant = 'subhead';
  } else if (size === 'lg') {
    paddingVertical = Spacing.lg;
    paddingHorizontal = Spacing.xxl;
    fontSizeVariant = 'bodyMedium';
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bgColor,
          borderColor,
          borderWidth: variant === 'outline' ? 1 : 0,
          paddingVertical,
          paddingHorizontal,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !disabled && !loading ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <ThemedText
            variant={fontSizeVariant}
            style={[{ color: textColor, fontWeight: '600' }, textStyle]}
          >
            {title}
          </ThemedText>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: Spacing.xs,
  },
  iconRight: {
    marginLeft: Spacing.xs,
  },
});
