import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isSameMonth,
  isSameDay,
} from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText, Card, EmptyState, Button } from '@/components/ui';
import { TaskItem } from '@/components/TaskItem';
import { ScopeModal } from '@/components/ScopeModal';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTaskStore } from '@/store/useTaskStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import {
  loadOccurrencesForRange,
  loadOccurrencesForDate,
  toggleTaskOccurrence,
  deleteRecurringTaskWithScope,
} from '@/services/taskService';
import { deleteTask, getTaskById, insertTask } from '@/db/tasks';
import { TaskOccurrence, RecurrenceEditScope } from '@/types';
import { Spacing, BorderRadius } from '@/theme';
import { resyncNotificationSchedule } from '@/services/notifications';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function CalendarScreen() {
  const { colors } = useAppTheme();
  const weekStartDay = useSettingsStore((s) => s.settings.week_start_day); // 1 = Monday
  const refreshKey = useTaskStore((s) => s.refreshKey);
  const triggerRefresh = useTaskStore((s) => s.triggerRefresh);
  const showUndo = useTaskStore((s) => s.showUndo);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isWeekView, setIsWeekView] = useState(false);

  // Scope modal
  const [scopeModalVisible, setScopeModalVisible] = useState(false);
  const [targetOccurrence, setTargetOccurrence] = useState<TaskOccurrence | null>(null);

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  // Calculate calendar grid days
  const calendarDays = useMemo(() => {
    if (isWeekView) {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: weekStartDay });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: weekStartDay });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: weekStartDay });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: weekStartDay });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate, isWeekView, weekStartDay]);

  // Load occurrences for the visible calendar grid range
  const visibleOccurrences = useMemo(() => {
    if (calendarDays.length === 0) return [];
    const startStr = format(calendarDays[0], 'yyyy-MM-dd');
    const endStr = format(calendarDays[calendarDays.length - 1], 'yyyy-MM-dd');
    return loadOccurrencesForRange(startStr, endStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarDays, refreshKey]);

  // Index task occurrences by date
  const occurrencesByDate = useMemo(() => {
    const map = new Map<string, TaskOccurrence[]>();
    for (const occ of visibleOccurrences) {
      const list = map.get(occ.date) || [];
      list.push(occ);
      map.set(occ.date, list);
    }
    return map;
  }, [visibleOccurrences]);

  // Selected day's occurrences
  const selectedDayTasks = useMemo(() => {
    return loadOccurrencesForDate(selectedDateStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDateStr, refreshKey]);

  // Navigation handlers
  const handlePrev = () => {
    setCurrentDate((prev) => (isWeekView ? subWeeks(prev, 1) : subMonths(prev, 1)));
  };

  const handleNext = () => {
    setCurrentDate((prev) => (isWeekView ? addWeeks(prev, 1) : addMonths(prev, 1)));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const handleToggleComplete = (occ: TaskOccurrence) => {
    const task = getTaskById(occ.task_id);
    if (!task) return;
    toggleTaskOccurrence(task, occ.date, occ.status);
    triggerRefresh();
    resyncNotificationSchedule().catch(() => {});
  };

  const handleTaskPress = (occ: TaskOccurrence) => {
    router.push(`/task/${occ.task_id}`);
  };

  const handleDeletePress = (occ: TaskOccurrence) => {
    if (occ.is_recurring && occ.recurrence_rule) {
      setTargetOccurrence(occ);
      setScopeModalVisible(true);
    } else {
      const task = getTaskById(occ.task_id);
      if (task) {
        deleteTask(task.id);
        triggerRefresh();
        resyncNotificationSchedule().catch(() => {});
        showUndo('Task deleted', () => {
          insertTask(task);
          triggerRefresh();
          resyncNotificationSchedule().catch(() => {});
        });
      }
    }
  };

  const handleScopeSelect = (scope: RecurrenceEditScope) => {
    setScopeModalVisible(false);
    if (targetOccurrence && targetOccurrence.recurrence_rule) {
      const task = getTaskById(targetOccurrence.task_id);
      if (task) {
        deleteRecurringTaskWithScope(
          scope,
          task,
          targetOccurrence.recurrence_rule,
          targetOccurrence.date
        );
        triggerRefresh();
        resyncNotificationSchedule().catch(() => {});
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <ThemedText variant="h1">
              {format(currentDate, isWeekView ? 'MMM yyyy' : 'MMMM yyyy')}
            </ThemedText>
            <ThemedText variant="caption" secondary>
              {isWeekView ? 'Week view' : 'Month view'}
            </ThemedText>
          </View>

          <View style={styles.headerRight}>
            <Pressable
              onPress={() => setIsWeekView(!isWeekView)}
              style={[styles.toggleBtn, { backgroundColor: colors.surfaceVariant }]}
            >
              <ThemedText variant="caption" style={{ fontWeight: '700', color: colors.primary }}>
                {isWeekView ? 'Month' : 'Week'}
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={handleToday}
              style={[styles.toggleBtn, { backgroundColor: colors.surfaceVariant }]}
            >
              <ThemedText variant="caption" style={{ fontWeight: '700', color: colors.text }}>
                Today
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Month/Week Navigation bar */}
        <View style={styles.navBar}>
          <Pressable onPress={handlePrev} style={styles.navArrow} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <ThemedText variant="bodyMedium" style={{ fontWeight: '700' }}>
            {format(currentDate, isWeekView ? "'Week of' d MMM" : 'MMMM yyyy')}
          </ThemedText>
          <Pressable onPress={handleNext} style={styles.navArrow} hitSlop={10}>
            <Ionicons name="chevron-forward" size={22} color={colors.text} />
          </Pressable>
        </View>

        {/* Calendar Card */}
        <Card style={styles.calendarCard}>
          {/* Weekday headers */}
          <View style={styles.weekdaysRow}>
            {WEEKDAYS.map((w, idx) => (
              <ThemedText
                key={idx}
                variant="caption"
                secondary
                style={styles.weekdayLabel}
              >
                {w}
              </ThemedText>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.grid}>
            {calendarDays.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, currentDate);
              const dayTasks = occurrencesByDate.get(dayStr) || [];
              const hasTasks = dayTasks.length > 0;
              const allDone = hasTasks && dayTasks.every((t) => t.status === 'done');

              return (
                <Pressable
                  key={dayStr}
                  onPress={() => {
                    setSelectedDate(day);
                    if (!isSameMonth(day, currentDate) && !isWeekView) {
                      setCurrentDate(day);
                    }
                  }}
                  style={[
                    styles.dayCell,
                    isSelected && { backgroundColor: colors.primary },
                  ]}
                >
                  <ThemedText
                    variant="bodyMedium"
                    style={[
                      styles.dayNumber,
                      isSelected && { color: '#FFFFFF', fontWeight: '700' },
                      !isSelected && isToday && { color: colors.primary, fontWeight: '700' },
                      !isSelected && !isCurrentMonth && { color: colors.textMuted },
                    ]}
                  >
                    {format(day, 'd')}
                  </ThemedText>

                  {/* Task Indicator Dots */}
                  <View style={styles.dotsRow}>
                    {hasTasks && (
                      <View
                        style={[
                          styles.dot,
                          {
                            backgroundColor: isSelected
                              ? '#FFFFFF'
                              : allDone
                              ? colors.success
                              : colors.primary,
                          },
                        ]}
                      />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Selected Day Agenda */}
        <View style={styles.agendaHeader}>
          <View>
            <ThemedText variant="h2">
              {format(selectedDate, 'EEEE, d MMMM')}
            </ThemedText>
            <ThemedText variant="caption" secondary>
              {selectedDayTasks.length} task{selectedDayTasks.length === 1 ? '' : 's'} scheduled
            </ThemedText>
          </View>

          <Button
            title="+ Add Task"
            onPress={() => router.push('/task/new')}
            variant="secondary"
            size="sm"
          />
        </View>

        {/* Tasks List */}
        {selectedDayTasks.length > 0 ? (
          selectedDayTasks.map((occ) => (
            <TaskItem
              key={occ.id}
              occurrence={occ}
              onToggleComplete={handleToggleComplete}
              onPress={handleTaskPress}
              onDelete={handleDeletePress}
            />
          ))
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="No Tasks for this Day"
            description="Plan your day by adding time blocks and to-dos."
            actionTitle="Add Task for This Date"
            onAction={() => router.push('/task/new')}
            style={{ marginTop: Spacing.lg }}
          />
        )}
      </ScrollView>

      {/* Scope modal */}
      <ScopeModal
        visible={scopeModalVisible}
        actionType="delete"
        onSelectScope={handleScopeSelect}
        onCancel={() => setScopeModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerRight: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  toggleBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  navArrow: {
    padding: 6,
  },
  calendarCard: {
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.sm,
  },
  weekdayLabel: {
    width: 38,
    textAlign: 'center',
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayCell: {
    width: 42,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dayNumber: {
    fontSize: 14,
  },
  dotsRow: {
    flexDirection: 'row',
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  agendaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
});
