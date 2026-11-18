import React, { useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText, EmptyState } from '@/components/ui';
import { TaskForm } from '@/components/TaskForm';
import { useAppTheme } from '@/hooks/useAppTheme';
import { getTaskById, getRecurrenceRuleByTaskId } from '@/db/tasks';
import { Spacing } from '@/theme';

export default function EditTaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();

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
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
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
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <ThemedText variant="h3">Edit Task</ThemedText>
        <View style={{ width: 24 }} />
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
});
