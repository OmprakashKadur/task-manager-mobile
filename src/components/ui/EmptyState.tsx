import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { Button } from './Button';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Spacing } from '@/theme';

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  icon = 'clipboard-outline',
  title,
  description,
  actionTitle,
  onAction,
  style,
}: EmptyStateProps) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.surfaceVariant }]}>
        <Ionicons name={icon} size={40} color={colors.primary} />
      </View>
      <ThemedText variant="h3" style={styles.title}>
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
          size="sm"
          style={styles.action}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  description: {
    textAlign: 'center',
    maxWidth: 280,
  },
  action: {
    marginTop: Spacing.lg,
  },
});

