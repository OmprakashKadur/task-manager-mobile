import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText, Card, ProgressRing } from '@/components/ui';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useTaskStore } from '@/store/useTaskStore';
import { computeAnalytics } from '@/services/analytics';
import { Spacing, BorderRadius } from '@/theme';

const RANGE_OPTIONS = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
];

export default function AnalyticsScreen() {
  const { colors } = useAppTheme();
  const refreshKey = useTaskStore((s) => s.refreshKey);
  const [selectedRange, setSelectedRange] = useState<number>(7);

  // Compute analytics data
  const data = useMemo(() => {
    return computeAnalytics(selectedRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRange, refreshKey]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText variant="h1">Analytics</ThemedText>
          <ThemedText variant="body" secondary style={{ marginTop: 2 }}>
            Track your habits, consistency, and daily momentum.
          </ThemedText>

          {/* Range Filter Pills */}
          <View style={styles.rangePillsRow}>
            {RANGE_OPTIONS.map((opt) => {
              const active = selectedRange === opt.days;
              return (
                <Pressable
                  key={opt.days}
                  onPress={() => setSelectedRange(opt.days)}
                  style={[
                    styles.rangePill,
                    {
                      backgroundColor: active ? colors.primary : colors.surface,
                      borderColor: active ? colors.primary : colors.border,
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
                    {opt.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Streaks Banner */}
        <Card style={styles.streakCard}>
          <View style={styles.streakHeader}>
            <View style={[styles.streakIconCircle, { backgroundColor: colors.warningLight }]}>
              <Ionicons name="flame" size={26} color={colors.warning} />
            </View>
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <ThemedText variant="h2" style={{ fontWeight: '800' }}>
                {data.currentStreak} Day{data.currentStreak === 1 ? '' : 's'}
              </ThemedText>
              <ThemedText variant="caption" secondary>
                Current Daily Completion Streak
              </ThemedText>
            </View>
            <View style={styles.bestStreakBadge}>
              <ThemedText variant="caption" secondary>
                Best
              </ThemedText>
              <ThemedText variant="bodyMedium" style={{ fontWeight: '700', color: colors.primary }}>
                {data.bestStreak}d
              </ThemedText>
            </View>
          </View>
        </Card>

        {/* Completion Rates: Today / Week / Month */}
        <View style={styles.ratesRow}>
          {/* Today Card */}
          <Card style={styles.rateCard}>
            <ProgressRing
              size={64}
              strokeWidth={6}
              progress={data.todayStats.rate / 100}
              completed={data.todayStats.completed}
              total={data.todayStats.total}
              showText={false}
            />
            <ThemedText variant="h3" style={styles.ratePercent}>
              {data.todayStats.rate}%
            </ThemedText>
            <ThemedText variant="caption" secondary>
              Today
            </ThemedText>
            <ThemedText variant="caption" secondary style={{ fontSize: 10 }}>
              {data.todayStats.completed}/{data.todayStats.total} done
            </ThemedText>
          </Card>

          {/* This Week Card */}
          <Card style={styles.rateCard}>
            <ProgressRing
              size={64}
              strokeWidth={6}
              progress={data.weekStats.rate / 100}
              completed={data.weekStats.completed}
              total={data.weekStats.total}
              showText={false}
              color={colors.info}
            />
            <ThemedText variant="h3" style={styles.ratePercent}>
              {data.weekStats.rate}%
            </ThemedText>
            <ThemedText variant="caption" secondary>
              This Week
            </ThemedText>
            <ThemedText variant="caption" secondary style={{ fontSize: 10 }}>
              {data.weekStats.completed}/{data.weekStats.total} done
            </ThemedText>
          </Card>

          {/* This Month Card */}
          <Card style={styles.rateCard}>
            <ProgressRing
              size={64}
              strokeWidth={6}
              progress={data.monthStats.rate / 100}
              completed={data.monthStats.completed}
              total={data.monthStats.total}
              showText={false}
              color={colors.primary}
            />
            <ThemedText variant="h3" style={styles.ratePercent}>
              {data.monthStats.rate}%
            </ThemedText>
            <ThemedText variant="caption" secondary>
              This Month
            </ThemedText>
            <ThemedText variant="caption" secondary style={{ fontSize: 10 }}>
              {data.monthStats.completed}/{data.monthStats.total} done
            </ThemedText>
          </Card>
        </View>

        {/* Weekly Completion Bar Chart */}
        <Card style={styles.sectionCard}>
          <ThemedText variant="h3" style={{ marginBottom: Spacing.sm }}>
            Past 7 Days Activity
          </ThemedText>
          <ThemedText variant="caption" secondary style={{ marginBottom: Spacing.md }}>
            Completed vs pending/missed tasks per day
          </ThemedText>

          <View style={styles.chartContainer}>
            {data.weeklyBarData.map((day) => {
              const maxVal = Math.max(...data.weeklyBarData.map((d) => d.total), 5);
              const completedHeight = (day.completed / maxVal) * 100;
              const missedHeight = (day.missed / maxVal) * 100;

              return (
                <View key={day.dateStr} style={styles.barCol}>
                  <View style={[styles.barTrack, { backgroundColor: colors.surfaceVariant }]}>
                    {/* Missed / Pending portion */}
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${missedHeight}%`,
                          backgroundColor: `${colors.border}`,
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
                  <ThemedText variant="caption" secondary style={styles.barLabel}>
                    {day.dayName}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </Card>

        {/* Productivity Insights */}
        <Card style={styles.sectionCard}>
          <ThemedText variant="h3" style={{ marginBottom: Spacing.sm }}>
            Productivity Patterns
          </ThemedText>

          <View style={styles.insightRow}>
            <View style={styles.insightBox}>
              <Ionicons name="sunny" size={22} color={colors.warning} />
              <ThemedText variant="caption" secondary style={{ marginTop: 4 }}>
                Peak Time of Day
              </ThemedText>
              <ThemedText variant="bodyMedium" style={{ fontWeight: '700', textTransform: 'capitalize' }}>
                {data.insights.mostProductivePeriod || 'Anytime'}
              </ThemedText>
            </View>

            <View style={styles.insightBox}>
              <Ionicons name="calendar" size={22} color={colors.primary} />
              <ThemedText variant="caption" secondary style={{ marginTop: 4 }}>
                Peak Day of Week
              </ThemedText>
              <ThemedText variant="bodyMedium" style={{ fontWeight: '700' }}>
                {data.insights.mostProductiveDayOfWeek || 'None'}
              </ThemedText>
            </View>
          </View>
        </Card>

        {/* Category Breakdown */}
        {data.categoryBreakdown.length > 0 && (
          <Card style={styles.sectionCard}>
            <ThemedText variant="h3" style={{ marginBottom: Spacing.md }}>
              Category Distribution
            </ThemedText>

            {data.categoryBreakdown.map((item) => (
              <View key={item.category.id} style={styles.breakdownRow}>
                <View style={styles.breakdownHeader}>
                  <View style={styles.breakdownTitleRow}>
                    <View style={[styles.catDot, { backgroundColor: item.category.color }]} />
                    <ThemedText variant="bodyMedium" style={{ fontWeight: '600' }}>
                      {item.category.name}
                    </ThemedText>
                  </View>
                  <ThemedText variant="caption" secondary>
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
        <Card style={styles.sectionCard}>
          <ThemedText variant="h3" style={{ marginBottom: Spacing.md }}>
            Priority Breakdown
          </ThemedText>

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
                  <ThemedText variant="caption" secondary>
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

        {/* Per-Recurring Task Consistency */}
        {data.recurringConsistency.length > 0 && (
          <Card style={styles.sectionCard}>
            <ThemedText variant="h3" style={{ marginBottom: Spacing.md }}>
              Recurring Habit Consistency
            </ThemedText>

            {data.recurringConsistency.map((item) => (
              <View key={item.taskId} style={styles.breakdownRow}>
                <View style={styles.breakdownHeader}>
                  <ThemedText variant="bodyMedium" style={{ fontWeight: '600' }} numberOfLines={1}>
                    {item.title}
                  </ThemedText>
                  <ThemedText variant="caption" style={{ color: colors.primary, fontWeight: '700' }}>
                    {item.completed}/{item.total} ({item.rate}%)
                  </ThemedText>
                </View>

                <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}>
                  <View
                    style={[
                      styles.progressBar,
                      { width: `${item.rate}%`, backgroundColor: colors.primary },
                    ]}
                  />
                </View>
              </View>
            ))}
          </Card>
        )}
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
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  rangePillsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  rangePill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  streakCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bestStreakBadge: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  ratesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  rateCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  ratePercent: {
    fontWeight: '800',
    marginTop: Spacing.sm,
  },
  sectionCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: Spacing.sm,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: 14,
    height: 90,
    borderRadius: BorderRadius.xs,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: BorderRadius.xs,
  },
  barLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
  },
  insightRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  insightBox: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  breakdownRow: {
    marginBottom: Spacing.md,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  breakdownTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.xs,
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
