export type Priority = 'low' | 'medium' | 'high';

export type TaskStatus = 'pending' | 'done' | 'skipped';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TimeSlot {
  id?: string;
  start_time: string; // HH:mm
  end_time?: string;   // HH:mm
}

export type RecurrenceFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom_days'
  | 'date_range';

export type RecurrenceEndType = 'never' | 'until_date' | 'count';

export interface RecurrenceRule {
  id: string;
  task_id: string;
  frequency: RecurrenceFrequency;
  interval: number; // e.g. every 1 day, every 2 weeks
  weekdays?: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  month_day?: number; // 1-31
  month_week?: number; // 1-5, or -1 for last
  month_weekday?: number; // 0-6
  start_date: string; // YYYY-MM-DD
  end_type: RecurrenceEndType;
  until_date?: string; // YYYY-MM-DD
  count?: number; // total occurrences
  time_slots?: TimeSlot[];
  created_at: string;
  updated_at: string;
}

export type ExceptionType =
  | 'completed'
  | 'skipped'
  | 'rescheduled'
  | 'modified'
  | 'deleted';

export interface TaskException {
  id: string;
  task_id: string;
  occurrence_date: string; // YYYY-MM-DD of the target occurrence
  exception_type: ExceptionType;
  override_title?: string;
  override_notes?: string;
  override_start_time?: string;
  override_end_time?: string;
  override_all_day?: boolean;
  override_date?: string; // If rescheduled to another date
  override_status?: TaskStatus;
  override_subtasks?: Subtask[];
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  date: string; // YYYY-MM-DD
  start_time?: string; // HH:mm
  end_time?: string; // HH:mm
  all_day: boolean;
  category_id: string;
  priority: Priority;
  subtasks: Subtask[];
  reminders: number[]; // e.g. [0, 15, 30] minutes before
  status: TaskStatus;
  recurrence_rule_id?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  is_default: boolean;
  sort_order: number;
}

export type ThemeMode = 'system' | 'light' | 'dark';

export interface AppSettings {
  theme_mode: ThemeMode;
  default_reminder_minutes: number;
  week_start_day: 0 | 1; // 0 = Sunday, 1 = Monday
  morning_summary_enabled: boolean;
  morning_summary_time: string; // HH:mm
  sound_enabled: boolean;
  haptics_enabled: boolean;
  user_name: string;
  device_id: string;
  last_ping_timestamp: string;
}

export type TaskTimePeriod = 'morning' | 'afternoon' | 'evening' | 'anytime';

export interface TaskOccurrence {
  id: string; // unique occurrence key: task_id + '_' + occurrence_date + '_' + slot_idx
  task_id: string;
  date: string; // YYYY-MM-DD
  title: string;
  notes?: string;
  start_time?: string;
  end_time?: string;
  all_day: boolean;
  category_id: string;
  category?: Category;
  priority: Priority;
  subtasks: Subtask[];
  reminders: number[];
  status: TaskStatus;
  is_recurring: boolean;
  recurrence_rule?: RecurrenceRule;
  has_exception: boolean;
  exception?: TaskException;
  completed_at?: string;
  time_period: TaskTimePeriod;
  is_overdue: boolean;
}

export type RecurrenceEditScope = 'this_day' | 'this_and_following' | 'all_days';

export interface DayAnalyticsSummary {
  date: string;
  total_tasks: number;
  completed_tasks: number;
  skipped_tasks: number;
  completion_rate: number;
}

