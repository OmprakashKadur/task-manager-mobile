import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { format, addDays, subDays, isSameDay } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  ThemedText,
  Badge,
  IconButton,
  Button,
} from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { useTaskStore } from '@/store/useTaskStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { loadOccurrencesForDate } from '@/services/taskService';
import { computeTimelineLayout } from '@/services/plannerLayout';
import { Spacing, BorderRadius } from '@/theme';

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 00:00 to 23:00
const HOUR_HEIGHT = 68; // Height per hour in px

export default function PlannerScreen() {
  const { colors, isDark, shadows } = useTheme();
  const refreshKey = useTaskStore((s) => s.refreshKey);
  const hapticsEnabled = useSettingsStore((s) => s.settings.haptics_enabled);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMinutes, setCurrentMinutes] = useState(
    new Date().getHours() * 60 + new Date().getMinutes()
  );

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const isToday = isSameDay(selectedDate, new Date());

  const scrollViewRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const initialScrollDone = useRef(false);

  // Scroll to current time (offset slightly so recent context is visible)
  const scrollToCurrentTime = useCallback((animated = true) => {
    if (!scrollViewRef.current) return;
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const targetY = Math.max(0, (mins / 60) * HOUR_HEIGHT - 120);
    scrollViewRef.current.scrollTo({ y: targetY, animated });
  }, []);

  // When tab is focused or screen opened: scroll to current time if on today
  useFocusEffect(
    useCallback(() => {
      if (isToday) {
        const timer = setTimeout(() => {
          scrollToCurrentTime(initialScrollDone.current);
          initialScrollDone.current = true;
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [isToday, scrollToCurrentTime])
  );

  const handleContentSizeChange = useCallback(() => {
    if (!initialScrollDone.current && isToday) {
      scrollToCurrentTime(false);
      initialScrollDone.current = true;
    }
  }, [isToday, scrollToCurrentTime]);

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

  // Non-overlapping positioned timed occurrences
  const positionedOccurrences = useMemo(() => {
    return computeTimelineLayout(timedOccurrences, HOUR_HEIGHT);
  }, [timedOccurrences]);

  // All-day tasks
  const allDayOccurrences = useMemo(() => {
    return occurrences.filter((o) => o.all_day || !o.start_time);
  }, [occurrences]);

  // Date Navigation
  const handlePrevDay = () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setSelectedDate((prev) => subDays(prev, 1));
  };

  const handleNextDay = () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setSelectedDate((prev) => addDays(prev, 1));
  };

  const handleToday = () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setSelectedDate(new Date());
    setTimeout(() => {
      scrollToCurrentTime(true);
    }, 60);
  };

  const handleJumpToNow = () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    scrollToCurrentTime(true);
  };

  // Quick add on slot tap
  const handleSlotPress = (hour: number) => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
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
        <View style={styles.headerLeft}>
          <ThemedText variant="display" style={styles.headerTitle}>
            Day Plan
          </ThemedText>
          <ThemedText variant="caption" secondary style={styles.headerSubtitle}>
            {format(selectedDate, 'EEEE, d MMMM')}
          </ThemedText>
        </View>

        <View style={styles.headerRight}>
          {isToday ? (
            <Button
              title="Now"
              variant="secondary"
              size="sm"
              onPress={handleJumpToNow}
              style={styles.todayBtn}
              icon={<Ionicons name="navigate-outline" size={13} color={colors.accent} />}
            />
          ) : (
            <Button
              title="Today"
              variant="secondary"
              size="sm"
              onPress={handleToday}
              style={styles.todayBtn}
            />
          )}

          <View style={styles.dateArrows}>
            <IconButton
              icon={<Ionicons name="chevron-back" size={20} color={colors.textPrimary} />}
              onPress={handlePrevDay}
              accessibilityLabel="Previous day"
              size={36}
            />
            <IconButton
              icon={<Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />}
              onPress={handleNextDay}
              accessibilityLabel="Next day"
              size={36}
            />
          </View>
        </View>
      </View>

      {/* All-Day Tasks Horizontal Strip */}
      {allDayOccurrences.length > 0 && (
        <View
          style={[
            styles.allDaySection,
            {
              backgroundColor: isDark ? colors.surface : colors.surface,
              borderBottomColor: colors.borderSubtle,
            },
          ]}
        >
          <ThemedText variant="micro" secondary style={styles.allDayLabel}>
            ALL-DAY TASKS ({allDayOccurrences.length})
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.allDayScroll}
          >
            {allDayOccurrences.map((occ) => {
              const catColor = occ.category?.color || colors.accent;
              const isDone = occ.status === 'done';
              return (
                <Pressable
                  key={occ.id}
                  onPress={() => router.push(`/task/${occ.task_id}`)}
                  style={[
                    styles.allDayChip,
                    {
                      backgroundColor: isDark ? `${catColor}24` : `${catColor}14`,
                      borderColor: isDone ? colors.success : catColor,
                    },
                  ]}
                >
                  <View style={styles.allDayContent}>
                    {isDone && (
                      <Ionicons
                        name="checkmark-circle"
                        size={12}
                        color={colors.success}
                        style={{ marginRight: 4 }}
                      />
                    )}
                    <ThemedText
                      variant="caption"
                      style={{
                        color: isDark ? '#F0F6FC' : catColor,
                        fontWeight: '700',
                        textDecorationLine: isDone ? 'line-through' : 'none',
                      }}
                      numberOfLines={1}
                    >
                      {occ.title}
                    </ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Hourly Timeline Grid */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.timelineScroll}
        contentContainerStyle={styles.timelineContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={handleContentSizeChange}
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
                  <ThemedText variant="micro" tabular secondary style={styles.hourText}>
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

          {/* Current Time Indicator Line with Pulsing Dot */}
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
          <View style={styles.eventsContainer} pointerEvents="box-none">
            {positionedOccurrences.map(
              ({ occurrence: occ, top, height, columnIndex, totalColumns }) => {
                const isDone = occ.status === 'done';
                const catColor = occ.category?.color || colors.accent;
                const isMultiColumn = totalColumns > 1;

                const leftPct = `${(columnIndex / totalColumns) * 100}%` as const;
                const widthPct = `${(1 / totalColumns) * 100}%` as const;

                const paddingLeft = isMultiColumn && columnIndex > 0 ? 3 : 0;
                const paddingRight =
                  isMultiColumn && columnIndex < totalColumns - 1 ? 3 : 0;

                return (
                  <Pressable
                    key={occ.id}
                    onPress={() => router.push(`/task/${occ.task_id}`)}
                    style={[
                      styles.timeBlockWrapper,
                      {
                        top,
                        height,
                        left: leftPct,
                        width: widthPct,
                        paddingLeft,
                        paddingRight,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.timeBlockCard,
                        {
                          backgroundColor: isDark
                            ? `${catColor}24`
                            : `${catColor}16`,
                          borderLeftColor: isDone ? colors.success : catColor,
                          borderColor: isDone ? colors.success + '40' : `${catColor}35`,
                        },
                        shadows.sm,
                      ]}
                    >
                      <View style={styles.timeBlockContent}>
                        <View style={styles.blockTitleRow}>
                          {isDone && (
                            <Ionicons
                              name="checkmark-circle"
                              size={14}
                              color={colors.success}
                              style={{ marginRight: 4 }}
                            />
                          )}
                          <ThemedText
                            variant="bodyMedium"
                            numberOfLines={1}
                            style={[
                              styles.timeBlockTitle,
                              {
                                color: isDone ? colors.textSecondary : colors.textPrimary,
                                fontSize: isMultiColumn ? 13 : 15,
                              },
                              isDone && { textDecorationLine: 'line-through' },
                            ]}
                          >
                            {occ.title}
                          </ThemedText>
                        </View>

                        <View style={styles.blockMetaRow}>
                          <ThemedText variant="micro" tabular secondary numberOfLines={1}>
                            {totalColumns >= 3
                              ? occ.start_time
                              : `${occ.start_time}${occ.end_time ? ' - ' + occ.end_time : ''}`}
                          </ThemedText>

                          {occ.category && totalColumns <= 2 && (
                            <ThemedText
                              variant="micro"
                              style={{ color: catColor, fontWeight: '700', marginLeft: 6 }}
                              numberOfLines={1}
                            >
                              • {occ.category.name}
                            </ThemedText>
                          )}
                        </View>
                      </View>

                      {occ.priority === 'high' && (
                        isMultiColumn ? (
                          <Ionicons
                            name="flame"
                            size={14}
                            color={colors.danger}
                            style={styles.compactPriorityIcon}
                          />
                        ) : (
                          <Badge
                            label="High"
                            color={colors.danger}
                            backgroundColor={colors.dangerSoft}
                            size="sm"
                            style={styles.priorityBadge}
                          />
                        )
                      )}
                    </View>
                  </Pressable>
                );
              }
            )}
          </View>
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
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: '800',
  },
  headerSubtitle: {
    marginTop: 2,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  todayBtn: {
    minHeight: 36,
  },
  dateArrows: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  allDaySection: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
  },
  allDayLabel: {
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: Spacing.xs,
  },
  allDayScroll: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  allDayChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    maxWidth: 180,
  },
  allDayContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineScroll: {
    flex: 1,
  },
  timelineContent: {
    paddingBottom: 110,
  },
  timelineWrapper: {
    position: 'relative',
    marginTop: Spacing.sm,
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timeLabelCol: {
    width: 54,
    paddingLeft: Spacing.base,
    paddingTop: 0,
  },
  hourText: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  gridLine: {
    flex: 1,
    borderTopWidth: 1,
    marginTop: 8,
  },
  currentTimeIndicator: {
    position: 'absolute',
    left: 48,
    right: 0,
    height: 2,
    zIndex: 10,
    alignItems: 'center',
    flexDirection: 'row',
  },
  currentTimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: -4,
  },
  eventsContainer: {
    position: 'absolute',
    top: 0,
    left: 60,
    right: 14,
    bottom: 0,
  },
  timeBlockWrapper: {
    position: 'absolute',
    zIndex: 5,
  },
  timeBlockCard: {
    flex: 1,
    height: '100%',
    borderRadius: BorderRadius.md,
    borderLeftWidth: 3.5,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 8,
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  timeBlockContent: {
    flex: 1,
    justifyContent: 'center',
  },
  blockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeBlockTitle: {
    fontWeight: '700',
    flex: 1,
  },
  blockMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  priorityBadge: {
    marginLeft: Spacing.xs,
  },
  compactPriorityIcon: {
    marginLeft: 4,
  },
});
