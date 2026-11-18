import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  ThemedText,
  ProgressRing,
  EmptyState,
  Badge,
} from '@/components/ui';
import { TaskItem } from '@/components/TaskItem';
import { ScopeModal } from '@/components/ScopeModal';
import { useAppTheme } from '@/hooks/useAppTheme';
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
import { Spacing, BorderRadius, Shadows } from '@/theme';
import { getTodayLocalDate } from '@/services/recurrence/dateUtils';
import { resyncNotificationSchedule } from '@/services/notifications';

export default function TodayScreen() {
  const { colors } = useAppTheme();
  const userName = useSettingsStore((s) => s.settings.user_name);
  const hapticsEnabled = useSettingsStore((s) => s.settings.haptics_enabled);
  const categories = useCategoryStore((s) => s.categories);

  const refreshKey = useTaskStore((s) => s.refreshKey);
  const triggerRefresh = useTaskStore((s) => s.triggerRefresh);
  const showUndo = useTaskStore((s) => s.showUndo);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);

  // Scope modal state
  const [scopeModalVisible, setScopeModalVisible] = useState(false);
  const [targetOccurrence, setTargetOccurrence] = useState<TaskOccurrence | null>(null);

  const todayStr = useMemo(() => getTodayLocalDate(), []);

  // Greeting calculation
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

  const formattedDate = useMemo(() => {
    return format(new Date(), 'EEEE, d MMMM');
  }, []);

  // Load occurrences for today
  const allOccurrences = useMemo(() => {
    return loadOccurrencesForDate(todayStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayStr, refreshKey]);

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

      if (!showCompleted && occ.status === 'done') {
        return false;
      }

      return true;
    });
  }, [allOccurrences, searchQuery, selectedCategory, selectedPriority, showCompleted]);

  // Metrics
  const totalTasks = allOccurrences.length;
  const completedTasks = allOccurrences.filter((o) => o.status === 'done').length;
  const progressRatio = totalTasks > 0 ? completedTasks / totalTasks : 0;

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

  const handleFabPress = () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    router.push('/task/new');
  };

  const renderSection = (title: string, icon: any, tasks: TaskOccurrence[]) => {
    if (tasks.length === 0) return null;

    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Ionicons name={icon} size={18} color={colors.primary} />
          <ThemedText variant="h3" style={styles.sectionTitle}>
            {title}
          </ThemedText>
          <ThemedText variant="caption" secondary style={styles.sectionCount}>
            ({tasks.length})
          </ThemedText>
        </View>

        {tasks.map((occ) => (
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Greeting & Progress */}
        <View style={styles.header}>
          <View style={styles.greetingContainer}>
            <ThemedText variant="caption" secondary style={{ textTransform: 'uppercase' }}>
              {formattedDate}
            </ThemedText>
            <ThemedText variant="h1" numberOfLines={1} style={{ marginTop: 2 }}>
              {greeting}
            </ThemedText>
            <ThemedText variant="body" secondary style={{ marginTop: 2 }}>
              {totalTasks === 0
                ? 'No tasks scheduled today.'
                : completedTasks === totalTasks
                ? 'All tasks completed today! 🎉'
                : `${totalTasks - completedTasks} tasks remaining.`}
            </ThemedText>
          </View>

          <ProgressRing
            size={76}
            strokeWidth={8}
            progress={progressRatio}
            completed={completedTasks}
            total={totalTasks}
            color={colors.primary}
          />
        </View>

        {/* Search & Filter Bar */}
        <View style={styles.filterSection}>
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search today's tasks..."
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          {/* Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillScroll}
          >
            {/* Category filters */}
            {categories.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelectedCategory(active ? null : cat.id)}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: active ? cat.color : colors.surface,
                      borderColor: active ? cat.color : colors.border,
                    },
                  ]}
                >
                  <ThemedText
                    variant="caption"
                    style={{
                      color: active ? '#FFFFFF' : colors.text,
                      fontWeight: active ? '700' : '500',
                    }}
                  >
                    {cat.name}
                  </ThemedText>
                </Pressable>
              );
            })}

            {/* High priority filter */}
            <Pressable
              onPress={() => setSelectedPriority(selectedPriority === 'high' ? null : 'high')}
              style={[
                styles.pill,
                {
                  backgroundColor: selectedPriority === 'high' ? colors.danger : colors.surface,
                  borderColor: selectedPriority === 'high' ? colors.danger : colors.border,
                },
              ]}
            >
              <ThemedText
                variant="caption"
                style={{
                  color: selectedPriority === 'high' ? '#FFFFFF' : colors.text,
                  fontWeight: selectedPriority === 'high' ? '700' : '500',
                }}
              >
                High Priority
              </ThemedText>
            </Pressable>

            {/* Completed Toggle */}
            <Pressable
              onPress={() => setShowCompleted(!showCompleted)}
              style={[
                styles.pill,
                {
                  backgroundColor: !showCompleted ? colors.primary : colors.surface,
                  borderColor: !showCompleted ? colors.primary : colors.border,
                },
              ]}
            >
              <ThemedText
                variant="caption"
                style={{
                  color: !showCompleted ? '#FFFFFF' : colors.textSecondary,
                  fontWeight: !showCompleted ? '700' : '500',
                }}
              >
                {showCompleted ? 'Hide Done' : 'Showing Incomplete'}
              </ThemedText>
            </Pressable>
          </ScrollView>
        </View>

        {/* Overdue Section */}
        {overdueTasks.length > 0 && (
          <View style={[styles.overdueContainer, { backgroundColor: colors.dangerLight, borderColor: colors.danger }]}>
            <View style={styles.overdueHeader}>
              <Ionicons name="warning" size={18} color={colors.danger} />
              <ThemedText variant="h3" style={{ color: colors.danger, marginLeft: Spacing.xs }}>
                Overdue Tasks
              </ThemedText>
              <Badge
                label={`${overdueTasks.length}`}
                color={colors.danger}
                backgroundColor="#FFFFFF"
                style={{ marginLeft: 'auto' }}
              />
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

        {/* Grouped Day Sections */}
        {renderSection('Morning', 'sunny-outline', groupedTasks.morning)}
        {renderSection('Afternoon', 'partly-sunny-outline', groupedTasks.afternoon)}
        {renderSection('Evening', 'moon-outline', groupedTasks.evening)}
        {renderSection('Anytime', 'time-outline', groupedTasks.anytime)}

        {/* Empty state */}
        {filteredOccurrences.length === 0 && (
          <EmptyState
            icon="checkmark-done-circle-outline"
            title="All Clear!"
            description={
              allOccurrences.length === 0
                ? "You don't have any tasks scheduled for today. Tap the button below to add one."
                : 'No tasks match your active filters.'
            }
            actionTitle={allOccurrences.length === 0 ? 'Add Today’s First Task' : 'Reset Filters'}
            onAction={
              allOccurrences.length === 0
                ? handleFabPress
                : () => {
                    setSearchQuery('');
                    setSelectedCategory(null);
                    setSelectedPriority(null);
                    setShowCompleted(true);
                  }
            }
            style={{ marginTop: Spacing.xl }}
          />
        )}
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <Pressable
        onPress={handleFabPress}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: colors.primary, transform: [{ scale: pressed ? 0.94 : 1 }] },
          Shadows.lg,
        ]}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </Pressable>

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
    paddingBottom: 90, // Room for FAB
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  greetingContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  filterSection: {
    marginBottom: Spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 42,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    marginLeft: Spacing.sm,
  },
  pillScroll: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingVertical: 2,
  },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  overdueContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  overdueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionContainer: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontWeight: '700',
    marginLeft: Spacing.xs,
  },
  sectionCount: {
    marginLeft: Spacing.xs,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
});
