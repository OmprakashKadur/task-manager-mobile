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
import * as Haptics from 'expo-haptics';
import {
  ThemedText,
  Card,
  EmptyState,
  Button,
  IconButton,
  SegmentedControl,
  SectionHeader,
} from '@/components/ui';
import { TaskItem } from '@/components/TaskItem';
import { ScopeModal } from '@/components/ScopeModal';
import { useTheme } from '@/hooks/useTheme';
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
  const { colors, isDark } = useTheme();
  const weekStartDay = useSettingsStore((s) => s.settings.week_start_day); // 1 = Monday
  const hapticsEnabled = useSettingsStore((s) => s.settings.haptics_enabled);
  const refreshKey = useTaskStore((s) => s.refreshKey);
  const triggerRefresh = useTaskStore((s) => s.triggerRefresh);
  const showUndo = useTaskStore((s) => s.showUndo);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Scope modal
  const [scopeModalVisible, setScopeModalVisible] = useState(false);
  const [targetOccurrence, setTargetOccurrence] = useState<TaskOccurrence | null>(null);

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const isWeekView = viewMode === 'week';

  // Calculate calendar grid days
  const calendarDays = useMemo(() => {
    if (isWeekView) {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: (weekStartDay as any) === 0 ? 0 : 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: (weekStartDay as any) === 0 ? 0 : 1 });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: (weekStartDay as any) === 0 ? 0 : 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: (weekStartDay as any) === 0 ? 0 : 1 });

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
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setCurrentDate((prev) => (isWeekView ? subWeeks(prev, 1) : subMonths(prev, 1)));
  };

  const handleNext = () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setCurrentDate((prev) => (isWeekView ? addWeeks(prev, 1) : addMonths(prev, 1)));
  };

  const handleToday = () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
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

    if (occ.status === 'pending') {
      showUndo('Task completed', () => {
        toggleTaskOccurrence(task, occ.date, 'done');
        triggerRefresh();
        resyncNotificationSchedule().catch(() => {});
      });
    }
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
          <View style={styles.headerTitleArea}>
            <ThemedText variant="display" style={styles.monthTitle}>
              {format(currentDate, 'MMMM yyyy')}
            </ThemedText>
            <ThemedText variant="caption" secondary>
              Tap any date to inspect its agenda
            </ThemedText>
          </View>

          <View style={styles.headerActions}>
            <SegmentedControl
              options={[
                { label: 'Month', value: 'month' },
                { label: 'Week', value: 'week' },
              ]}
              value={viewMode}
              onChange={(v) => setViewMode(v as 'month' | 'week')}
              style={styles.segmentedControl}
            />
            <Button
              title="Today"
              variant="secondary"
              size="sm"
              onPress={handleToday}
              style={styles.todayButton}
            />
          </View>
        </View>

        {/* Month Navigation Control */}
        <View style={styles.navBar}>
          <IconButton
            icon={<Ionicons name="chevron-back" size={20} color={colors.textPrimary} />}
            onPress={handlePrev}
            accessibilityLabel="Previous period"
            size={36}
          />

          <ThemedText variant="heading" style={styles.navTitle}>
            {format(currentDate, isWeekView ? "'Week of' d MMM" : 'MMMM yyyy')}
          </ThemedText>

          <IconButton
            icon={<Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />}
            onPress={handleNext}
            accessibilityLabel="Next period"
            size={36}
          />
        </View>

        {/* Calendar Card */}
        <Card style={styles.calendarCard} elevated>
          {/* Weekday headers */}
          <View style={styles.weekdaysRow}>
            {WEEKDAYS.map((w, idx) => (
              <ThemedText
                key={idx}
                variant="micro"
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

              // Collect unique category colors for up to 3 dots
              const categoryColors = Array.from(
                new Set(dayTasks.map((t) => t.category?.color).filter(Boolean))
              ).slice(0, 3) as string[];

              return (
                <Pressable
                  key={dayStr}
                  onPress={() => {
                    if (hapticsEnabled) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    }
                    setSelectedDate(day);
                    if (!isSameMonth(day, currentDate) && !isWeekView) {
                      setCurrentDate(day);
                    }
                  }}
                  style={[
                    styles.dayCell,
                    isSelected && {
                      backgroundColor: colors.accent,
                    },
                    !isSelected && isToday && {
                      borderColor: colors.accent,
                      borderWidth: 1.5,
                      backgroundColor: isDark ? 'rgba(129, 140, 248, 0.08)' : colors.accentSoft,
                    },
                  ]}
                >
                  <ThemedText
                    variant="bodyMedium"
                    tabular
                    style={[
                      styles.dayNumber,
                      isSelected && { color: '#FFFFFF', fontWeight: '800' },
                      !isSelected && isToday && { color: colors.accent, fontWeight: '800' },
                      !isSelected && !isCurrentMonth && { color: colors.textTertiary, opacity: 0.5 },
                    ]}
                  >
                    {format(day, 'd')}
                  </ThemedText>

                  {/* Category-colored indicator dots */}
                  <View style={styles.dotsRow}>
                    {hasTasks &&
                      (categoryColors.length > 0 ? (
                        categoryColors.map((dotColor, idx) => (
                          <View
                            key={idx}
                            style={[
                              styles.dot,
                              {
                                backgroundColor: isSelected
                                  ? '#FFFFFF'
                                  : allDone
                                  ? colors.success
                                  : dotColor,
                              },
                            ]}
                          />
                        ))
                      ) : (
                        <View
                          style={[
                            styles.dot,
                            {
                              backgroundColor: isSelected
                                ? '#FFFFFF'
                                : allDone
                                ? colors.success
                                : colors.accent,
                            },
                          ]}
                        />
                      ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Selected Day Agenda Header */}
        <SectionHeader
          title={format(selectedDate, 'EEEE, d MMMM')}
          count={selectedDayTasks.length}
          actionTitle="+ Add Task"
          onAction={() => router.push('/task/new')}
          style={styles.agendaHeader}
        />

        {/* Selected Day's Task List */}
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
            title="No Tasks for this Date"
            description="Keep your days organized by scheduling tasks, time blocks, or habits."
            actionTitle="Add Task for This Date"
            onAction={() => router.push('/task/new')}
            style={styles.emptyContainer}
          />
        )}
      </ScrollView>

      {/* Recurrence Scope modal */}
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
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: 110,
  },
  header: {
    marginBottom: Spacing.base,
  },
  headerTitleArea: {
    marginBottom: Spacing.sm,
  },
  monthTitle: {
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  segmentedControl: {
    flex: 1,
  },
  todayButton: {
    minHeight: 40,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  navTitle: {
    fontWeight: '700',
  },
  calendarCard: {
    padding: Spacing.base,
    marginBottom: Spacing.lg,
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
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayCell: {
    width: 44,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dayNumber: {
    fontSize: 15,
  },
  dotsRow: {
    flexDirection: 'row',
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    gap: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  agendaHeader: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  emptyContainer: {
    marginTop: Spacing.md,
  },
});
