import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  ThemedText,
  Card,
  ProgressRing,
  SegmentedControl,
  SectionHeader,
} from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { useTaskStore } from '@/store/useTaskStore';
import { computeAnalytics } from '@/services/analytics';
import { loadOccurrencesForRange } from '@/services/taskService';
import { Spacing, BorderRadius } from '@/theme';
import { format, subDays, addDays, startOfWeek } from 'date-fns';

export default function AnalyticsScreen() {
  const { colors, isDark } = useTheme();
  const refreshKey = useTaskStore((s) => s.refreshKey);
  const [selectedRangeStr, setSelectedRangeStr] = useState<'7' | '30' | '90'>('7');

  const selectedRange = parseInt(selectedRangeStr, 10);

  // Compute analytics data
  const data = useMemo(() => {
    return computeAnalytics(selectedRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRange, refreshKey]);

  // Compute 90-day consistency heatmap data (13 weeks x 7 days)
  const heatmapData = useMemo(() => {
    const today = new Date();
    // 13 weeks = 91 days
    const totalDays = 91;
    const startDate = subDays(today, totalDays - 1);
    const startOfGrid = startOfWeek(startDate, { weekStartsOn: 1 });

    const startStr = format(startOfGrid, 'yyyy-MM-dd');
    const endStr = format(today, 'yyyy-MM-dd');

    const occurrences = loadOccurrencesForRange(startStr, endStr);
    const countsByDate = new Map<string, number>();

    for (const occ of occurrences) {
      if (occ.status === 'done') {
        countsByDate.set(occ.date, (countsByDate.get(occ.date) || 0) + 1);
      }
    }

    // Build weeks array: 13 columns of 7 days
    const weeks: { dateStr: string; count: number; isFuture: boolean }[][] = [];
    let currentDay = startOfGrid;

    for (let w = 0; w < 13; w++) {
      const week: { dateStr: string; count: number; isFuture: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const dStr = format(currentDay, 'yyyy-MM-dd');
        const count = countsByDate.get(dStr) || 0;
        const isFuture = currentDay > today;
        week.push({ dateStr: dStr, count, isFuture });
        currentDay = addDays(currentDay, 1);
      }
      weeks.push(week);
    }

    return weeks;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const getHeatmapColor = (count: number, isFuture: boolean) => {
    if (isFuture) return 'transparent';
    if (count === 0) return isDark ? 'rgba(255,255,255,0.06)' : colors.surfaceVariant;
    if (count === 1) return isDark ? 'rgba(52,211,153,0.3)' : 'rgba(5,150,105,0.25)';
    if (count === 2) return isDark ? 'rgba(52,211,153,0.55)' : 'rgba(5,150,105,0.5)';
    if (count >= 3) return colors.success;
    return colors.success;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText variant="display" style={styles.title}>
            Analytics
          </ThemedText>
          <ThemedText variant="caption" secondary style={styles.subtitle}>
            Your habits, completion streaks, and productivity insights
          </ThemedText>

          {/* Range Segmented Control */}
          <SegmentedControl
            options={[
              { label: '7 Days', value: '7' },
              { label: '30 Days', value: '30' },
              { label: '90 Days', value: '90' },
            ]}
            value={selectedRangeStr}
            onChange={(val) => setSelectedRangeStr(val as any)}
            style={styles.rangeControl}
          />
        </View>

        {/* Hero Streaks Card */}
        <Card style={styles.streakCard} elevated>
          <View style={styles.streakRow}>
            <View
              style={[
                styles.streakIconCircle,
                { backgroundColor: colors.warningSoft },
              ]}
            >
              <Ionicons name="flame" size={30} color={colors.warning} />
            </View>

            <View style={styles.streakInfo}>
              <ThemedText variant="micro" secondary style={styles.streakLabel}>
                DAILY STREAK
              </ThemedText>
              <ThemedText variant="title" tabular style={styles.streakCount}>
                {data.currentStreak} Day{data.currentStreak === 1 ? '' : 's'}
              </ThemedText>
              <ThemedText variant="caption" secondary>
                {data.currentStreak > 0
                  ? 'Keep completing tasks daily to extend your streak!'
                  : 'Complete all of today’s tasks to start a new streak.'}
              </ThemedText>
            </View>

            <View style={styles.bestStreakBadge}>
              <ThemedText variant="micro" secondary>
                BEST
              </ThemedText>
              <ThemedText
                variant="heading"
                tabular
                style={{ color: colors.accent, fontWeight: '800' }}
              >
                {data.bestStreak}d
              </ThemedText>
            </View>
          </View>
        </Card>

        {/* Completion Rates: Today / Week / Month */}
        <View style={styles.ratesRow}>
          {/* Today Card */}
          <Card style={styles.rateCard} elevated>
            <ProgressRing
              size={56}
              strokeWidth={6}
              progress={data.todayStats.rate / 100}
              completed={data.todayStats.completed}
              total={data.todayStats.total}
              showText={false}
            />
            <ThemedText variant="heading" tabular style={styles.ratePercent}>
              {data.todayStats.rate}%
            </ThemedText>
            <ThemedText variant="caption" style={{ fontWeight: '700' }}>
              Today
            </ThemedText>
            <ThemedText variant="micro" secondary tabular>
              {data.todayStats.completed}/{data.todayStats.total} done
            </ThemedText>
          </Card>

          {/* This Week Card */}
          <Card style={styles.rateCard} elevated>
            <ProgressRing
              size={56}
              strokeWidth={6}
              progress={data.weekStats.rate / 100}
              completed={data.weekStats.completed}
              total={data.weekStats.total}
              showText={false}
              color={colors.info}
            />
            <ThemedText variant="heading" tabular style={styles.ratePercent}>
              {data.weekStats.rate}%
            </ThemedText>
            <ThemedText variant="caption" style={{ fontWeight: '700' }}>
              This Week
            </ThemedText>
            <ThemedText variant="micro" secondary tabular>
              {data.weekStats.completed}/{data.weekStats.total} done
            </ThemedText>
          </Card>

          {/* This Month Card */}
          <Card style={styles.rateCard} elevated>
            <ProgressRing
              size={56}
              strokeWidth={6}
              progress={data.monthStats.rate / 100}
              completed={data.monthStats.completed}
              total={data.monthStats.total}
              showText={false}
              color={colors.accent}
            />
            <ThemedText variant="heading" tabular style={styles.ratePercent}>
              {data.monthStats.rate}%
            </ThemedText>
            <ThemedText variant="caption" style={{ fontWeight: '700' }}>
              This Month
            </ThemedText>
            <ThemedText variant="micro" secondary tabular>
              {data.monthStats.completed}/{data.monthStats.total} done
            </ThemedText>
          </Card>
        </View>

        {/* 90-Day Consistency Heatmap (GitHub style) */}
        <Card style={styles.sectionCard} elevated>
          <SectionHeader
            title="90-Day Consistency Heatmap"
            icon="grid-outline"
          />
          <ThemedText variant="caption" secondary style={styles.sectionSubtitle}>
            Daily completed tasks activity over the last 13 weeks
          </ThemedText>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.heatmapScroll}>
            <View style={styles.heatmapGrid}>
              {heatmapData.map((week, wIdx) => (
                <View key={wIdx} style={styles.heatmapCol}>
                  {week.map((day, dIdx) => (
                    <View
                      key={dIdx}
                      style={[
                        styles.heatmapCell,
                        {
                          backgroundColor: getHeatmapColor(day.count, day.isFuture),
                        },
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Heatmap Legend */}
          <View style={styles.heatmapLegend}>
            <ThemedText variant="micro" secondary>
              Less
            </ThemedText>
            <View style={[styles.legendDot, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.surfaceVariant }]} />
            <View style={[styles.legendDot, { backgroundColor: isDark ? 'rgba(52,211,153,0.3)' : 'rgba(5,150,105,0.25)' }]} />
            <View style={[styles.legendDot, { backgroundColor: isDark ? 'rgba(52,211,153,0.55)' : 'rgba(5,150,105,0.5)' }]} />
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <ThemedText variant="micro" secondary>
              More
            </ThemedText>
          </View>
        </Card>

        {/* Weekly Completion Bar Chart */}
        <Card style={styles.sectionCard} elevated>
          <SectionHeader
            title="Past 7 Days Activity"
            icon="bar-chart-outline"
          />
          <ThemedText variant="caption" secondary style={styles.sectionSubtitle}>
            Completed vs pending tasks per day
          </ThemedText>

          <View style={styles.chartContainer}>
            {data.weeklyBarData.map((day) => {
              const maxVal = Math.max(...data.weeklyBarData.map((d) => d.total), 5);
              const completedHeight = (day.completed / maxVal) * 100;
              const missedHeight = (day.missed / maxVal) * 100;

              return (
                <View key={day.dateStr} style={styles.barCol}>
                  <View style={[styles.barTrack, { backgroundColor: colors.surfaceVariant }]}>
                    {/* Pending portion */}
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${missedHeight}%`,
                          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                        },
                      ]}
                    />
                    {/* Completed portion */}
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${completedHeight}%`,
                          backgroundColor: colors.success,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText variant="micro" secondary style={styles.barLabel}>
                    {day.dayName}
                  </ThemedText>
                  <ThemedText variant="micro" tabular style={{ fontWeight: '700', fontSize: 10 }}>
                    {day.completed}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Productivity Insight Cards */}
        <Card style={styles.sectionCard} elevated>
          <SectionHeader
            title="Productivity Patterns"
            icon="bulb-outline"
          />

          <View style={styles.insightRow}>
            <View style={[styles.insightBox, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="sunny" size={24} color={colors.warning} />
              <ThemedText variant="caption" secondary style={{ marginTop: 6 }}>
                Peak Time of Day
              </ThemedText>
              <ThemedText variant="heading" style={{ fontWeight: '800', textTransform: 'capitalize', marginTop: 2 }}>
                {data.insights.mostProductivePeriod || 'Anytime'}
              </ThemedText>
            </View>

            <View style={[styles.insightBox, { backgroundColor: colors.surfaceVariant }]}>
              <Ionicons name="calendar" size={24} color={colors.accent} />
              <ThemedText variant="caption" secondary style={{ marginTop: 6 }}>
                Peak Day of Week
              </ThemedText>
              <ThemedText variant="heading" style={{ fontWeight: '800', marginTop: 2 }}>
                {data.insights.mostProductiveDayOfWeek || 'None'}
              </ThemedText>
            </View>
          </View>
        </Card>

        {/* Category Distribution */}
        {data.categoryBreakdown.length > 0 && (
          <Card style={styles.sectionCard} elevated>
            <SectionHeader
              title="Category Distribution"
              icon="pie-chart-outline"
            />

            {data.categoryBreakdown.map((item) => (
              <View key={item.category.id} style={styles.breakdownRow}>
                <View style={styles.breakdownHeader}>
                  <View style={styles.breakdownTitleRow}>
                    <View style={[styles.catDot, { backgroundColor: item.category.color }]} />
                    <ThemedText variant="bodyMedium" style={{ fontWeight: '600' }}>
                      {item.category.name}
                    </ThemedText>
                  </View>
                  <ThemedText variant="caption" secondary tabular>
                    {item.completed}/{item.total} ({item.percentage}%)
                  </ThemedText>
                </View>

                {/* Progress bar */}
                <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${item.percentage}%`,
                        backgroundColor: item.category.color,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Priority Breakdown */}
        <Card style={styles.sectionCard} elevated>
          <SectionHeader
            title="Priority Breakdown"
            icon="flag-outline"
          />

          {data.priorityBreakdown.map((item) => {
            const color =
              item.priority === 'high'
                ? colors.danger
                : item.priority === 'medium'
                ? colors.warning
                : colors.success;

            return (
              <View key={item.priority} style={styles.breakdownRow}>
                <View style={styles.breakdownHeader}>
                  <ThemedText variant="bodyMedium" style={{ fontWeight: '600', textTransform: 'capitalize' }}>
                    {item.priority} Priority
                  </ThemedText>
                  <ThemedText variant="caption" secondary tabular>
                    {item.completed}/{item.total} ({item.rate}%)
                  </ThemedText>
                </View>

                <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}>
                  <View
                    style={[
                      styles.progressBar,
                      { width: `${item.rate}%`, backgroundColor: color },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </Card>
      </ScrollView>
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
  title: {
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    marginBottom: Spacing.sm,
  },
  rangeControl: {
    marginTop: Spacing.xs,
  },
  streakCard: {
    marginBottom: Spacing.base,
    padding: Spacing.base,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  streakLabel: {
    letterSpacing: 0.6,
    fontWeight: '700',
  },
  streakCount: {
    fontWeight: '800',
    marginVertical: 1,
  },
  bestStreakBadge: {
    alignItems: 'center',
    paddingLeft: Spacing.sm,
  },
  ratesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  rateCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  ratePercent: {
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 2,
  },
  sectionCard: {
    marginBottom: Spacing.base,
    padding: Spacing.base,
  },
  sectionSubtitle: {
    marginTop: -Spacing.xs,
    marginBottom: Spacing.md,
  },
  heatmapScroll: {
    paddingVertical: Spacing.xs,
  },
  heatmapGrid: {
    flexDirection: 'row',
    gap: 4,
  },
  heatmapCol: {
    gap: 4,
  },
  heatmapCell: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: Spacing.sm,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 130,
    paddingTop: Spacing.sm,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: 16,
    height: 90,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 8,
  },
  barLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
  },
  insightRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  insightBox: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  breakdownRow: {
    marginBottom: Spacing.md,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  breakdownTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
});
