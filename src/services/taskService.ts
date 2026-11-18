import {
  Task,
  RecurrenceRule,
  TaskOccurrence,
  RecurrenceEditScope,
  TaskStatus,
  Category,
} from '@/types';
import {
  getOccurrencesForDate as pureGetOccurrencesForDate,
  getOccurrencesForRange as pureGetOccurrencesForRange,
  resolveRecurringEdit,
  resolveRecurringDelete,
} from './recurrence';
import {
  getRecurringTasks,
  getSingleDayTasks,
  getSingleDayTasksInRange,
  getExceptionsForDateRange,
  insertTask,
  updateTask,
  deleteTask,
  insertRecurrenceRule,
  updateRecurrenceRule,
  upsertTaskException,
  deleteExceptionsFollowing,
} from '@/db/tasks';
import { getAllCategories } from '@/db/categories';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Loads all tasks (single day + recurring) and computes occurrences for targetDate.
 */
export function loadOccurrencesForDate(targetDate: string): TaskOccurrence[] {
  const singleDayTasks = getSingleDayTasks(targetDate);
  const recurringTasks = getRecurringTasks();
  const exceptions = getExceptionsForDateRange(targetDate, targetDate);
  const categories = getAllCategories();

  const categoriesMap = new Map<string, Category>(
    categories.map((c) => [c.id, c])
  );

  const tasksWithRules: { task: Task; rule: RecurrenceRule | null }[] = [
    ...singleDayTasks.map((t) => ({ task: t, rule: null })),
    ...recurringTasks.map((r) => ({ task: r.task, rule: r.rule })),
  ];

  return pureGetOccurrencesForDate(tasksWithRules, exceptions, targetDate, categoriesMap);
}

/**
 * Loads occurrences across a range (e.g. for Month view in Calendar or rolling 14 days).
 */
export function loadOccurrencesForRange(startDate: string, endDate: string): TaskOccurrence[] {
  const singleDayTasks = getSingleDayTasksInRange(startDate, endDate);
  const recurringTasks = getRecurringTasks();
  const exceptions = getExceptionsForDateRange(startDate, endDate);
  const categories = getAllCategories();

  const categoriesMap = new Map<string, Category>(
    categories.map((c) => [c.id, c])
  );

  const tasksWithRules: { task: Task; rule: RecurrenceRule | null }[] = [
    ...singleDayTasks.map((t) => ({ task: t, rule: null })),
    ...recurringTasks.map((r) => ({ task: r.task, rule: r.rule })),
  ];

  return pureGetOccurrencesForRange(tasksWithRules, exceptions, startDate, endDate, categoriesMap);
}

/**
 * Toggles completion status for an occurrence.
 * Recurring task completions are isolated to task_exceptions.
 */
export function toggleTaskOccurrence(
  task: Task,
  occurrenceDate: string,
  currentStatus: TaskStatus
): void {
  const newStatus: TaskStatus = currentStatus === 'done' ? 'pending' : 'done';
  const now = new Date().toISOString();
  const completedAt = newStatus === 'done' ? now : undefined;

  if (!task.recurrence_rule_id) {
    updateTask({
      ...task,
      status: newStatus,
      completed_at: completedAt,
      updated_at: now,
    });
    return;
  }

  upsertTaskException({
    id: generateId(),
    task_id: task.id,
    occurrence_date: occurrenceDate,
    exception_type: 'completed',
    override_status: newStatus,
    completed_at: completedAt,
    created_at: now,
    updated_at: now,
  });
}

/**
 * Applies recurring task edit using pure scope decisions.
 */
export function editRecurringTaskWithScope(
  scope: RecurrenceEditScope,
  task: Task,
  rule: RecurrenceRule,
  occurrenceDate: string,
  updates: Partial<Task>,
  updatedRule?: Partial<RecurrenceRule>
): void {
  const decision = resolveRecurringEdit(scope, task, rule, occurrenceDate, updates);

  if (decision.type === 'add_exception') {
    upsertTaskException(decision.exception);
  } else if (decision.type === 'split_recurrence') {
    updateRecurrenceRule(decision.truncatedRule);
    deleteExceptionsFollowing(task.id, decision.deleteExceptionsFromDate);
    // Insert new recurrence rule BEFORE task to satisfy FOREIGN KEY constraint
    insertRecurrenceRule(decision.newRule);
    insertTask(decision.newTask);
  } else if (decision.type === 'update_master') {
    updateTask(decision.updatedTask);
    if (updatedRule) {
      updateRecurrenceRule({
        ...rule,
        ...updatedRule,
        updated_at: new Date().toISOString(),
      });
    }
  }
}

/**
 * Applies recurring task delete using pure scope decisions.
 */
export function deleteRecurringTaskWithScope(
  scope: RecurrenceEditScope,
  task: Task,
  rule: RecurrenceRule,
  occurrenceDate: string
): void {
  const decision = resolveRecurringDelete(scope, task, rule, occurrenceDate);

  if (decision.type === 'add_exception') {
    upsertTaskException(decision.exception);
  } else if (decision.type === 'truncate_recurrence') {
    updateRecurrenceRule(decision.truncatedRule);
    deleteExceptionsFollowing(task.id, decision.deleteExceptionsFromDate);
  } else if (decision.type === 'delete_all') {
    deleteTask(decision.taskId);
  }
}
