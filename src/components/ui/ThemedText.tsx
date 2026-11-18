import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { Typography } from '@/theme';
import { useAppTheme } from '@/hooks/useAppTheme';

export type TextVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodyMedium'
  | 'subhead'
  | 'caption'
  | 'badge';

export interface ThemedTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  secondary?: boolean;
  muted?: boolean;
}

export function ThemedText({
  variant = 'body',
  color,
  secondary,
  muted,
  style,
  children,
  ...props
}: ThemedTextProps) {
  const { colors } = useAppTheme();

  let resolvedColor = colors.text;
  if (color) {
    resolvedColor = color;
  } else if (secondary) {
    resolvedColor = colors.textSecondary;
  } else if (muted) {
    resolvedColor = colors.textMuted;
  }

  return (
    <Text
      style={[
        styles.base,
        Typography[variant],
        { color: resolvedColor },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});

