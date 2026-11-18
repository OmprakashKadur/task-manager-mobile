import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { BorderRadius } from '@/theme';

export interface BadgeProps {
  label: string;
  color?: string;
  backgroundColor?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Badge({
  label,
  color,
  backgroundColor,
  icon,
  size = 'md',
  style,
  textStyle,
}: BadgeProps) {
  const { colors, isDark } = useTheme();

  const activeColor = color || colors.accent;
  const activeBg =
    backgroundColor ||
    (isDark ? `${activeColor}24` : `${activeColor}14`);

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: activeBg,
          borderColor: isDark ? `${activeColor}30` : `${activeColor}20`,
          borderWidth: 1,
          paddingVertical: isSmall ? 2 : 4,
          paddingHorizontal: isSmall ? 6 : 8,
        },
        style,
      ]}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      <ThemedText
        variant="micro"
        tabular
        style={[
          styles.text,
          {
            color: activeColor,
            fontWeight: '600',
            fontSize: isSmall ? 10 : 11,
          },
          textStyle,
        ]}
      >
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    includeFontPadding: false,
  },
});
