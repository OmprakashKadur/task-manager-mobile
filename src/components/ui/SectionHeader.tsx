import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { Badge } from './Badge';
import { useTheme } from '@/hooks/useTheme';
import { Spacing } from '@/theme';

export interface SectionHeaderProps {
  title: string;
  icon?: string;
  count?: number;
  badgeLabel?: string;
  badgeColor?: string;
  actionTitle?: string;
  onAction?: () => void;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({
  title,
  icon,
  count,
  badgeLabel,
  badgeColor,
  actionTitle,
  onAction,
  collapsible = false,
  collapsed = false,
  onToggleCollapse,
  style,
}: SectionHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <Pressable
        disabled={!collapsible}
        onPress={onToggleCollapse}
        style={styles.left}
        hitSlop={8}
      >
        {icon && (
          <Ionicons
            name={icon as any}
            size={16}
            color={colors.accent}
            style={styles.icon}
          />
        )}
        <ThemedText variant="subheading" style={styles.title}>
          {title}
        </ThemedText>

        {typeof count === 'number' && (
          <Badge
            label={count.toString()}
            size="sm"
            color={colors.textSecondary}
            backgroundColor={colors.surfaceVariant}
            style={styles.badge}
          />
        )}

        {badgeLabel && (
          <Badge
            label={badgeLabel}
            size="sm"
            color={badgeColor || colors.accent}
            style={styles.badge}
          />
        )}

        {collapsible && (
          <Ionicons
            name={collapsed ? 'chevron-forward' : 'chevron-down'}
            size={16}
            color={colors.textTertiary}
            style={styles.collapseIcon}
          />
        )}
      </Pressable>

      {actionTitle && onAction && (
        <Pressable onPress={onAction} hitSlop={10} style={styles.actionBtn}>
          <ThemedText
            variant="caption"
            style={[styles.actionText, { color: colors.accent }]}
          >
            {actionTitle}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: Spacing.xs,
  },
  title: {
    fontWeight: '700',
  },
  badge: {
    marginLeft: Spacing.sm,
  },
  collapseIcon: {
    marginLeft: Spacing.xs,
  },
  actionBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  actionText: {
    fontWeight: '600',
  },
});

