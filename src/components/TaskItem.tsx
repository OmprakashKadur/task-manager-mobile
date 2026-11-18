import React from 'react';
import { View, StyleSheet } from 'react-native';
import ReanimatedSwipeable, {
  SwipeDirection,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText, Card, Badge, Checkbox } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
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
  const { colors } = useTheme();
  const hapticsEnabled = useSettingsStore((s) => s.settings.haptics_enabled);
  const isDone = occurrence.status === 'done';

  const renderLeftActions = () => {
    return (
      <View style={[styles.swipeAction, { backgroundColor: colors.success }]}>
        <Ionicons
          name={isDone ? 'arrow-undo' : 'checkmark-done'}
          size={22}
          color="#FFFFFF"
        />
        <ThemedText variant="micro" style={{ color: '#FFFFFF', fontWeight: '700', marginTop: 2 }}>
          {isDone ? 'Undo' : 'Done'}
        </ThemedText>
      </View>
    );
  };

  const renderRightActions = () => {
    return (
      <View style={[styles.swipeAction, { backgroundColor: colors.danger }]}>
        <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
        <ThemedText variant="micro" style={{ color: '#FFFFFF', fontWeight: '700', marginTop: 2 }}>
          Delete
        </ThemedText>
      </View>
    );
  };

  const completedSubtasks = occurrence.subtasks?.filter((s) => s.completed).length || 0;
  const totalSubtasks = occurrence.subtasks?.length || 0;
  const catColor = occurrence.category?.color || colors.accent;

  return (
    <ReanimatedSwipeable
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      onSwipeableOpen={(direction: SwipeDirection) => {
        if (direction === SwipeDirection.LEFT) {
          onToggleComplete(occurrence);
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
          {
            borderLeftColor: catColor,
            borderLeftWidth: 3.5,
          },
          isDone && {
            borderColor: colors.success + '40',
          },
          occurrence.is_overdue && !isDone && {
            borderColor: colors.danger,
            borderWidth: 1.5,
          },
        ]}
      >
        <View style={styles.row}>
          {/* Animated Checkbox */}
          <View style={styles.checkboxWrapper}>
            <Checkbox
              checked={isDone}
              onToggle={() => onToggleComplete(occurrence)}
              color={colors.success}
              size={22}
            />
          </View>

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
                  size={14}
                  color={colors.accent}
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
                  backgroundColor={colors.successSoft}
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
                  backgroundColor={colors.dangerSoft}
                  icon={<Ionicons name="alert-circle" size={11} color={colors.danger} />}
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
                  color={colors.textTertiary}
                  backgroundColor={colors.surfaceVariant}
                  size="sm"
                />
              )}

              {/* Category */}
              {occurrence.category && (
                <Badge
                  label={occurrence.category.name}
                  color={catColor}
                  icon={
                    <Ionicons
                      name={(occurrence.category.icon as any) || 'pricetag'}
                      size={11}
                      color={catColor}
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
                  backgroundColor={colors.dangerSoft}
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
                      ? colors.successSoft
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
  checkboxWrapper: {
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
    width: 76,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
});
