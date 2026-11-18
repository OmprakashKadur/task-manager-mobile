import { getDatabase } from './database';
import {
  Task,
  RecurrenceRule,
  TaskException,
  Subtask,
  TimeSlot,
  RecurrenceFrequency,
  RecurrenceEndType,
  ExceptionType,
  Priority,
  TaskStatus,
} from '@/types';

// Helper to deserialize task rows
interface TaskDbRow {
  id: string;
  title: string;
  notes: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  all_day: number;
  category_id: string;
  priority: string;
  subtasks: string;
  reminders: string;
  status: string;
  recurrence_rule_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

function parseTaskRow(row: TaskDbRow): Task {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes ?? undefined,
    date: row.date,
    start_time: row.start_time ?? undefined,
    end_time: row.end_time ?? undefined,
    all_day: row.all_day === 1,
    category_id: row.category_id,
    priority: row.priority as Priority,
    subtasks: JSON.parse(row.subtasks || '[]') as Subtask[],
    reminders: JSON.parse(row.reminders || '[]') as number[],
    status: row.status as TaskStatus,
    recurrence_rule_id: row.recurrence_rule_id ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at ?? undefined,
  };
}

// Helper to deserialize recurrence rules
interface RecurrenceRuleDbRow {
  id: string;
  task_id: string;
  frequency: string;
  interval: number;
  weekdays: string | null;
  month_day: number | null;
  month_week: number | null;
  month_weekday: number | null;
  start_date: string;
  end_type: string;
  until_date: string | null;
  count: number | null;
  time_slots: string | null;
  created_at: string;
  updated_at: string;
}

function parseRecurrenceRuleRow(row: RecurrenceRuleDbRow): RecurrenceRule {
  return {
    id: row.id,
    task_id: row.task_id,
    frequency: row.frequency as RecurrenceFrequency,
    interval: row.interval,
    weekdays: row.weekdays ? JSON.parse(row.weekdays) : undefined,
    month_day: row.month_day ?? undefined,
    month_week: row.month_week ?? undefined,
    month_weekday: row.month_weekday ?? undefined,
    start_date: row.start_date,
    end_type: row.end_type as RecurrenceEndType,
    until_date: row.until_date ?? undefined,
    count: row.count ?? undefined,
    time_slots: row.time_slots ? (JSON.parse(row.time_slots) as TimeSlot[]) : undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Helper to deserialize task exceptions
interface TaskExceptionDbRow {
  id: string;
  task_id: string;
  occurrence_date: string;
  exception_type: string;
  override_title: string | null;
  override_notes: string | null;
  override_start_time: string | null;
  override_end_time: string | null;
  override_all_day: number | null;
  override_date: string | null;
  override_status: string | null;
  override_subtasks: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

function parseExceptionRow(row: TaskExceptionDbRow): TaskException {
  return {
    id: row.id,
    task_id: row.task_id,
    occurrence_date: row.occurrence_date,
    exception_type: row.exception_type as ExceptionType,
    override_title: row.override_title ?? undefined,
    override_notes: row.override_notes ?? undefined,
    override_start_time: row.override_start_time ?? undefined,
    override_end_time: row.override_end_time ?? undefined,
    override_all_day: row.override_all_day != null ? row.override_all_day === 1 : undefined,
    override_date: row.override_date ?? undefined,
    override_status: (row.override_status as TaskStatus) ?? undefined,
    override_subtasks: row.override_subtasks ? JSON.parse(row.override_subtasks) : undefined,
    completed_at: row.completed_at ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/* =========================================================================
   TASK CRUD
========================================================================= */

export function insertTask(task: Task): void {
  const db = getDatabase();
  db.runSync(
    `INSERT INTO tasks (
      id, title, notes, date, start_time, end_time, all_day,
      category_id, priority, subtasks, reminders, status,
      recurrence_rule_id, created_at, updated_at, completed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      task.id,
      task.title,
      task.notes ?? null,
      task.date,
      task.start_time ?? null,
      task.end_time ?? null,
      task.all_day ? 1 : 0,
      task.category_id,
      task.priority,
      JSON.stringify(task.subtasks || []),
      JSON.stringify(task.reminders || []),
      task.status,
      task.recurrence_rule_id ?? null,
      task.created_at,
      task.updated_at,
      task.completed_at ?? null,
    ]
  );
}

export function updateTask(task: Task): void {
  const db = getDatabase();
  db.runSync(
    `UPDATE tasks SET
      title = ?, notes = ?, date = ?, start_time = ?, end_time = ?,
      all_day = ?, category_id = ?, priority = ?, subtasks = ?,
      reminders = ?, status = ?, recurrence_rule_id = ?,
      updated_at = ?, completed_at = ?
     WHERE id = ?`,
    [
      task.title,
      task.notes ?? null,
      task.date,
      task.start_time ?? null,
      task.end_time ?? null,
      task.all_day ? 1 : 0,
      task.category_id,
      task.priority,
      JSON.stringify(task.subtasks || []),
      JSON.stringify(task.reminders || []),
      task.status,
      task.recurrence_rule_id ?? null,
      task.updated_at,
      task.completed_at ?? null,
      task.id,
    ]
  );
}

export function deleteTask(taskId: string): void {
  const db = getDatabase();
  db.withTransactionSync(() => {
    // Delete associated exceptions and recurrence rules
    db.runSync('DELETE FROM task_exceptions WHERE task_id = ?', [taskId]);
    db.runSync('DELETE FROM recurrence_rules WHERE task_id = ?', [taskId]);
    db.runSync('DELETE FROM tasks WHERE id = ?', [taskId]);
  });
}

export function getTaskById(taskId: string): Task | null {
  const db = getDatabase();
  const row = db.getFirstSync<TaskDbRow>('SELECT * FROM tasks WHERE id = ?', [taskId]);
  return row ? parseTaskRow(row) : null;
}

export function getAllTasks(): Task[] {
  const db = getDatabase();
  const rows = db.getAllSync<TaskDbRow>('SELECT * FROM tasks ORDER BY date ASC');
  return rows.map(parseTaskRow);
}

export function getSingleDayTasks(date: string): Task[] {
  const db = getDatabase();
  const rows = db.getAllSync<TaskDbRow>(
    'SELECT * FROM tasks WHERE date = ? AND recurrence_rule_id IS NULL ORDER BY start_time ASC',
    [date]
  );
  return rows.map(parseTaskRow);
}

export function getSingleDayTasksInRange(startDate: string, endDate: string): Task[] {
  const db = getDatabase();
  const rows = db.getAllSync<TaskDbRow>(
    'SELECT * FROM tasks WHERE date >= ? AND date <= ? AND recurrence_rule_id IS NULL ORDER BY date ASC, start_time ASC',
    [startDate, endDate]
  );
  return rows.map(parseTaskRow);
}

export function getRecurringTasks(): { task: Task; rule: RecurrenceRule }[] {
  const db = getDatabase();
  const rows = db.getAllSync<{
    // Task columns
    t_id: string;
    t_title: string;
    t_notes: string | null;
    t_date: string;
    t_start_time: string | null;
    t_end_time: string | null;
    t_all_day: number;
    t_category_id: string;
    t_priority: string;
    t_subtasks: string;
    t_reminders: string;
    t_status: string;
    t_recurrence_rule_id: string | null;
    t_created_at: string;
    t_updated_at: string;
    t_completed_at: string | null;
    // Rule columns
    r_id: string;
    r_task_id: string;
    r_frequency: string;
    r_interval: number;
    r_weekdays: string | null;
    r_month_day: number | null;
    r_month_week: number | null;
    r_month_weekday: number | null;
    r_start_date: string;
    r_end_type: string;
    r_until_date: string | null;
    r_count: number | null;
    r_time_slots: string | null;
    r_created_at: string;
    r_updated_at: string;
  }>(`
    SELECT
      t.id as t_id, t.title as t_title, t.notes as t_notes, t.date as t_date,
      t.start_time as t_start_time, t.end_time as t_end_time, t.all_day as t_all_day,
      t.category_id as t_category_id, t.priority as t_priority, t.subtasks as t_subtasks,
      t.reminders as t_reminders, t.status as t_status, t.recurrence_rule_id as t_recurrence_rule_id,
      t.created_at as t_created_at, t.updated_at as t_updated_at, t.completed_at as t_completed_at,
      r.id as r_id, r.task_id as r_task_id, r.frequency as r_frequency, r.interval as r_interval,
      r.weekdays as r_weekdays, r.month_day as r_month_day, r.month_week as r_month_week,
      r.month_weekday as r_month_weekday, r.start_date as r_start_date, r.end_type as r_end_type,
      r.until_date as r_until_date, r.count as r_count, r.time_slots as r_time_slots,
      r.created_at as r_created_at, r.updated_at as r_updated_at
    FROM tasks t
    INNER JOIN recurrence_rules r ON t.recurrence_rule_id = r.id
  `);

  return rows.map((r) => ({
    task: parseTaskRow({
      id: r.t_id,
      title: r.t_title,
      notes: r.t_notes,
      date: r.t_date,
      start_time: r.t_start_time,
      end_time: r.t_end_time,
      all_day: r.t_all_day,
      category_id: r.t_category_id,
      priority: r.t_priority,
      subtasks: r.t_subtasks,
      reminders: r.t_reminders,
      status: r.t_status,
      recurrence_rule_id: r.t_recurrence_rule_id,
      created_at: r.t_created_at,
      updated_at: r.t_updated_at,
      completed_at: r.t_completed_at,
    }),
    rule: parseRecurrenceRuleRow({
      id: r.r_id,
      task_id: r.r_task_id,
      frequency: r.r_frequency,
      interval: r.r_interval,
      weekdays: r.r_weekdays,
      month_day: r.r_month_day,
      month_week: r.r_month_week,
      month_weekday: r.r_month_weekday,
      start_date: r.r_start_date,
      end_type: r.r_end_type,
      until_date: r.r_until_date,
      count: r.r_count,
      time_slots: r.r_time_slots,
      created_at: r.r_created_at,
      updated_at: r.r_updated_at,
    }),
  }));
}

/* =========================================================================
   RECURRENCE RULE CRUD
========================================================================= */

export function insertRecurrenceRule(rule: RecurrenceRule): void {
  const db = getDatabase();
  db.runSync(
    `INSERT INTO recurrence_rules (
      id, task_id, frequency, interval, weekdays, month_day, month_week,
      month_weekday, start_date, end_type, until_date, count, time_slots,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      rule.id,
      rule.task_id,
      rule.frequency,
      rule.interval,
      rule.weekdays ? JSON.stringify(rule.weekdays) : null,
      rule.month_day ?? null,
      rule.month_week ?? null,
      rule.month_weekday ?? null,
      rule.start_date,
      rule.end_type,
      rule.until_date ?? null,
      rule.count ?? null,
      rule.time_slots ? JSON.stringify(rule.time_slots) : null,
      rule.created_at,
      rule.updated_at,
    ]
  );
}

export function updateRecurrenceRule(rule: RecurrenceRule): void {
  const db = getDatabase();
  db.runSync(
    `UPDATE recurrence_rules SET
      frequency = ?, interval = ?, weekdays = ?, month_day = ?,
      month_week = ?, month_weekday = ?, start_date = ?, end_type = ?,
      until_date = ?, count = ?, time_slots = ?, updated_at = ?
     WHERE id = ?`,
    [
      rule.frequency,
      rule.interval,
      rule.weekdays ? JSON.stringify(rule.weekdays) : null,
      rule.month_day ?? null,
      rule.month_week ?? null,
      rule.month_weekday ?? null,
      rule.start_date,
      rule.end_type,
      rule.until_date ?? null,
      rule.count ?? null,
      rule.time_slots ? JSON.stringify(rule.time_slots) : null,
      rule.updated_at,
      rule.id,
    ]
  );
}

export function getRecurrenceRuleByTaskId(taskId: string): RecurrenceRule | null {
  const db = getDatabase();
  const row = db.getFirstSync<RecurrenceRuleDbRow>(
    'SELECT * FROM recurrence_rules WHERE task_id = ?',
    [taskId]
  );
  return row ? parseRecurrenceRuleRow(row) : null;
}

export function deleteRecurrenceRule(id: string): void {
  const db = getDatabase();
  db.runSync('DELETE FROM recurrence_rules WHERE id = ?', [id]);
}

/* =========================================================================
   TASK EXCEPTIONS CRUD
========================================================================= */

export function upsertTaskException(exception: TaskException): void {
  const db = getDatabase();
  db.runSync(
    `INSERT INTO task_exceptions (
      id, task_id, occurrence_date, exception_type, override_title,
      override_notes, override_start_time, override_end_time, override_all_day,
      override_date, override_status, override_subtasks, completed_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(task_id, occurrence_date) DO UPDATE SET
      exception_type = excluded.exception_type,
      override_title = excluded.override_title,
      override_notes = excluded.override_notes,
      override_start_time = excluded.override_start_time,
      override_end_time = excluded.override_end_time,
      override_all_day = excluded.override_all_day,
      override_date = excluded.override_date,
      override_status = excluded.override_status,
      override_subtasks = excluded.override_subtasks,
      completed_at = excluded.completed_at,
      updated_at = excluded.updated_at`,
    [
      exception.id,
      exception.task_id,
      exception.occurrence_date,
      exception.exception_type,
      exception.override_title ?? null,
      exception.override_notes ?? null,
      exception.override_start_time ?? null,
      exception.override_end_time ?? null,
      exception.override_all_day != null ? (exception.override_all_day ? 1 : 0) : null,
      exception.override_date ?? null,
      exception.override_status ?? null,
      exception.override_subtasks ? JSON.stringify(exception.override_subtasks) : null,
      exception.completed_at ?? null,
      exception.created_at,
      exception.updated_at,
    ]
  );
}

export function getExceptionsByTaskId(taskId: string): TaskException[] {
  const db = getDatabase();
  const rows = db.getAllSync<TaskExceptionDbRow>(
    'SELECT * FROM task_exceptions WHERE task_id = ? ORDER BY occurrence_date ASC',
    [taskId]
  );
  return rows.map(parseExceptionRow);
}

export function getExceptionsForDateRange(startDate: string, endDate: string): TaskException[] {
  const db = getDatabase();
  const rows = db.getAllSync<TaskExceptionDbRow>(
    `SELECT * FROM task_exceptions
     WHERE occurrence_date >= ? AND occurrence_date <= ?
     ORDER BY occurrence_date ASC`,
    [startDate, endDate]
  );
  return rows.map(parseExceptionRow);
}

export function getExceptionForOccurrence(taskId: string, occurrenceDate: string): TaskException | null {
  const db = getDatabase();
  const row = db.getFirstSync<TaskExceptionDbRow>(
    'SELECT * FROM task_exceptions WHERE task_id = ? AND occurrence_date = ?',
    [taskId, occurrenceDate]
  );
  return row ? parseExceptionRow(row) : null;
}

export function deleteException(taskId: string, occurrenceDate: string): void {
  const db = getDatabase();
  db.runSync(
    'DELETE FROM task_exceptions WHERE task_id = ? AND occurrence_date = ?',
    [taskId, occurrenceDate]
  );
}

export function deleteExceptionsFollowing(taskId: string, fromDate: string): void {
  const db = getDatabase();
  db.runSync(
    'DELETE FROM task_exceptions WHERE task_id = ? AND occurrence_date >= ?',
    [taskId, fromDate]
  );
}

/* =========================================================================
   CLEAR ALL DATA (FOR SETTINGS BACKUP / RESET)
========================================================================= */

export function clearAllData(): void {
  const db = getDatabase();
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM task_exceptions');
    db.runSync('DELETE FROM recurrence_rules');
    db.runSync('DELETE FROM tasks');
    // keep default categories and settings
  });
}

