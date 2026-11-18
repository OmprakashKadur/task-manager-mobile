import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { format, addDays, subDays, isSameDay } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText, Badge } from '@/components/ui';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTaskStore } from '@/store/useTaskStore';
import { loadOccurrencesForDate } from '@/services/taskService';
import { Spacing, BorderRadius } from '@/theme';

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 00:00 to 23:00
const HOUR_HEIGHT = 64; // Height per hour in px

export default function PlannerScreen() {
  const { colors } = useAppTheme();
  const refreshKey = useTaskStore((s) => s.refreshKey);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMinutes, setCurrentMinutes] = useState(
    new Date().getHours() * 60 + new Date().getMinutes()
  );

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const isToday = isSameDay(selectedDate, new Date());

  // Keep current time indicator updated live every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Load occurrences for selected date
  const occurrences = useMemo(() => {
    return loadOccurrencesForDate(selectedDateStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDateStr, refreshKey]);

  // Timed tasks
  const timedOccurrences = useMemo(() => {
    return occurrences.filter((o) => !o.all_day && o.start_time);
  }, [occurrences]);

  // All-day tasks
  const allDayOccurrences = useMemo(() => {
    return occurrences.filter((o) => o.all_day || !o.start_time);
  }, [occurrences]);

  // Helper to convert HH:mm to minutes from midnight
  const parseTimeToMinutes = (timeStr?: string): number => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
    return h * 60 + (m || 0);
  };

  // Date Navigation
  const handlePrevDay = () => setSelectedDate((prev) => subDays(prev, 1));
  const handleNextDay = () => setSelectedDate((prev) => addDays(prev, 1));
  const handleToday = () => setSelectedDate(new Date());

  // Quick add on slot tap
  const handleSlotPress = (hour: number) => {
    const formattedHour = String(hour).padStart(2, '0') + ':00';
    router.push({
      pathname: '/task/new',
      params: { defaultTime: formattedHour, defaultDate: selectedDateStr },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <View>
          <ThemedText variant="h1">Day Plan</ThemedText>
          <ThemedText variant="body" secondary>
            {format(selectedDate, 'EEEE, d MMMM')}
          </ThemedText>
        </View>

        <View style={styles.headerRight}>
          {!isToday && (
            <Pressable
              onPress={handleToday}
              style={[styles.todayBtn, { backgroundColor: colors.surfaceVariant }]}
            >
              <ThemedText variant="caption" style={{ fontWeight: '700', color: colors.primary }}>
                Today
              </ThemedText>
            </Pressable>
          )}

          <View style={styles.dateArrows}>
            <Pressable onPress={handlePrevDay} style={styles.arrowBtn} hitSlop={10}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </Pressable>
            <Pressable onPress={handleNextDay} style={styles.arrowBtn} hitSlop={10}>
              <Ionicons name="chevron-forward" size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* All-Day Tasks Banner */}
      {allDayOccurrences.length > 0 && (
        <View style={[styles.allDaySection, { backgroundColor: colors.surface, borderBottomColor: colors.borderSubtle }]}>
          <ThemedText variant="caption" secondary style={styles.allDayLabel}>
            ALL DAY ({allDayOccurrences.length})
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.allDayScroll}>
            {allDayOccurrences.map((occ) => (
              <Pressable
                key={occ.id}
                onPress={() => router.push(`/task/${occ.task_id}`)}
                style={[
                  styles.allDayChip,
                  {
                    backgroundColor: occ.category?.color ? `${occ.category.color}22` : colors.surfaceVariant,
                    borderColor: occ.category?.color || colors.border,
                  },
                ]}
              >
                <ThemedText
                  variant="caption"
                  style={{
                    color: occ.category?.color || colors.text,
                    fontWeight: '700',
                  }}
                  numberOfLines={1}
                >
                  {occ.title}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Hourly Timeline */}
      <ScrollView
        style={styles.timelineScroll}
        contentContainerStyle={styles.timelineContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.timelineWrapper}>
          {/* Hour rows */}
          {HOURS.map((hour) => {
            const timeLabel = `${String(hour).padStart(2, '0')}:00`;
            return (
              <Pressable
                key={hour}
                onPress={() => handleSlotPress(hour)}
                style={[styles.hourRow, { height: HOUR_HEIGHT }]}
              >
                {/* Time Label on left */}
                <View style={styles.timeLabelCol}>
                  <ThemedText variant="caption" secondary style={styles.hourText}>
                    {timeLabel}
                  </ThemedText>
                </View>

                {/* Grid Line */}
                <View
                  style={[
                    styles.gridLine,
                    { borderTopColor: colors.borderSubtle },
                  ]}
                />
              </Pressable>
            );
          })}

          {/* Current Time Indicator Line (red line across) */}
          {isToday && (
            <View
              style={[
                styles.currentTimeIndicator,
                {
                  top: (currentMinutes / 60) * HOUR_HEIGHT,
                  backgroundColor: colors.currentTimeIndicator,
                },
              ]}
            >
              <View
                style={[
                  styles.currentTimeDot,
                  { backgroundColor: colors.currentTimeIndicator },
                ]}
              />
            </View>
          )}

          {/* Task Time Blocks Positioned over the Grid */}
          {timedOccurrences.map((occ) => {
            const startMins = parseTimeToMinutes(occ.start_time);
            const endMins = occ.end_time
              ? parseTimeToMinutes(occ.end_time)
              : startMins + 45; // Default 45m duration

            const durationMins = Math.max(endMins - startMins, 25);
            const top = (startMins / 60) * HOUR_HEIGHT;
            const height = (durationMins / 60) * HOUR_HEIGHT;

            const isDone = occ.status === 'done';
            const catColor = occ.category?.color || colors.primary;

            return (
              <Pressable
                key={occ.id}
                onPress={() => router.push(`/task/${occ.task_id}`)}
                style={[
                  styles.timeBlock,
                  {
                    top,
                    height: Math.max(height - 4, 30),
                    backgroundColor: `${catColor}1E`,
                    borderLeftColor: isDone ? colors.success : catColor,
                    borderColor: isDone ? colors.success + '40' : `${catColor}40`,
                  },
                ]}
              >
                <View style={styles.timeBlockContent}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {isDone && (
                      <Ionicons
                        name="checkmark-circle"
                        size={13}
                        color={colors.success}
                      />
                    )}
                    <ThemedText
                      variant="subhead"
                      numberOfLines={1}
                      style={[
                        styles.timeBlockTitle,
                        { color: isDone ? colors.textSecondary : colors.text },
                        isDone && { textDecorationLine: 'line-through' },
                      ]}
                    >
                      {occ.title}
                    </ThemedText>
                  </View>

                  <ThemedText variant="caption" secondary numberOfLines={1}>
                    {occ.start_time} - {occ.end_time || ''}
                  </ThemedText>
                </View>

                {occ.priority === 'high' && (
                  <Badge label="High" color={colors.danger} size="sm" style={styles.priorityBadge} />
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  todayBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
  },
  dateArrows: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrowBtn: {
    padding: 6,
  },
  allDaySection: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  allDayLabel: {
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  allDayScroll: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  allDayChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    maxWidth: 160,
  },
  timelineScroll: {
    flex: 1,
  },
  timelineContent: {
    paddingBottom: Spacing.huge,
  },
  timelineWrapper: {
    position: 'relative',
    width: '100%',
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  timeLabelCol: {
    width: 60,
    paddingRight: Spacing.sm,
    alignItems: 'flex-end',
  },
  hourText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: -7,
  },
  gridLine: {
    flex: 1,
    borderTopWidth: 1,
    height: '100%',
  },
  currentTimeIndicator: {
    position: 'absolute',
    left: 55,
    right: 0,
    height: 2,
    zIndex: 99,
  },
  currentTimeDot: {
    position: 'absolute',
    left: -4,
    top: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timeBlock: {
    position: 'absolute',
    left: 65,
    right: 16,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderLeftWidth: 4,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  timeBlockContent: {
    flex: 1,
  },
  timeBlockTitle: {
    fontWeight: '700',
  },
  priorityBadge: {
    marginLeft: Spacing.xs,
  },
});
