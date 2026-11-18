import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  parseISO,
} from 'date-fns';
import { TaskOccurrence, Priority, Category } from '@/types';
import { loadOccurrencesForRange } from './taskService';
import { getTodayLocalDate } from './recurrence/dateUtils';
import { getAllCategories } from '@/db/categories';

export interface CompletionStats {
  total: number;
  completed: number;
  pending: number;
  skipped: number;
  rate: number; // 0 - 100
}

export interface DayBarData {
  dayName: string;
  dateStr: string;
  completed: number;
  missed: number;
  total: number;
}

export interface CategoryBreakdown {
  category: Category;
  total: number;
  completed: number;
  percentage: number;
}

export interface PriorityBreakdown {
  priority: Priority;
  total: number;
  completed: number;
  rate: number;
}

export interface RecurringConsistency {
  taskId: string;
  title: string;
  category?: Category;
  total: number;
  completed: number;
  rate: number;
}

export interface ProductivityInsights {
  mostProductivePeriod: 'morning' | 'afternoon' | 'evening' | 'anytime' | null;
  mostProductiveDayOfWeek: string | null;
  periodCounts: Record<string, number>;
  weekdayCounts: Record<string, number>;
}

export interface AnalyticsData {
  todayStats: CompletionStats;
  weekStats: CompletionStats;
  monthStats: CompletionStats;
  rangeStats: CompletionStats;
  currentStreak: number;
  bestStreak: number;
  weeklyBarData: DayBarData[];
  categoryBreakdown: CategoryBreakdown[];
  priorityBreakdown: PriorityBreakdown[];
  recurringConsistency: RecurringConsistency[];
  insights: ProductivityInsights;
}

/**
 * Computes completion statistics for a list of task occurrences.
 */
function computeStats(occurrences: TaskOccurrence[]): CompletionStats {
  const total = occurrences.length;
  if (total === 0) {
    return { total: 0, completed: 0, pending: 0, skipped: 0, rate: 0 };
  }

  const completed = occurrences.filter((o) => o.status === 'done').length;
  const skipped = occurrences.filter((o) => o.status === 'skipped').length;
  const pending = total - completed - skipped;
  const rate = Math.round((completed / total) * 100);

  return { total, completed, pending, skipped, rate };
}

/**
 * Calculates current and best daily completion streaks.
 * A day is considered successful if all scheduled tasks on that day were completed
 * (minimum 1 task, 100% completion rate).
 */
export function calculateStreaks(
  allOccurrencesPast60Days: TaskOccurrence[],
  todayStr: string
): { currentStreak: number; bestStreak: number } {
  // Group by date
  const byDate = new Map<string, TaskOccurrence[]>();
  for (const occ of allOccurrencesPast60Days) {
    const list = byDate.get(occ.date) || [];
    list.push(occ);
    byDate.set(occ.date, list);
  }

  let currentStreak = 0;
  let bestStreak = 0;
  let runningStreak = 0;

  // Evaluate each day backwards from yesterday (or today if today is fully completed)
  const todayTasks = byDate.get(todayStr) || [];
  const todayFinished =
    todayTasks.length > 0 && todayTasks.every((t) => t.status === 'done');

  if (todayFinished) {
    currentStreak++;
    runningStreak++;
  }

  // Iterate backwards from yesterday up to 60 days
  let checkDate = subDays(parseISO(todayStr), 1);
  let streakActive = true;

  for (let i = 1; i <= 60; i++) {
    const dateStr = format(checkDate, 'yyyy-MM-dd');
    const tasks = byDate.get(dateStr) || [];

    if (tasks.length > 0) {
      const allDone = tasks.every((t) => t.status === 'done');
      if (allDone) {
        runningStreak++;
        if (streakActive) {
          currentStreak++;
        }
      } else {
        streakActive = false;
        runningStreak = 0;
      }
    } else {
      // Days with 0 tasks don't break the streak
    }

    if (runningStreak > bestStreak) {
      bestStreak = runningStreak;
    }

    checkDate = subDays(checkDate, 1);
  }

  bestStreak = Math.max(bestStreak, currentStreak);
  return { currentStreak, bestStreak };
}

/**
 * Computes all analytics metrics for the requested range (7, 30, 90 days or custom).
 */
export function computeAnalytics(
  rangeDays: number = 7,
  customStart?: string,
  customEnd?: string
): AnalyticsData {
  const todayStr = getTodayLocalDate();
  const todayDate = parseISO(todayStr);

  const startDateStr =
    customStart || format(subDays(todayDate, rangeDays - 1), 'yyyy-MM-dd');
  const endDateStr = customEnd || todayStr;

  // 1. Load occurrences for selected range + past 60 days for streaks
  const rangeOccurrences = loadOccurrencesForRange(startDateStr, endDateStr);

  const streakStartDateStr = format(subDays(todayDate, 60), 'yyyy-MM-dd');
  const streakOccurrences = loadOccurrencesForRange(streakStartDateStr, todayStr);

  // 2. Today, Week, Month stats
  const todayOccurrences = rangeOccurrences.filter((o) => o.date === todayStr);

  const weekStart = format(startOfWeek(todayDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(todayDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekOccurrences = loadOccurrencesForRange(weekStart, weekEnd);

  const monthStart = format(startOfMonth(todayDate), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(todayDate), 'yyyy-MM-dd');
  const monthOccurrences = loadOccurrencesForRange(monthStart, monthEnd);

  const todayStats = computeStats(todayOccurrences);
  const weekStats = computeStats(weekOccurrences);
  const monthStats = computeStats(monthOccurrences);
  const rangeStats = computeStats(rangeOccurrences);

  // 3. Streaks
  const { currentStreak, bestStreak } = calculateStreaks(streakOccurrences, todayStr);

  // 4. Weekly Bar Chart (Past 7 days)
  const past7Days = eachDayOfInterval({
    start: subDays(todayDate, 6),
    end: todayDate,
  });

  const weeklyBarData: DayBarData[] = past7Days.map((d) => {
    const dStr = format(d, 'yyyy-MM-dd');
    const dayName = format(d, 'EEE'); // Mon, Tue, etc.
    const dayTasks = rangeOccurrences.filter((o) => o.date === dStr);
    const completed = dayTasks.filter((o) => o.status === 'done').length;
    const missed = dayTasks.filter((o) => o.status !== 'done').length;

    return {
      dayName,
      dateStr: dStr,
      completed,
      missed,
      total: dayTasks.length,
    };
  });

  // 5. Category Breakdown
  const categories = getAllCategories();
  const categoryBreakdown: CategoryBreakdown[] = categories
    .map((cat) => {
      const catTasks = rangeOccurrences.filter((o) => o.category_id === cat.id);
      const completed = catTasks.filter((o) => o.status === 'done').length;
      const total = catTasks.length;
      const percentage =
        rangeOccurrences.length > 0
          ? Math.round((total / rangeOccurrences.length) * 100)
          : 0;

      return {
        category: cat,
        total,
        completed,
        percentage,
      };
    })
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  // 6. Priority Breakdown
  const priorities: Priority[] = ['high', 'medium', 'low'];
  const priorityBreakdown: PriorityBreakdown[] = priorities.map((p) => {
    const pTasks = rangeOccurrences.filter((o) => o.priority === p);
    const completed = pTasks.filter((o) => o.status === 'done').length;
    const total = pTasks.length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { priority: p, total, completed, rate };
  });

  // 7. Recurring Task Consistency
  const recurringMap = new Map<string, TaskOccurrence[]>();
  for (const occ of rangeOccurrences) {
    if (occ.is_recurring) {
      const list = recurringMap.get(occ.task_id) || [];
      list.push(occ);
      recurringMap.set(occ.task_id, list);
    }
  }

  const recurringConsistency: RecurringConsistency[] = [];
  recurringMap.forEach((tasks, taskId) => {
    const first = tasks[0];
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'done').length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    recurringConsistency.push({
      taskId,
      title: first.title,
      category: first.category,
      total,
      completed,
      rate,
    });
  });

  recurringConsistency.sort((a, b) => b.total - a.total);

  // 8. Productivity Insights (Best time of day & Best day of week)
  const periodCounts: Record<string, number> = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    anytime: 0,
  };
  const weekdayCounts: Record<string, number> = {
    Mon: 0,
    Tue: 0,
    Wed: 0,
    Thu: 0,
    Fri: 0,
    Sat: 0,
    Sun: 0,
  };

  for (const occ of rangeOccurrences) {
    if (occ.status === 'done') {
      periodCounts[occ.time_period] = (periodCounts[occ.time_period] || 0) + 1;
      const dayName = format(parseISO(occ.date), 'EEE');
      weekdayCounts[dayName] = (weekdayCounts[dayName] || 0) + 1;
    }
  }

  let bestPeriod: 'morning' | 'afternoon' | 'evening' | 'anytime' | null = null;
  let maxPeriodCount = 0;
  for (const [period, count] of Object.entries(periodCounts)) {
    if (count > maxPeriodCount) {
      maxPeriodCount = count;
      bestPeriod = period as any;
    }
  }

  let bestDay: string | null = null;
  let maxDayCount = 0;
  for (const [day, count] of Object.entries(weekdayCounts)) {
    if (count > maxDayCount) {
      maxDayCount = count;
      bestDay = day;
    }
  }

  return {
    todayStats,
    weekStats,
    monthStats,
    rangeStats,
    currentStreak,
    bestStreak,
    weeklyBarData,
    categoryBreakdown,
    priorityBreakdown,
    recurringConsistency,
    insights: {
      mostProductivePeriod: bestPeriod,
      mostProductiveDayOfWeek: bestDay,
      periodCounts,
      weekdayCounts,
    },
  };
}

