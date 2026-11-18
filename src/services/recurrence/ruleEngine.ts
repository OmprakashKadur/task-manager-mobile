import {
  RecurrenceRule,
  Task,
  TaskOccurrence,
  TaskException,
  TaskTimePeriod,
  Category,
} from '@/types';
import {
  addCalendarDays,
  differenceInCalendarDays,
  getDayOfWeek,
  getDaysInMonth,
  getNthWeekdayOfMonth,
  isDateAfter,
  isDateBefore,
  parseLocalDate,
  getTodayLocalDate,
} from './dateUtils';

/**
 * Categorizes a task occurrence into Morning, Afternoon, Evening, or Anytime
 * based on its start_time and all_day flag.
 */
export function determineTimePeriod(allDay: boolean, startTime?: string): TaskTimePeriod {
  if (allDay || !startTime) {
    return 'anytime';
  }

  const [hourStr] = startTime.split(':');
  const hour = parseInt(hourStr, 10);

  if (hour < 12) {
    return 'morning';
  }
  if (hour < 17) {
    return 'afternoon';
  }
  return 'evening';
}

/**
 * Determines if a task is overdue relative to today and the current time.
 */
export function checkIsOverdue(
  date: string,
  status: string,
  endTime?: string,
  startTime?: string
): boolean {
  if (status !== 'pending') return false;

  const today = getTodayLocalDate();
  if (date < today) return true;

  if (date === today) {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const timeToCompare = endTime || startTime;

    if (timeToCompare) {
      const [hStr, mStr] = timeToCompare.split(':');
      const taskH = parseInt(hStr, 10);
      const taskM = parseInt(mStr || '0', 10);
      if (currentHour > taskH || (currentHour === taskH && currentMin > taskM)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks whether a recurrence rule matches a specific calendar date (ignoring count limit).
 */
export function doesRulePatternMatchDate(rule: RecurrenceRule, date: string): boolean {
  // 1. Must be on or after start_date
  if (isDateBefore(date, rule.start_date)) {
    return false;
  }

  // 2. Must not be after until_date (if end_type is until_date or date_range)
  if (
    (rule.end_type === 'until_date' || rule.frequency === 'date_range') &&
    rule.until_date &&
    isDateAfter(date, rule.until_date)
  ) {
    return false;
  }

  const interval = rule.interval > 0 ? rule.interval : 1;

  switch (rule.frequency) {
    case 'daily':
    case 'custom_days': {
      const diffDays = differenceInCalendarDays(date, rule.start_date);
      return diffDays >= 0 && diffDays % interval === 0;
    }

    case 'date_range': {
      const diffDays = differenceInCalendarDays(date, rule.start_date);
      return diffDays >= 0 && diffDays % interval === 0;
    }

    case 'weekly': {
      const weekdays =
        rule.weekdays && rule.weekdays.length > 0
          ? rule.weekdays
          : [getDayOfWeek(rule.start_date)];

      const dow = getDayOfWeek(date);
      if (!weekdays.includes(dow)) {
        return false;
      }

      if (interval === 1) {
        return true;
      }

      // For interval > 1, check week-block alignment relative to start_date week
      const startDow = getDayOfWeek(rule.start_date);
      const startWeekMonday = addCalendarDays(rule.start_date, -((startDow + 6) % 7));
      const targetDow = getDayOfWeek(date);
      const targetWeekMonday = addCalendarDays(date, -((targetDow + 6) % 7));

      const diffWeeks = Math.round(
        differenceInCalendarDays(targetWeekMonday, startWeekMonday) / 7
      );
      return diffWeeks >= 0 && diffWeeks % interval === 0;
    }

    case 'monthly': {
      const targetDateObj = parseLocalDate(date);
      const startDateObj = parseLocalDate(rule.start_date);

      const targetY = targetDateObj.getFullYear();
      const targetM = targetDateObj.getMonth() + 1; // 1-12
      const targetD = targetDateObj.getDate();

      const startY = startDateObj.getFullYear();
      const startM = startDateObj.getMonth() + 1;
      const startD = startDateObj.getDate();

      const monthsDiff = (targetY - startY) * 12 + (targetM - startM);
      if (monthsDiff < 0 || monthsDiff % interval !== 0) {
        return false;
      }

      // Check by nth weekday (e.g. 2nd Tuesday)
      if (rule.month_week != null && rule.month_weekday != null) {
        const expectedDay = getNthWeekdayOfMonth(
          targetY,
          targetM,
          rule.month_weekday,
          rule.month_week
        );
        return targetD === expectedDay;
      }

      // Check by month day (e.g. 15th)
      const targetDaySetting = rule.month_day || startD;
      const maxDaysInMonth = getDaysInMonth(targetY, targetM);
      const expectedDay = Math.min(targetDaySetting, maxDaysInMonth);
      return targetD === expectedDay;
    }

    case 'yearly': {
      const targetDateObj = parseLocalDate(date);
      const startDateObj = parseLocalDate(rule.start_date);

      const targetY = targetDateObj.getFullYear();
      const startY = startDateObj.getFullYear();

      const yearsDiff = targetY - startY;
      if (yearsDiff < 0 || yearsDiff % interval !== 0) {
        return false;
      }

      return (
        targetDateObj.getMonth() === startDateObj.getMonth() &&
        targetDateObj.getDate() === startDateObj.getDate()
      );
    }

    default:
      return false;
  }
}

/**
 * Counts how many occurrences happen from rule.start_date up to targetDate inclusive.
 */
export function countOccurrencesUpToDate(rule: RecurrenceRule, targetDate: string): number {
  if (isDateBefore(targetDate, rule.start_date)) return 0;

  let count = 0;
  let current = rule.start_date;

  while (current <= targetDate) {
    if (doesRulePatternMatchDate(rule, current)) {
      count++;
    }
    current = addCalendarDays(current, 1);
  }

  return count;
}

/**
 * Checks if a rule occurs on a given date, including counting constraints.
 */
export function doesRuleOccurOnDate(rule: RecurrenceRule, date: string): boolean {
  if (!doesRulePatternMatchDate(rule, date)) {
    return false;
  }

  if (rule.end_type === 'count' && rule.count != null && rule.count > 0) {
    const occurrenceIndex = countOccurrencesUpToDate(rule, date);
    if (occurrenceIndex > rule.count) {
      return false;
    }
  }

  return true;
}

/**
 * Builds task occurrences for a matching date, applying any exception overrides
 * and handling multiple time slots.
 */
export function buildOccurrencesForDate(
  task: Task,
  rule: RecurrenceRule | null,
  exception: TaskException | null,
  date: string,
  category?: Category
): TaskOccurrence[] {
  // If the exception marks the occurrence as deleted, return empty
  if (exception?.exception_type === 'deleted') {
    return [];
  }

  // Determine effective task fields after applying exception overrides
  const effectiveTitle = exception?.override_title ?? task.title;
  const effectiveNotes = exception?.override_notes ?? task.notes;
  const effectiveAllDay = exception?.override_all_day ?? task.all_day;
  const effectiveSubtasks = exception?.override_subtasks ?? task.subtasks;
  const effectiveStatus = exception?.override_status ?? (exception?.completed_at ? 'done' : task.status);
  const effectiveCompletedAt = exception?.completed_at ?? task.completed_at;

  const isRecurring = rule !== null;

  // Handle multiple time slots if defined on the rule and not overridden by exception
  const slots =
    !exception?.override_start_time && rule?.time_slots && rule.time_slots.length > 0
      ? rule.time_slots
      : [
          {
            start_time: exception?.override_start_time ?? task.start_time,
            end_time: exception?.override_end_time ?? task.end_time,
          },
        ];

  return slots.map((slot, idx) => {
    const slotSuffix = slots.length > 1 ? `_slot${idx}` : '';
    const occurrenceId = `${task.id}_${date}${slotSuffix}`;
    const startTime = slot.start_time;
    const endTime = slot.end_time;
    const timePeriod = determineTimePeriod(effectiveAllDay, startTime);
    const isOverdue = checkIsOverdue(date, effectiveStatus, endTime, startTime);

    return {
      id: occurrenceId,
      task_id: task.id,
      date,
      title: effectiveTitle,
      notes: effectiveNotes,
      start_time: startTime,
      end_time: endTime,
      all_day: effectiveAllDay,
      category_id: task.category_id,
      category,
      priority: task.priority,
      subtasks: effectiveSubtasks,
      reminders: task.reminders,
      status: effectiveStatus,
      is_recurring: isRecurring,
      recurrence_rule: rule ?? undefined,
      has_exception: exception !== null,
      exception: exception ?? undefined,
      completed_at: effectiveCompletedAt,
      time_period: timePeriod,
      is_overdue: isOverdue,
    };
  });
}
