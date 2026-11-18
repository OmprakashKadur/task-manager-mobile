export const MIGRATIONS = [
  {
    version: 1,
    name: 'initial_schema',
    up: `
      CREATE TABLE IF NOT EXISTS _migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        icon TEXT NOT NULL,
        is_default INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS recurrence_rules (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        frequency TEXT NOT NULL,
        interval INTEGER NOT NULL DEFAULT 1,
        weekdays TEXT,
        month_day INTEGER,
        month_week INTEGER,
        month_weekday INTEGER,
        start_date TEXT NOT NULL,
        end_type TEXT NOT NULL DEFAULT 'never',
        until_date TEXT,
        count INTEGER,
        time_slots TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        notes TEXT,
        date TEXT NOT NULL,
        start_time TEXT,
        end_time TEXT,
        all_day INTEGER NOT NULL DEFAULT 0,
        category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        priority TEXT NOT NULL DEFAULT 'medium',
        subtasks TEXT NOT NULL DEFAULT '[]',
        reminders TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'pending',
        recurrence_rule_id TEXT REFERENCES recurrence_rules(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS task_exceptions (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        occurrence_date TEXT NOT NULL,
        exception_type TEXT NOT NULL,
        override_title TEXT,
        override_notes TEXT,
        override_start_time TEXT,
        override_end_time TEXT,
        override_all_day INTEGER,
        override_date TEXT,
        override_status TEXT,
        override_subtasks TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CONSTRAINT uq_task_occurrence UNIQUE (task_id, occurrence_date)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
      CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_recurrence ON tasks(recurrence_rule_id);
      CREATE INDEX IF NOT EXISTS idx_recurrence_task ON recurrence_rules(task_id);
      CREATE INDEX IF NOT EXISTS idx_exceptions_task_date ON task_exceptions(task_id, occurrence_date);
    `,
  },
];

