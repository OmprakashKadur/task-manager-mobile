import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { Typography } from '@/theme';
import { useTheme } from '@/hooks/useTheme';

export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyMedium'
  | 'caption'
  | 'micro'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'subhead'
  | 'badge';

export interface ThemedTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  secondary?: boolean;
  tertiary?: boolean;
  muted?: boolean;
  tabular?: boolean;
}

export function ThemedText({
  variant = 'body',
  color,
  secondary,
  tertiary,
  muted,
  tabular,
  style,
  children,
  ...props
}: ThemedTextProps) {
  const { colors } = useTheme();

  let resolvedColor = colors.textPrimary;
  if (color) {
    resolvedColor = color;
  } else if (secondary) {
    resolvedColor = colors.textSecondary;
  } else if (tertiary || muted) {
    resolvedColor = colors.textTertiary;
  }

  return (
    <Text
      style={[
        styles.base,
        Typography[variant] || Typography.body,
        tabular && Typography.tabularNumbers,
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
    textAlignVertical: 'center',
  },
});
