import React from 'react';
import {
  View,
  Pressable,
  ViewProps,
  StyleSheet,
  PressableProps,
} from 'react-native';
import { useAppTheme } from '@/hooks/useAppTheme';
import { BorderRadius, Shadows, Spacing } from '@/theme';

export interface CardProps extends ViewProps {
  onPress?: () => void;
  highlighted?: boolean;
  surface?: boolean;
  border?: boolean;
}

export function Card({
  children,
  style,
  onPress,
  highlighted,
  surface,
  border = true,
  ...props
}: CardProps) {
  const { colors } = useAppTheme();

  const backgroundColor = highlighted
    ? colors.cardHighlighted
    : surface
    ? colors.surface
    : colors.card;

  const cardStyle = [
    styles.card,
    {
      backgroundColor,
      borderColor: border ? colors.border : 'transparent',
    },
    Shadows.sm,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          cardStyle,
          pressed && { opacity: 0.88, transform: [{ scale: 0.995 }] },
        ]}
        {...(props as PressableProps)}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={cardStyle} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
  },
});

