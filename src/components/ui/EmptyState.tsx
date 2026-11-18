import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { Button } from './Button';
import { useTheme } from '@/hooks/useTheme';
import { Spacing } from '@/theme';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon = 'calendar-outline',
  title,
  description,
  actionTitle,
  onAction,
  style,
}: EmptyStateProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: isDark
              ? 'rgba(129, 140, 248, 0.12)'
              : colors.accentSoft,
            borderColor: isDark
              ? 'rgba(129, 140, 248, 0.25)'
              : 'rgba(79, 70, 229, 0.15)',
          },
        ]}
      >
        <Ionicons name={icon as any} size={36} color={colors.accent} />
      </View>

      <ThemedText variant="heading" style={styles.title}>
        {title}
      </ThemedText>

      {description && (
        <ThemedText variant="body" secondary style={styles.description}>
          {description}
        </ThemedText>
      )}

      {actionTitle && onAction && (
        <Button
          title={actionTitle}
          onPress={onAction}
          variant="primary"
          size="md"
          style={styles.actionBtn}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.huge,
    paddingHorizontal: Spacing.xl,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  title: {
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  description: {
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 21,
    marginBottom: Spacing.lg,
  },
  actionBtn: {
    minWidth: 140,
  },
});
