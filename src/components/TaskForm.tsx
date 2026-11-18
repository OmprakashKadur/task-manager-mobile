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
import { format, addDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import {
  ThemedText,
  Card,
  Button,
  Badge,
  Chip,
  SectionHeader,
} from '@/components/ui';
import { RecurrenceRulePicker } from './RecurrenceRulePicker';
import { ScopeModal } from './ScopeModal';
import { useTheme } from '@/hooks/useTheme';
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
  updateRecurrenceRule,
  deleteRecurrenceRule,
  deleteExceptionsFollowing,
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
  { label: 'Low', value: 'low', color: '#059669' },
  { label: 'Medium', value: 'medium', color: '#D97706' },
  { label: 'High', value: 'high', color: '#E11D48' },
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
  const { colors, isDark } = useTheme();
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

  // Quick date chips
  const quickDates = [
    { label: 'Today', value: format(new Date(), 'yyyy-MM-dd') },
    { label: 'Tomorrow', value: format(addDays(new Date(), 1), 'yyyy-MM-dd') },
    { label: 'This Weekend', value: format(addDays(new Date(), (6 - new Date().getDay() + 7) % 7 || 7), 'yyyy-MM-dd') },
    { label: 'Next Week', value: format(addDays(new Date(), 7), 'yyyy-MM-dd') },
  ];

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
      recurrence_rule_id: undefined,
      created_at: createdAt,
      updated_at: now,
    };

    if (isEditing) {
      if (initialRule && !recurrenceRule) {
        // User removed recurrence from an existing recurring task
        taskData.recurrence_rule_id = undefined;
        updateTask(taskData);
        deleteRecurrenceRule(initialRule.id);
        deleteExceptionsFollowing(taskData.id, '1970-01-01');
      } else if (!initialRule && recurrenceRule) {
        // User added repeat to an existing single-day task
        const ruleId = generateId();
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
        // 1. Insert rule first to satisfy FOREIGN KEY constraint
        insertRecurrenceRule(fullRule);
        // 2. Update task with recurrence_rule_id
        taskData.recurrence_rule_id = ruleId;
        updateTask(taskData);
      } else if (initialRule && recurrenceRule) {
        // User updated existing recurring task
        const updatedRule: RecurrenceRule = {
          ...initialRule,
          frequency: recurrenceRule.frequency || initialRule.frequency,
          interval: recurrenceRule.interval || initialRule.interval,
          weekdays: recurrenceRule.weekdays,
          month_day: recurrenceRule.month_day,
          month_week: recurrenceRule.month_week,
          month_weekday: recurrenceRule.month_weekday,
          start_date: date,
          end_type: recurrenceRule.end_type || initialRule.end_type,
          until_date: recurrenceRule.until_date,
          count: recurrenceRule.count,
          time_slots: recurrenceRule.time_slots,
          updated_at: now,
        };

        if (scope) {
          editRecurringTaskWithScope(
            scope,
            taskData,
            initialRule,
            initialTask!.date,
            taskData,
            updatedRule
          );
        } else {
          taskData.recurrence_rule_id = initialRule.id;
          updateTask(taskData);
          updateRecurrenceRule(updatedRule);
        }
      } else {
        // Normal single-day task update
        taskData.recurrence_rule_id = undefined;
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
        // 1. Insert recurrence rule FIRST so FOREIGN KEY constraint is met
        insertRecurrenceRule(fullRule);
        // 2. Insert task referencing the existing rule
        insertTask(taskData);
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
        {/* Large Confident Title Input */}
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="What do you want to accomplish?"
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.titleInput,
            {
              color: colors.textPrimary,
              borderBottomColor: colors.borderSubtle,
            },
          ]}
        />

        {/* Notes Input */}
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes, location, or details..."
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={3}
          style={[
            styles.notesInput,
            {
              color: colors.textPrimary,
              borderBottomColor: colors.borderSubtle,
            },
          ]}
        />

        {/* Quick Date Chips */}
        <View style={styles.quickDatesSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickDatesRow}
          >
            {quickDates.map((qd) => {
              const active = date === qd.value;
              return (
                <Chip
                  key={qd.label}
                  label={qd.label}
                  selected={active}
                  onPress={() => setDate(qd.value)}
                  size="sm"
                  style={styles.quickDateChip}
                />
              );
            })}
          </ScrollView>
        </View>

        {/* Date & Time block */}
        <Card style={styles.sectionCard} elevated>
          <SectionHeader title="Schedule" icon="calendar-outline" />

          {/* Date row */}
          <View style={styles.scheduleRow}>
            <Ionicons name="calendar-outline" size={18} color={colors.accent} />
            <ThemedText variant="body" style={{ marginLeft: Spacing.sm, flex: 1 }}>
              Date
            </ThemedText>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.timeInput,
                {
                  color: colors.textPrimary,
                  backgroundColor: colors.surfaceVariant,
                },
              ]}
            />
          </View>

          {/* All day toggle */}
          <View style={[styles.scheduleRow, { borderTopWidth: 1, borderTopColor: colors.borderSubtle, marginTop: Spacing.sm, paddingTop: Spacing.sm }]}>
            <Ionicons name="sunny-outline" size={18} color={colors.warning} />
            <ThemedText variant="body" style={{ marginLeft: Spacing.sm, flex: 1 }}>
              All Day
            </ThemedText>
            <Switch
              value={allDay}
              onValueChange={setAllDay}
              trackColor={{ false: colors.border, true: colors.accent }}
            />
          </View>

          {/* Times */}
          {!allDay && (
            <View style={[styles.scheduleRow, { borderTopWidth: 1, borderTopColor: colors.borderSubtle, marginTop: Spacing.sm, paddingTop: Spacing.sm }]}>
              <Ionicons name="time-outline" size={18} color={colors.accent} />
              <ThemedText variant="body" style={{ marginLeft: Spacing.sm, flex: 1 }}>
                Time Range
              </ThemedText>
              <TextInput
                value={startTime}
                onChangeText={setStartTime}
                placeholder="09:00"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.timeInput,
                  {
                    color: colors.textPrimary,
                    backgroundColor: colors.surfaceVariant,
                    width: 72,
                  },
                ]}
              />
              <ThemedText variant="caption" secondary style={{ marginHorizontal: 6 }}>
                to
              </ThemedText>
              <TextInput
                value={endTime}
                onChangeText={setEndTime}
                placeholder="10:00"
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.timeInput,
                  {
                    color: colors.textPrimary,
                    backgroundColor: colors.surfaceVariant,
                    width: 72,
                  },
                ]}
              />
            </View>
          )}
        </Card>

        {/* Category Picker */}
        <Card style={styles.sectionCard} elevated>
          <SectionHeader title="Category" icon="pricetag-outline" />
          <View style={styles.categoryWrap}>
            {categories.map((cat) => {
              const selected = categoryId === cat.id;
              return (
                <Chip
                  key={cat.id}
                  label={cat.name}
                  selected={selected}
                  color={cat.color}
                  icon={
                    <Ionicons
                      name={(cat.icon as any) || 'pricetag'}
                      size={14}
                      color={selected ? '#FFFFFF' : cat.color}
                    />
                  }
                  onPress={() => setCategoryId(cat.id)}
                />
              );
            })}
          </View>
        </Card>

        {/* Priority Selector */}
        <Card style={styles.sectionCard} elevated>
          <SectionHeader title="Priority" icon="flag-outline" />
          <View style={styles.priorityRow}>
            {PRIORITIES.map((p) => {
              const selected = priority === p.value;
              return (
                <Chip
                  key={p.value}
                  label={p.label}
                  selected={selected}
                  color={p.color}
                  icon={
                    <Ionicons
                      name="flag"
                      size={13}
                      color={selected ? '#FFFFFF' : p.color}
                    />
                  }
                  onPress={() => setPriority(p.value)}
                  style={{ flex: 1 }}
                />
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
        <Card style={styles.sectionCard} elevated>
          <View style={styles.subtaskHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="list-outline" size={18} color={colors.accent} />
              <ThemedText variant="subheading" style={styles.sectionTitle}>
                Subtasks
              </ThemedText>
            </View>
            {subtasks.length > 0 && (
              <Badge
                label={`${subtasks.filter((s) => s.completed).length}/${subtasks.length} done`}
                color={
                  subtasks.every((s) => s.completed)
                    ? colors.success
                    : colors.accent
                }
                backgroundColor={
                  subtasks.every((s) => s.completed)
                    ? colors.successSoft
                    : colors.accentSoft
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
                        : colors.accent
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
                    : isDark
                    ? colors.border
                    : colors.borderSubtle,
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
                <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
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
              placeholderTextColor={colors.textTertiary}
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
                  color: colors.textPrimary,
                  backgroundColor: colors.surfaceVariant,
                  borderColor: colors.borderSubtle,
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
        <Card style={styles.sectionCard} elevated>
          <SectionHeader title="Reminders" icon="notifications-outline" />
          <View style={styles.remindersWrap}>
            {REMINDER_OPTIONS.map((opt) => {
              const active = reminders.includes(opt.value);
              return (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={active}
                  onPress={() => toggleReminder(opt.value)}
                  icon={
                    <Ionicons
                      name={active ? 'notifications' : 'notifications-outline'}
                      size={13}
                      color={active ? '#FFFFFF' : colors.textSecondary}
                    />
                  }
                />
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
              variant="destructive"
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
    padding: Spacing.base,
    paddingBottom: 220,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: '700',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    marginBottom: Spacing.xs,
  },
  notesInput: {
    fontSize: 15,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    marginBottom: Spacing.md,
    minHeight: 52,
  },
  quickDatesSection: {
    marginBottom: Spacing.md,
  },
  quickDatesRow: {
    gap: Spacing.xs,
  },
  quickDateChip: {
    marginRight: 6,
  },
  sectionCard: {
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
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
    paddingVertical: 9,
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
  actionsContainer: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
  },
});
