import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import ReanimatedSwipeable, {
  SwipeDirection,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText, Card, Badge } from '@/components/ui';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useSettingsStore } from '@/store/useSettingsStore';
import { TaskOccurrence } from '@/types';
import { Spacing, BorderRadius } from '@/theme';

export interface TaskItemProps {
  occurrence: TaskOccurrence;
  onToggleComplete: (occurrence: TaskOccurrence) => void;
  onPress: (occurrence: TaskOccurrence) => void;
  onDelete: (occurrence: TaskOccurrence) => void;
}

export function TaskItem({
  occurrence,
  onToggleComplete,
  onPress,
  onDelete,
}: TaskItemProps) {
  const { colors } = useAppTheme();
  const hapticsEnabled = useSettingsStore((s) => s.settings.haptics_enabled);
  const isDone = occurrence.status === 'done';

  const handleCheckboxPress = () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(
        isDone
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Medium
      ).catch(() => {});
    }
    onToggleComplete(occurrence);
  };

  const renderLeftActions = () => {
    return (
      <View style={[styles.swipeAction, { backgroundColor: colors.success }]}>
        <Ionicons
          name={isDone ? 'arrow-undo' : 'checkmark-done'}
          size={24}
          color="#FFFFFF"
        />
        <ThemedText variant="caption" style={{ color: '#FFFFFF', fontWeight: '700', marginTop: 2 }}>
          {isDone ? 'Undo' : 'Complete'}
        </ThemedText>
      </View>
    );
  };

  const renderRightActions = () => {
    return (
      <View style={[styles.swipeAction, { backgroundColor: colors.danger }]}>
        <Ionicons name="trash" size={24} color="#FFFFFF" />
        <ThemedText variant="caption" style={{ color: '#FFFFFF', fontWeight: '700', marginTop: 2 }}>
          Delete
        </ThemedText>
      </View>
    );
  };

  const completedSubtasks = occurrence.subtasks?.filter((s) => s.completed).length || 0;
  const totalSubtasks = occurrence.subtasks?.length || 0;

  return (
    <ReanimatedSwipeable
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      onSwipeableOpen={(direction: SwipeDirection) => {
        if (direction === SwipeDirection.LEFT) {
          handleCheckboxPress();
        } else if (direction === SwipeDirection.RIGHT) {
          if (hapticsEnabled) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          }
          onDelete(occurrence);
        }
      }}
      containerStyle={styles.swipeContainer}
    >
      <Card
        onPress={() => onPress(occurrence)}
        style={[
          styles.card,
          isDone && {
            borderColor: colors.success + '40',
            borderWidth: 1.5,
          },
          occurrence.is_overdue && !isDone && { borderColor: colors.dangerLight, borderWidth: 1.5 },
        ]}
      >
        <View style={styles.row}>
          {/* Checkbox */}
          <Pressable
            hitSlop={10}
            onPress={handleCheckboxPress}
            style={[
              styles.checkbox,
              {
                borderColor: isDone ? colors.success : colors.border,
                backgroundColor: isDone ? colors.success : 'transparent',
              },
            ]}
          >
            {isDone && <Ionicons name="checkmark-sharp" size={15} color="#FFFFFF" />}
          </Pressable>

          {/* Task Info */}
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <ThemedText
                variant="bodyMedium"
                style={[
                  styles.title,
                  isDone && styles.strikethrough,
                  isDone && { color: colors.textSecondary },
                ]}
                numberOfLines={2}
              >
                {occurrence.title}
              </ThemedText>

              {occurrence.is_recurring && (
                <Ionicons
                  name="repeat"
                  size={15}
                  color={colors.primary}
                  style={styles.recurringIcon}
                />
              )}
            </View>

            {occurrence.notes ? (
              <ThemedText
                variant="caption"
                secondary
                numberOfLines={1}
                style={{ marginTop: 2 }}
              >
                {occurrence.notes}
              </ThemedText>
            ) : null}

            {/* Badges and metadata */}
            <View style={styles.badgesRow}>
              {/* Completed badge */}
              {isDone && (
                <Badge
                  label="Completed"
                  color={colors.success}
                  backgroundColor={colors.successLight}
                  icon={
                    <Ionicons
                      name="checkmark-circle"
                      size={11}
                      color={colors.success}
                    />
                  }
                  size="sm"
                />
              )}

              {/* Overdue indicator */}
              {occurrence.is_overdue && !isDone && (
                <Badge
                  label="Overdue"
                  color={colors.danger}
                  backgroundColor={colors.dangerLight}
                  size="sm"
                />
              )}

              {/* Time slot */}
              {occurrence.start_time ? (
                <Badge
                  label={
                    occurrence.end_time
                      ? `${occurrence.start_time} - ${occurrence.end_time}`
                      : occurrence.start_time
                  }
                  color={colors.textSecondary}
                  backgroundColor={colors.surfaceVariant}
                  icon={
                    <Ionicons
                      name="time-outline"
                      size={11}
                      color={colors.textSecondary}
                    />
                  }
                  size="sm"
                />
              ) : (
                <Badge
                  label="Anytime"
                  color={colors.textMuted}
                  backgroundColor={colors.surfaceVariant}
                  size="sm"
                />
              )}

              {/* Category */}
              {occurrence.category && (
                <Badge
                  label={occurrence.category.name}
                  color={occurrence.category.color}
                  icon={
                    <Ionicons
                      name={(occurrence.category.icon as any) || 'pricetag'}
                      size={11}
                      color={occurrence.category.color}
                    />
                  }
                  size="sm"
                />
              )}

              {/* Priority */}
              {occurrence.priority === 'high' && (
                <Badge
                  label="High"
                  color={colors.priorityHigh}
                  size="sm"
                />
              )}

              {/* Subtasks counter */}
              {totalSubtasks > 0 && (
                <Badge
                  label={`${completedSubtasks}/${totalSubtasks}`}
                  color={completedSubtasks === totalSubtasks ? colors.success : colors.textSecondary}
                  backgroundColor={
                    completedSubtasks === totalSubtasks
                      ? colors.successLight
                      : colors.surfaceVariant
                  }
                  icon={
                    <Ionicons
                      name={
                        completedSubtasks === totalSubtasks
                          ? 'checkmark-circle'
                          : 'checkbox-outline'
                      }
                      size={11}
                      color={
                        completedSubtasks === totalSubtasks
                          ? colors.success
                          : colors.textSecondary
                      }
                    />
                  }
                  size="sm"
                />
              )}
            </View>
          </View>
        </View>
      </Card>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  card: {
    padding: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontWeight: '600',
    flex: 1,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  recurringIcon: {
    marginLeft: Spacing.xs,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  swipeAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
});
