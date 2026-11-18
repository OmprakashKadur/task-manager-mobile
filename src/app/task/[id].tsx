import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText, EmptyState, IconButton } from '@/components/ui';
import { TaskForm } from '@/components/TaskForm';
import { useTheme } from '@/hooks/useTheme';
import { getTaskById, getRecurrenceRuleByTaskId } from '@/db/tasks';
import { Spacing } from '@/theme';

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();

  const task = useMemo(() => {
    if (!id) return null;
    return getTaskById(id);
  }, [id]);

  const rule = useMemo(() => {
    if (!task || !task.recurrence_rule_id) return null;
    return getRecurrenceRuleByTaskId(task.id);
  }, [task]);

  if (!task) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <IconButton
            icon={<Ionicons name="arrow-back" size={22} color={colors.textPrimary} />}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            size={36}
          />
        </View>
        <EmptyState
          icon="alert-circle-outline"
          title="Task Not Found"
          description="The task you are looking for may have been deleted."
          actionTitle="Go Back"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <IconButton
          icon={<Ionicons name="arrow-back" size={22} color={colors.textPrimary} />}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          size={36}
        />
        <ThemedText variant="heading">Edit Task</ThemedText>
        <View style={{ width: 36 }} />
      </View>

      <TaskForm initialTask={task} initialRule={rule} isEditing />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
});
