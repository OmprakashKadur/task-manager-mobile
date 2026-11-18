import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { BorderRadius, Spacing } from '@/theme';

export interface BadgeProps {
  label: string;
  color: string;
  backgroundColor?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
  size?: 'sm' | 'md';
}

export function Badge({
  label,
  color,
  backgroundColor,
  icon,
  style,
  size = 'md',
}: BadgeProps) {
  // If no background color provided, create a soft 12% opacity tint of the main color
  const bg = backgroundColor || `${color}1F`;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          paddingVertical: size === 'sm' ? 2 : 4,
          paddingHorizontal: size === 'sm' ? Spacing.xs : Spacing.sm,
        },
        style,
      ]}
    >
      {icon && <View style={styles.icon}>{icon}</View>}
      <ThemedText
        variant="badge"
        style={{
          color,
          fontSize: size === 'sm' ? 10 : 11,
        }}
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
    borderRadius: BorderRadius.xs,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: Spacing.xxs,
  },
});

