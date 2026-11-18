import React, { useMemo, useState, useEffect } from 'react';
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
  startOfWeek,
  addDays,
  parseISO,
} from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  ThemedText,
  ProgressRing,
  EmptyState,
  Card,
  Chip,
  TextField,
  SectionHeader,
  ConfettiOverlay,
} from '@/components/ui';
import { TaskItem } from '@/components/TaskItem';
import { ScopeModal } from '@/components/ScopeModal';
import { useTheme } from '@/hooks/useTheme';
import { useTaskStore } from '@/store/useTaskStore';
import { useCategoryStore } from '@/store/useCategoryStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import {
  loadOccurrencesForDate,
  toggleTaskOccurrence,
  deleteRecurringTaskWithScope,
} from '@/services/taskService';
import { deleteTask, getTaskById, insertTask } from '@/db/tasks';
import { TaskOccurrence, RecurrenceEditScope, TaskTimePeriod } from '@/types';
import { Spacing, BorderRadius } from '@/theme';
import { getTodayLocalDate } from '@/services/recurrence/dateUtils';
import { resyncNotificationSchedule } from '@/services/notifications';

export default function TodayScreen() {
  const { colors, isDark, shadows } = useTheme();
  const userName = useSettingsStore((s) => s.settings.user_name);
  const hapticsEnabled = useSettingsStore((s) => s.settings.haptics_enabled);
  const weekStartDay = useSettingsStore((s) => s.settings.week_start_day); // 1 = Monday, 0 = Sunday
  const categories = useCategoryStore((s) => s.categories);

  const refreshKey = useTaskStore((s) => s.refreshKey);
  const triggerRefresh = useTaskStore((s) => s.triggerRefresh);
  const showUndo = useTaskStore((s) => s.showUndo);

  const todayStr = useMemo(() => getTodayLocalDate(), []);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);

  // Section collapse states
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    overdue: false,
    morning: false,
    afternoon: false,
    evening: false,
    anytime: false,
  });

  // Scope modal state
  const [scopeModalVisible, setScopeModalVisible] = useState(false);
  const [targetOccurrence, setTargetOccurrence] = useState<TaskOccurrence | null>(null);

  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);

  const isViewingToday = selectedDateStr === todayStr;

  // Personalized Greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    let timeGreeting = 'Good morning';
    if (hour >= 12 && hour < 17) {
      timeGreeting = 'Good afternoon';
    } else if (hour >= 17) {
      timeGreeting = 'Good evening';
    }
    return userName ? `${timeGreeting}, ${userName}` : timeGreeting;
  }, [userName]);

  // Formatted date string
  const formattedHeaderDate = useMemo(() => {
    try {
      const d = parseISO(selectedDateStr);
      return format(d, 'EEEE, d MMMM');
    } catch {
      return format(new Date(), 'EEEE, d MMMM');
    }
  }, [selectedDateStr]);

  // Generate 7-day horizontal strip for the current week
  const weekDays = useMemo(() => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: (weekStartDay as any) === 0 ? 0 : 1 });
    return Array.from({ length: 7 }, (_, i) => {
      const dayDate = addDays(start, i);
      const dayStr = format(dayDate, 'yyyy-MM-dd');
      const dayOccurrences = loadOccurrencesForDate(dayStr);
      return {
        date: dayDate,
        dateStr: dayStr,
        dayName: format(dayDate, 'EEE'),
        dayNumber: format(dayDate, 'd'),
        isToday: dayStr === todayStr,
        isSelected: dayStr === selectedDateStr,
        hasTasks: dayOccurrences.length > 0,
        allDone:
          dayOccurrences.length > 0 &&
          dayOccurrences.every((o) => o.status === 'done'),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartDay, todayStr, selectedDateStr, refreshKey]);

  // Load occurrences for selected date
  const allOccurrences = useMemo(() => {
    return loadOccurrencesForDate(selectedDateStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDateStr, refreshKey]);

  // Filtered occurrences
  const filteredOccurrences = useMemo(() => {
    return allOccurrences.filter((occ) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = occ.title.toLowerCase().includes(query);
        const matchesNotes = occ.notes?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesNotes) return false;
      }

      if (selectedCategory && occ.category_id !== selectedCategory) {
        return false;
      }

      if (selectedPriority && occ.priority !== selectedPriority) {
        return false;
      }

      return true;
    });
  }, [allOccurrences, searchQuery, selectedCategory, selectedPriority]);

  // Metrics
  const totalTasks = allOccurrences.length;
  const completedTasks = allOccurrences.filter((o) => o.status === 'done').length;
  const progressRatio = totalTasks > 0 ? completedTasks / totalTasks : 0;
  const allCompleted = totalTasks > 0 && completedTasks === totalTasks;

  // Trigger celebration micro-animation when all tasks are finished
  useEffect(() => {
    if (allCompleted && isViewingToday) {
      const startTimer = setTimeout(() => {
        setShowCelebration(true);
      }, 50);
      const stopTimer = setTimeout(() => {
        setShowCelebration(false);
      }, 3050);
      return () => {
        clearTimeout(startTimer);
        clearTimeout(stopTimer);
      };
    }
  }, [allCompleted, isViewingToday]);

  // Groupings
  const overdueTasks = useMemo(() => {
    return filteredOccurrences.filter((o) => o.is_overdue && o.status !== 'done');
  }, [filteredOccurrences]);

  const regularTasks = useMemo(() => {
    return filteredOccurrences.filter((o) => !o.is_overdue || o.status === 'done');
  }, [filteredOccurrences]);

  const groupedTasks: Record<TaskTimePeriod, TaskOccurrence[]> = useMemo(() => {
    return {
      morning: regularTasks.filter((o) => o.time_period === 'morning'),
      afternoon: regularTasks.filter((o) => o.time_period === 'afternoon'),
      evening: regularTasks.filter((o) => o.time_period === 'evening'),
      anytime: regularTasks.filter((o) => o.time_period === 'anytime'),
    };
  }, [regularTasks]);

  // Handlers
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

  const toggleSectionCollapse = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderTaskGroup = (
    title: string,
    key: string,
    icon: string,
    tasks: TaskOccurrence[]
  ) => {
    if (tasks.length === 0) return null;
    const isCollapsed = Boolean(collapsedSections[key]);

    return (
      <View style={styles.groupContainer}>
        <SectionHeader
          title={title}
          icon={icon}
          count={tasks.length}
          collapsible
          collapsed={isCollapsed}
          onToggleCollapse={() => toggleSectionCollapse(key)}
        />

        {!isCollapsed &&
          tasks.map((occ) => (
            <TaskItem
              key={occ.id}
              occurrence={occ}
              onToggleComplete={handleToggleComplete}
              onPress={handleTaskPress}
              onDelete={handleDeletePress}
            />
          ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ConfettiOverlay visible={showCelebration} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Greeting Header */}
        <View style={styles.header}>
          <View style={styles.greetingArea}>
            <ThemedText variant="micro" secondary style={styles.dateLabel}>
              {formattedHeaderDate}
            </ThemedText>
            <ThemedText variant="display" style={styles.greetingTitle}>
              {greeting}
            </ThemedText>
            <ThemedText variant="body" secondary style={styles.motivatingText}>
              {totalTasks === 0
                ? 'No tasks scheduled — enjoy your free time!'
                : allCompleted
                ? 'All tasks completed — stellar work today! 🌟'
                : `You have ${totalTasks - completedTasks} of ${totalTasks} tasks remaining.`}
            </ThemedText>
          </View>
        </View>

        {/* Hero Progress Card */}
        {totalTasks > 0 && (
          <Card style={styles.heroCard} elevated>
            <View style={styles.heroRow}>
              <View style={styles.heroStats}>
                <ThemedText variant="micro" secondary style={styles.heroSubtitle}>
                  DAILY PROGRESS
                </ThemedText>
                <ThemedText variant="title" tabular style={styles.heroTitle}>
                  {completedTasks} of {totalTasks} done
                </ThemedText>
                <ThemedText variant="caption" secondary style={styles.heroMessage}>
                  {allCompleted
                    ? '100% finished — you reached your daily goal!'
                    : `${Math.round(progressRatio * 100)}% complete. Keep the momentum going!`}
                </ThemedText>
              </View>

              <ProgressRing
                size={88}
                strokeWidth={9}
                progress={progressRatio}
                completed={completedTasks}
                total={totalTasks}
                color={colors.accent}
              />
            </View>
          </Card>
        )}

        {/* 7-Day Current Week Horizontal Strip */}
        <View style={styles.weekStripWrapper}>
          <View style={styles.weekStripHeader}>
            <ThemedText variant="caption" secondary style={{ fontWeight: '600' }}>
              THIS WEEK
            </ThemedText>
            {!isViewingToday && (
              <Pressable
                onPress={() => setSelectedDateStr(todayStr)}
                hitSlop={8}
                style={styles.todayReturnBtn}
              >
                <ThemedText
                  variant="micro"
                  style={{ color: colors.accent, fontWeight: '700' }}
                >
                  Return to Today
                </ThemedText>
              </Pressable>
            )}
          </View>

          <View style={styles.weekStrip}>
            {weekDays.map((item) => {
              const isSelected = item.isSelected;
              return (
                <Pressable
                  key={item.dateStr}
                  onPress={() => {
                    if (hapticsEnabled) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    }
                    setSelectedDateStr(item.dateStr);
                  }}
                  style={[
                    styles.weekDayPill,
                    {
                      backgroundColor: isSelected
                        ? colors.accent
                        : item.isToday
                        ? colors.accentSoft
                        : isDark
                        ? colors.surface
                        : colors.surface,
                      borderColor: isSelected
                        ? colors.accent
                        : item.isToday
                        ? colors.accent
                        : isDark
                        ? colors.border
                        : colors.borderSubtle,
                    },
                  ]}
                >
                  <ThemedText
                    variant="micro"
                    style={[
                      styles.weekDayName,
                      {
                        color: isSelected
                          ? '#FFFFFF'
                          : item.isToday
                          ? colors.accent
                          : colors.textSecondary,
                        fontWeight: isSelected || item.isToday ? '700' : '500',
                      },
                    ]}
                  >
                    {item.dayName}
                  </ThemedText>
                  <ThemedText
                    variant="subheading"
                    tabular
                    style={[
                      styles.weekDayNumber,
                      {
                        color: isSelected
                          ? '#FFFFFF'
                          : item.isToday
                          ? colors.accent
                          : colors.textPrimary,
                        fontWeight: isSelected || item.isToday ? '800' : '600',
                      },
                    ]}
                  >
                    {item.dayNumber}
                  </ThemedText>

                  {/* Task Indicator Dot */}
                  <View
                    style={[
                      styles.taskDot,
                      {
                        backgroundColor: isSelected
                          ? '#FFFFFF'
                          : item.allDone
                          ? colors.success
                          : item.hasTasks
                          ? colors.accent
                          : 'transparent',
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Search & Filter Section */}
        <View style={styles.searchSection}>
          <TextField
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search tasks..."
            leadingIcon={
              <Ionicons name="search" size={17} color={colors.textTertiary} />
            }
            clearable
            containerStyle={styles.searchInputWrapper}
          />

          {/* Quick Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsRow}
          >
            {/* Category chips */}
            {categories.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <Chip
                  key={cat.id}
                  label={cat.name}
                  selected={active}
                  color={cat.color}
                  onPress={() => setSelectedCategory(active ? null : cat.id)}
                  size="sm"
                  style={styles.filterChip}
                />
              );
            })}

            {/* High Priority chip */}
            <Chip
              label="High Priority"
              selected={selectedPriority === 'high'}
              color={colors.danger}
              onPress={() =>
                setSelectedPriority(selectedPriority === 'high' ? null : 'high')
              }
              size="sm"
              style={styles.filterChip}
            />
          </ScrollView>
        </View>

        {/* Overdue Tasks Section (distinct, calm rose highlight) */}
        {overdueTasks.length > 0 && (
          <View style={styles.overdueSection}>
            <View
              style={[
                styles.overdueBanner,
                {
                  backgroundColor: colors.dangerSoft,
                  borderColor: isDark ? 'rgba(248,113,113,0.3)' : 'rgba(225,29,72,0.2)',
                },
              ]}
            >
              <View style={styles.overdueHeader}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <ThemedText
                  variant="subheading"
                  style={[styles.overdueTitle, { color: colors.danger }]}
                >
                  Overdue ({overdueTasks.length})
                </ThemedText>
              </View>
              <ThemedText
                variant="caption"
                style={{ color: colors.textSecondary, marginTop: 2 }}
              >
                These tasks were scheduled before today and remain pending.
              </ThemedText>
            </View>

            {overdueTasks.map((occ) => (
              <TaskItem
                key={occ.id}
                occurrence={occ}
                onToggleComplete={handleToggleComplete}
                onPress={handleTaskPress}
                onDelete={handleDeletePress}
              />
            ))}
          </View>
        )}

        {/* Grouped Regular Tasks */}
        {totalTasks === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="No Tasks for this Day"
            description="Tap the button below to add your first time-block, habit, or todo."
            actionTitle="Create Task"
            onAction={() => router.push('/task/new')}
            style={styles.emptyContainer}
          />
        ) : filteredOccurrences.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="No Matching Tasks"
            description="Try clearing your search query or filters to see all tasks."
            actionTitle="Reset Filters"
            onAction={() => {
              setSearchQuery('');
              setSelectedCategory(null);
              setSelectedPriority(null);
            }}
            style={styles.emptyContainer}
          />
        ) : (
          <View style={styles.taskLists}>
            {renderTaskGroup('Morning', 'morning', 'sunny-outline', groupedTasks.morning)}
            {renderTaskGroup('Afternoon', 'afternoon', 'partly-sunny-outline', groupedTasks.afternoon)}
            {renderTaskGroup('Evening', 'evening', 'moon-outline', groupedTasks.evening)}
            {renderTaskGroup('Anytime', 'anytime', 'hourglass-outline', groupedTasks.anytime)}
          </View>
        )}
      </ScrollView>

      {/* Modern Floating Action Button (FAB) */}
      <Pressable
        onPress={() => {
          if (hapticsEnabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          }
          router.push('/task/new');
        }}
        accessibilityRole="button"
        accessibilityLabel="Add new task"
        style={[
          styles.fab,
          {
            backgroundColor: colors.accent,
          },
          shadows.lg,
        ]}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

      {/* Recurrence Scope Modal */}
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
    marginBottom: Spacing.md,
  },
  greetingArea: {
    flex: 1,
  },
  dateLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
    marginBottom: 2,
  },
  greetingTitle: {
    fontWeight: '800',
  },
  motivatingText: {
    marginTop: 2,
    fontWeight: '500',
  },
  heroCard: {
    marginBottom: Spacing.base,
    padding: Spacing.base,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroStats: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  heroSubtitle: {
    letterSpacing: 0.8,
    fontWeight: '700',
    marginBottom: 4,
  },
  heroTitle: {
    fontWeight: '800',
    marginBottom: 4,
  },
  heroMessage: {
    lineHeight: 18,
  },
  weekStripWrapper: {
    marginBottom: Spacing.base,
  },
  weekStripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
    paddingHorizontal: 2,
  },
  todayReturnBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  weekDayPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  weekDayName: {
    fontSize: 10,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  weekDayNumber: {
    fontSize: 16,
    marginBottom: 4,
  },
  taskDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  searchSection: {
    marginBottom: Spacing.sm,
  },
  searchInputWrapper: {
    marginBottom: Spacing.xs,
  },
  filterChipsRow: {
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  filterChip: {
    marginRight: 6,
  },
  overdueSection: {
    marginBottom: Spacing.base,
  },
  overdueBanner: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  overdueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  overdueTitle: {
    fontWeight: '700',
  },
  taskLists: {
    marginTop: Spacing.xs,
  },
  groupContainer: {
    marginBottom: Spacing.md,
  },
  emptyContainer: {
    marginTop: Spacing.xl,
  },
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
});
