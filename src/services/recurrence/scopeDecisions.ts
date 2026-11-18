import {
  Task,
  RecurrenceRule,
  TaskException,
  RecurrenceEditScope,
} from '@/types';
import { addCalendarDays, isDateBefore } from './dateUtils';

export type EditDecision =
  | {
      type: 'add_exception';
      exception: TaskException;
    }
  | {
      type: 'split_recurrence';
      truncatedRule: RecurrenceRule;
      newTask: Task;
      newRule: RecurrenceRule;
      deleteExceptionsFromDate: string;
    }
  | {
      type: 'update_master';
      updatedTask: Task;
    };

export type DeleteDecision =
  | {
      type: 'add_exception';
      exception: TaskException;
    }
  | {
      type: 'truncate_recurrence';
      truncatedRule: RecurrenceRule;
      deleteExceptionsFromDate: string;
    }
  | {
      type: 'delete_all';
      taskId: string;
    };

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
 * Pure calculation that resolves what actions to take when editing a recurring task.
 */
export function resolveRecurringEdit(
  scope: RecurrenceEditScope,
  task: Task,
  rule: RecurrenceRule,
  occurrenceDate: string,
  updates: Partial<Task>,
  timestamp: string = new Date().toISOString()
): EditDecision {
  if (scope === 'this_day') {
    return {
      type: 'add_exception',
      exception: {
        id: generateId(),
        task_id: task.id,
        occurrence_date: occurrenceDate,
        exception_type: 'modified',
        override_title: updates.title,
        override_notes: updates.notes,
        override_start_time: updates.start_time,
        override_end_time: updates.end_time,
        override_all_day: updates.all_day,
        override_subtasks: updates.subtasks,
        created_at: timestamp,
        updated_at: timestamp,
      },
    };
  }

  if (scope === 'this_and_following') {
    const yesterday = addCalendarDays(occurrenceDate, -1);

    if (isDateBefore(yesterday, rule.start_date)) {
      return {
        type: 'update_master',
        updatedTask: { ...task, ...updates, updated_at: timestamp },
      };
    }

    const newTaskId = generateId();
    const newRuleId = generateId();

    return {
      type: 'split_recurrence',
      truncatedRule: {
        ...rule,
        end_type: 'until_date',
        until_date: yesterday,
        updated_at: timestamp,
      },
      newTask: {
        ...task,
        ...updates,
        id: newTaskId,
        date: occurrenceDate,
        recurrence_rule_id: newRuleId,
        created_at: timestamp,
        updated_at: timestamp,
      },
      newRule: {
        ...rule,
        id: newRuleId,
        task_id: newTaskId,
        start_date: occurrenceDate,
        created_at: timestamp,
        updated_at: timestamp,
      },
      deleteExceptionsFromDate: occurrenceDate,
    };
  }

  // all_days
  return {
    type: 'update_master',
    updatedTask: {
      ...task,
      ...updates,
      updated_at: timestamp,
    },
  };
}

/**
 * Pure calculation that resolves what actions to take when deleting a recurring task.
 */
export function resolveRecurringDelete(
  scope: RecurrenceEditScope,
  task: Task,
  rule: RecurrenceRule,
  occurrenceDate: string,
  timestamp: string = new Date().toISOString()
): DeleteDecision {
  if (scope === 'this_day') {
    return {
      type: 'add_exception',
      exception: {
        id: generateId(),
        task_id: task.id,
        occurrence_date: occurrenceDate,
        exception_type: 'deleted',
        created_at: timestamp,
        updated_at: timestamp,
      },
    };
  }

  if (scope === 'this_and_following') {
    const yesterday = addCalendarDays(occurrenceDate, -1);

    if (isDateBefore(yesterday, rule.start_date)) {
      return {
        type: 'delete_all',
        taskId: task.id,
      };
    }

    return {
      type: 'truncate_recurrence',
      truncatedRule: {
        ...rule,
        end_type: 'until_date',
        until_date: yesterday,
        updated_at: timestamp,
      },
      deleteExceptionsFromDate: occurrenceDate,
    };
  }

  return {
    type: 'delete_all',
    taskId: task.id,
  };
}

