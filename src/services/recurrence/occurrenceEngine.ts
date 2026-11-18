import {
  Task,
  RecurrenceRule,
  TaskException,
  TaskOccurrence,
  Category,
} from '@/types';
import { getDatesInRange } from './dateUtils';
import { doesRuleOccurOnDate, buildOccurrencesForDate } from './ruleEngine';

/**
 * Generates occurrences for a single task on a specific date.
 * Pure function: no database or native module dependencies.
 */
export function getOccurrencesForSingleTask(
  task: Task,
  rule: RecurrenceRule | null,
  exceptions: TaskException[],
  targetDate: string,
  category?: Category
): TaskOccurrence[] {
  // 1. Check for rescheduled occurrence targeting targetDate
  const rescheduledToThisDate = exceptions.find(
    (e) => e.exception_type === 'rescheduled' && e.override_date === targetDate
  );

  if (rescheduledToThisDate) {
    return buildOccurrencesForDate(
      task,
      rule,
      rescheduledToThisDate,
      targetDate,
      category
    );
  }

  // 2. Non-recurring task
  if (!rule) {
    if (task.date === targetDate) {
      return buildOccurrencesForDate(task, null, null, targetDate, category);
    }
    return [];
  }

  // 3. Recurring task
  const doesOccur = doesRuleOccurOnDate(rule, targetDate);
  if (!doesOccur) {
    return [];
  }

  // Check if there is an exception for this date
  const exceptionForDate =
    exceptions.find((e) => e.occurrence_date === targetDate) ?? null;

  return buildOccurrencesForDate(task, rule, exceptionForDate, targetDate, category);
}

/**
 * High-level generator that returns all task occurrences for all tasks on a specific date.
 * Pure function: takes in data models, returns sorted occurrences.
 */
export function getOccurrencesForDate(
  tasksWithRules: { task: Task; rule: RecurrenceRule | null }[],
  allExceptions: TaskException[],
  targetDate: string,
  categoriesMap: Map<string, Category> = new Map()
): TaskOccurrence[] {
  const occurrences: TaskOccurrence[] = [];

  // Group exceptions by task_id for efficient lookup
  const exceptionsByTaskId = new Map<string, TaskException[]>();
  for (const ex of allExceptions) {
    const list = exceptionsByTaskId.get(ex.task_id) || [];
    list.push(ex);
    exceptionsByTaskId.set(ex.task_id, list);
  }

  for (const item of tasksWithRules) {
    const taskExceptions = exceptionsByTaskId.get(item.task.id) || [];
    const category = categoriesMap.get(item.task.category_id);
    const itemOccurrences = getOccurrencesForSingleTask(
      item.task,
      item.rule,
      taskExceptions,
      targetDate,
      category
    );
    occurrences.push(...itemOccurrences);
  }

  // Sort: all_day first, then by start_time, then priority
  return occurrences.sort((a, b) => {
    if (a.all_day !== b.all_day) {
      return a.all_day ? -1 : 1;
    }
    if (a.start_time && b.start_time) {
      const timeComp = a.start_time.localeCompare(b.start_time);
      if (timeComp !== 0) return timeComp;
    } else if (a.start_time && !b.start_time) {
      return 1;
    } else if (!a.start_time && b.start_time) {
      return -1;
    }

    const priorityRank = { high: 3, medium: 2, low: 1 };
    return priorityRank[b.priority] - priorityRank[a.priority];
  });
}

/**
 * Returns all task occurrences across a date range.
 * Pure function.
 */
export function getOccurrencesForRange(
  tasksWithRules: { task: Task; rule: RecurrenceRule | null }[],
  allExceptions: TaskException[],
  startDate: string,
  endDate: string,
  categoriesMap: Map<string, Category> = new Map()
): TaskOccurrence[] {
  const dates = getDatesInRange(startDate, endDate);
  const result: TaskOccurrence[] = [];

  const exceptionsByTaskId = new Map<string, TaskException[]>();
  for (const ex of allExceptions) {
    const list = exceptionsByTaskId.get(ex.task_id) || [];
    list.push(ex);
    exceptionsByTaskId.set(ex.task_id, list);
  }

  for (const date of dates) {
    for (const item of tasksWithRules) {
      const taskExceptions = exceptionsByTaskId.get(item.task.id) || [];
      const category = categoriesMap.get(item.task.category_id);
      const occurrences = getOccurrencesForSingleTask(
        item.task,
        item.rule,
        taskExceptions,
        date,
        category
      );
      result.push(...occurrences);
    }
  }

  return result;
}

