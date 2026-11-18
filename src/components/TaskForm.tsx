import React, { useState, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  Pressable,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText, Card, Button, Badge } from '@/components/ui';
import { RecurrenceRulePicker } from './RecurrenceRulePicker';
import { ScopeModal } from './ScopeModal';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useCategoryStore } from '@/store/useCategoryStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import {
  Task,
  RecurrenceRule,
  Priority,
  Subtask,
  RecurrenceEditScope,
  TaskOccurrence,
} from '@/types';
import { Spacing, BorderRadius } from '@/theme';
import {
  insertTask,
  insertRecurrenceRule,
  updateTask,
  deleteTask,
} from '@/db/tasks';
import {
  editRecurringTaskWithScope,
  deleteRecurringTaskWithScope,
} from '@/services/taskService';
import { resyncNotificationSchedule } from '@/services/notifications';

export interface TaskFormProps {
  initialTask?: Task | TaskOccurrence;
  initialRule?: RecurrenceRule | null;
  isEditing?: boolean;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const PRIORITIES: { label: string; value: Priority; color: string }[] = [
  { label: 'Low', value: 'low', color: '#10B981' },
  { label: 'Medium', value: 'medium', color: '#F59E0B' },
  { label: 'High', value: 'high', color: '#EF4444' },
];

const REMINDER_OPTIONS = [
  { label: 'At start', value: 0 },
  { label: '5m before', value: 5 },
  { label: '15m before', value: 15 },
  { label: '30m before', value: 30 },
  { label: '1h before', value: 60 },
];

export function TaskForm({
  initialTask,
  initialRule,
  isEditing = false,
}: TaskFormProps) {
  const { colors } = useAppTheme();
  const categories = useCategoryStore((s) => s.categories);
  const defaultReminder = useSettingsStore(
    (s) => s.settings.default_reminder_minutes
  );
  const triggerRefresh = useTaskStore((s) => s.triggerRefresh);
  const showUndo = useTaskStore((s) => s.showUndo);

  const [title, setTitle] = useState(initialTask?.title || '');
  const [notes, setNotes] = useState(initialTask?.notes || '');
  const [date, setDate] = useState(
    initialTask?.date || new Date().toISOString().slice(0, 10)
  );
  const [startTime, setStartTime] = useState(initialTask?.start_time || '09:00');
  const [endTime, setEndTime] = useState(initialTask?.end_time || '10:00');
  const [allDay, setAllDay] = useState(initialTask?.all_day || false);
  const [categoryId, setCategoryId] = useState(
    initialTask?.category_id || categories[0]?.id || 'cat_work'
  );
  const [priority, setPriority] = useState<Priority>(
    initialTask?.priority || 'medium'
  );
  const [subtasks, setSubtasks] = useState<Subtask[]>(
    initialTask?.subtasks || []
  );
  const [reminders, setReminders] = useState<number[]>(
    initialTask?.reminders && initialTask.reminders.length > 0
      ? initialTask.reminders
      : [defaultReminder]
  );
  const [recurrenceRule, setRecurrenceRule] =
    useState<Partial<RecurrenceRule> | null>(initialRule || null);

  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [scopeModalVisible, setScopeModalVisible] = useState(false);
  const [scopeActionType, setScopeActionType] = useState<'edit' | 'delete'>('edit');
  const [saving, setSaving] = useState(false);

  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const subtaskInputRef = useRef<React.ElementRef<typeof TextInput>>(null);

  // Subtask handlers
  const addSubtask = () => {
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;
    setSubtasks((prev) => [
      ...prev,
      { id: generateId(), title: trimmed, completed: false },
    ]);
    setNewSubtaskTitle('');
    // Auto-scroll so newly added subtask and input stay above typing pad
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const toggleSubtask = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s))
    );
  };

  const removeSubtask = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  // Reminder toggle
  const toggleReminder = (min: number) => {
    if (reminders.includes(min)) {
      setReminders(reminders.filter((m) => m !== min));
    } else {
      setReminders([...reminders, min].sort((a, b) => a - b));
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a task title');
      return;
    }

    if (isEditing && initialRule) {
      // Editing a recurring task: prompt for scope!
      setScopeActionType('edit');
      setScopeModalVisible(true);
      return;
    }

    commitSave();
  };

  const commitSave = (scope?: RecurrenceEditScope) => {
    setSaving(true);
    const now = new Date().toISOString();

    const taskId =
      initialTask && 'task_id' in initialTask
        ? (initialTask as TaskOccurrence).task_id
        : initialTask?.id || generateId();

    const createdAt =
      initialTask && 'created_at' in initialTask && (initialTask as Task).created_at
        ? (initialTask as Task).created_at
        : now;

    const taskData: Task = {
      id: taskId,
      title: title.trim(),
      notes: notes.trim() || undefined,
      date,
      start_time: allDay ? undefined : startTime,
      end_time: allDay ? undefined : endTime,
      all_day: allDay,
      category_id: categoryId,
      priority,
      subtasks,
      reminders,
      status: initialTask?.status || 'pending',
      recurrence_rule_id: recurrenceRule ? (initialRule?.id || generateId()) : undefined,
      created_at: createdAt,
      updated_at: now,
    };

    if (isEditing) {
      if (initialRule && scope) {
        editRecurringTaskWithScope(
          scope,
          taskData,
          initialRule,
          initialTask!.date,
          taskData
        );
      } else {
        updateTask(taskData);
      }
    } else {
      // New task
      if (recurrenceRule) {
        const ruleId = generateId();
        taskData.recurrence_rule_id = ruleId;
        const fullRule: RecurrenceRule = {
          id: ruleId,
          task_id: taskData.id,
          frequency: recurrenceRule.frequency || 'daily',
          interval: recurrenceRule.interval || 1,
          weekdays: recurrenceRule.weekdays,
          month_day: recurrenceRule.month_day,
          month_week: recurrenceRule.month_week,
          month_weekday: recurrenceRule.month_weekday,
          start_date: date,
          end_type: recurrenceRule.end_type || 'never',
          until_date: recurrenceRule.until_date,
          count: recurrenceRule.count,
          time_slots: recurrenceRule.time_slots,
          created_at: now,
          updated_at: now,
        };
        insertTask(taskData);
        insertRecurrenceRule(fullRule);
      } else {
        insertTask(taskData);
      }
    }

    // Refresh notifications & UI
    resyncNotificationSchedule().catch(() => {});
    triggerRefresh();
    setSaving(false);
    router.back();
  };

  const handleDelete = () => {
    if (initialRule) {
      setScopeActionType('delete');
      setScopeModalVisible(true);
      return;
    }

    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (initialTask) {
            const taskId = (initialTask as TaskOccurrence).task_id || initialTask.id;
            deleteTask(taskId);
            resyncNotificationSchedule().catch(() => {});
            triggerRefresh();
            showUndo('Task deleted', () => {
              insertTask(initialTask as Task);
            });
            router.back();
          }
        },
      },
    ]);
  };

  const handleScopeSelect = (scope: RecurrenceEditScope) => {
    setScopeModalVisible(false);
    if (scopeActionType === 'delete' && initialTask && initialRule) {
      deleteRecurringTaskWithScope(
        scope,
        initialTask as Task,
        initialRule,
        initialTask.date
      );
      resyncNotificationSchedule().catch(() => {});
      triggerRefresh();
      router.back();
    } else {
      commitSave(scope);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets={true}
      >
        {/* Title Input */}
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Task title"
          placeholderTextColor={colors.textMuted}
          style={[styles.titleInput, { color: colors.text, borderColor: colors.border }]}
        />

        {/* Notes Input */}
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes or description..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
          style={[styles.notesInput, { color: colors.text, borderColor: colors.border }]}
        />

        {/* Date & Time block */}
        <Card style={styles.sectionCard}>
          <ThemedText variant="bodyMedium" style={styles.sectionTitle}>
            Schedule
          </ThemedText>

          {/* Date row */}
          <View style={styles.scheduleRow}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <ThemedText variant="body" style={{ marginLeft: Spacing.sm, flex: 1 }}>
              Date
            </ThemedText>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.timeInput,
                { color: colors.text, backgroundColor: colors.surfaceVariant },
              ]}
            />
          </View>

          {/* All day toggle */}
          <View style={[styles.scheduleRow, { borderTopWidth: 1, borderTopColor: colors.borderSubtle, marginTop: Spacing.sm, paddingTop: Spacing.sm }]}>
            <Ionicons name="sunny-outline" size={20} color={colors.warning} />
            <ThemedText variant="body" style={{ marginLeft: Spacing.sm, flex: 1 }}>
              All Day
            </ThemedText>
            <Switch
              value={allDay}
              onValueChange={setAllDay}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          {/* Times */}
          {!allDay && (
            <View style={[styles.scheduleRow, { borderTopWidth: 1, borderTopColor: colors.borderSubtle, marginTop: Spacing.sm, paddingTop: Spacing.sm }]}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <ThemedText variant="body" style={{ marginLeft: Spacing.sm, flex: 1 }}>
                Time Range
              </ThemedText>
              <TextInput
                value={startTime}
                onChangeText={setStartTime}
                placeholder="09:00"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.timeInput,
                  { color: colors.text, backgroundColor: colors.surfaceVariant, width: 68 },
                ]}
              />
              <ThemedText variant="caption" secondary style={{ marginHorizontal: 4 }}>
                to
              </ThemedText>
              <TextInput
                value={endTime}
                onChangeText={setEndTime}
                placeholder="10:00"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.timeInput,
                  { color: colors.text, backgroundColor: colors.surfaceVariant, width: 68 },
                ]}
              />
            </View>
          )}
        </Card>

        {/* Category Picker */}
        <Card style={styles.sectionCard}>
          <ThemedText variant="bodyMedium" style={styles.sectionTitle}>
            Category
          </ThemedText>
          <View style={styles.categoryWrap}>
            {categories.map((cat) => {
              const selected = categoryId === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategoryId(cat.id)}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor: selected ? cat.color : colors.surfaceVariant,
                      borderColor: selected ? cat.color : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={(cat.icon as any) || 'pricetag'}
                    size={14}
                    color={selected ? '#FFFFFF' : cat.color}
                  />
                  <ThemedText
                    variant="caption"
                    style={{
                      color: selected ? '#FFFFFF' : colors.text,
                      fontWeight: selected ? '700' : '500',
                      marginLeft: 4,
                    }}
                  >
                    {cat.name}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Priority Selector */}
        <Card style={styles.sectionCard}>
          <ThemedText variant="bodyMedium" style={styles.sectionTitle}>
            Priority
          </ThemedText>
          <View style={styles.priorityRow}>
            {PRIORITIES.map((p) => {
              const selected = priority === p.value;
              return (
                <Pressable
                  key={p.value}
                  onPress={() => setPriority(p.value)}
                  style={[
                    styles.priorityPill,
                    {
                      backgroundColor: selected ? p.color : colors.surfaceVariant,
                      borderColor: selected ? p.color : colors.border,
                    },
                  ]}
                >
                  <ThemedText
                    variant="caption"
                    style={{
                      color: selected ? '#FFFFFF' : colors.text,
                      fontWeight: selected ? '700' : '500',
                    }}
                  >
                    {p.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Recurrence Rule Builder */}
        <RecurrenceRulePicker
          rule={recurrenceRule}
          startDate={date}
          onChange={setRecurrenceRule}
        />

        {/* Subtasks Checklist */}
        <Card style={styles.sectionCard}>
          <View style={styles.subtaskHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="list-outline" size={18} color={colors.primary} />
              <ThemedText variant="bodyMedium" style={styles.sectionTitle}>
                Subtasks
              </ThemedText>
            </View>
            {subtasks.length > 0 && (
              <Badge
                label={`${subtasks.filter((s) => s.completed).length}/${subtasks.length} done`}
                color={
                  subtasks.every((s) => s.completed)
                    ? colors.success
                    : colors.primary
                }
                backgroundColor={
                  subtasks.every((s) => s.completed)
                    ? colors.successLight
                    : colors.primaryLight
                }
                icon={
                  <Ionicons
                    name={
                      subtasks.every((s) => s.completed)
                        ? 'checkmark-circle'
                        : 'checkbox-outline'
                    }
                    size={12}
                    color={
                      subtasks.every((s) => s.completed)
                        ? colors.success
                        : colors.primary
                    }
                  />
                }
                size="sm"
              />
            )}
          </View>

          {subtasks.map((st) => (
            <View
              key={st.id}
              style={[
                styles.subtaskCard,
                {
                  backgroundColor: st.completed
                    ? colors.surfaceVariant
                    : colors.surface,
                  borderColor: st.completed
                    ? colors.success + '40'
                    : colors.border,
                },
              ]}
            >
              <Pressable
                hitSlop={10}
                onPress={() => toggleSubtask(st.id)}
                style={[
                  styles.subtaskCheck,
                  {
                    borderColor: st.completed ? colors.success : colors.border,
                    backgroundColor: st.completed ? colors.success : 'transparent',
                  },
                ]}
              >
                {st.completed && (
                  <Ionicons name="checkmark-sharp" size={13} color="#FFFFFF" />
                )}
              </Pressable>

              <ThemedText
                variant="body"
                style={[
                  styles.subtaskTitle,
                  st.completed && {
                    textDecorationLine: 'line-through',
                    color: colors.textSecondary,
                  },
                ]}
                numberOfLines={2}
              >
                {st.title}
              </ThemedText>

              <Pressable
                onPress={() => removeSubtask(st.id)}
                hitSlop={10}
                style={styles.subtaskDeleteBtn}
              >
                <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}

          {/* Add Subtask Input Row */}
          <View style={styles.addSubtaskRow}>
            <TextInput
              ref={subtaskInputRef}
              value={newSubtaskTitle}
              onChangeText={setNewSubtaskTitle}
              placeholder="Add a subtask..."
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
              onSubmitEditing={addSubtask}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 200);
              }}
              style={[
                styles.subtaskInput,
                {
                  color: colors.text,
                  backgroundColor: colors.surfaceVariant,
                  borderColor: colors.border,
                },
              ]}
            />
            <Button
              title="Add"
              onPress={addSubtask}
              variant="secondary"
              size="sm"
              disabled={!newSubtaskTitle.trim()}
            />
          </View>
        </Card>

        {/* Reminders Selection */}
        <Card style={styles.sectionCard}>
          <ThemedText variant="bodyMedium" style={styles.sectionTitle}>
            Reminders
          </ThemedText>
          <View style={styles.remindersWrap}>
            {REMINDER_OPTIONS.map((opt) => {
              const active = reminders.includes(opt.value);
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => toggleReminder(opt.value)}
                  style={[
                    styles.reminderPill,
                    {
                      backgroundColor: active ? colors.primary : colors.surfaceVariant,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={active ? 'notifications' : 'notifications-outline'}
                    size={14}
                    color={active ? '#FFFFFF' : colors.text}
                  />
                  <ThemedText
                    variant="caption"
                    style={{
                      color: active ? '#FFFFFF' : colors.text,
                      fontWeight: active ? '700' : '500',
                      marginLeft: 4,
                    }}
                  >
                    {opt.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <Button
            title={isEditing ? 'Save Changes' : 'Create Task'}
            onPress={handleSave}
            loading={saving}
            size="lg"
            style={{ flex: 1 }}
          />

          {isEditing && (
            <Button
              title="Delete"
              onPress={handleDelete}
              variant="danger"
              size="lg"
              style={{ marginLeft: Spacing.md }}
            />
          )}
        </View>
      </ScrollView>

      {/* Scope modal for recurring tasks */}
      <ScopeModal
        visible={scopeModalVisible}
        actionType={scopeActionType}
        onSelectScope={handleScopeSelect}
        onCancel={() => setScopeModalVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 220,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: '700',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    marginBottom: Spacing.md,
  },
  notesInput: {
    fontSize: 14,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    marginBottom: Spacing.lg,
    minHeight: 60,
  },
  sectionCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.sm,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  priorityPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  subtaskHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  subtaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  subtaskCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  subtaskTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  subtaskDeleteBtn: {
    padding: 4,
    marginLeft: Spacing.sm,
  },
  addSubtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  subtaskInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    fontSize: 14,
    borderWidth: 1,
  },
  remindersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  reminderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
  },
});
