import * as SQLite from 'expo-sqlite';
import { MIGRATIONS } from './schema';
import { Category } from '@/types';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export const DB_NAME = 'task_planner.db';

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_NAME);
    dbInstance.execSync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  }
  return dbInstance;
}

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat_work',
    name: 'Work',
    color: '#8B5CF6',
    icon: 'briefcase',
    is_default: true,
    sort_order: 1,
  },
  {
    id: 'cat_personal',
    name: 'Personal',
    color: '#3B82F6',
    icon: 'person',
    is_default: true,
    sort_order: 2,
  },
  {
    id: 'cat_health',
    name: 'Health',
    color: '#10B981',
    icon: 'fitness',
    is_default: true,
    sort_order: 3,
  },
  {
    id: 'cat_finance',
    name: 'Finance',
    color: '#F59E0B',
    icon: 'wallet',
    is_default: true,
    sort_order: 4,
  },
  {
    id: 'cat_learning',
    name: 'Learning',
    color: '#EC4899',
    icon: 'book',
    is_default: true,
    sort_order: 5,
  },
  {
    id: 'cat_home',
    name: 'Home',
    color: '#06B6D4',
    icon: 'home',
    is_default: true,
    sort_order: 6,
  },
];

const DEFAULT_SETTINGS: Record<string, string> = {
  theme_mode: 'system',
  default_reminder_minutes: '15',
  week_start_day: '1', // 1 = Monday
  morning_summary_enabled: '1',
  morning_summary_time: '08:00',
  sound_enabled: '1',
  haptics_enabled: '1',
  user_name: '',
};

export function initDatabase(): SQLite.SQLiteDatabase {
  const db = getDatabase();

  // Run migrations
  db.execSync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const appliedMigrations = db.getAllSync<{ version: number }>(
    'SELECT version FROM _migrations ORDER BY version ASC'
  );
  const appliedSet = new Set(appliedMigrations.map((m) => m.version));

  for (const migration of MIGRATIONS) {
    if (!appliedSet.has(migration.version)) {
      db.withTransactionSync(() => {
        db.execSync(migration.up);
        db.runSync(
          'INSERT INTO _migrations (version, applied_at) VALUES (?, ?)',
          [migration.version, new Date().toISOString()]
        );
      });
    }
  }

  // Seed default categories if none exist
  const categoryCount = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM categories'
  )?.count ?? 0;

  if (categoryCount === 0) {
    db.withTransactionSync(() => {
      for (const cat of DEFAULT_CATEGORIES) {
        db.runSync(
          `INSERT INTO categories (id, name, color, icon, is_default, sort_order)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [cat.id, cat.name, cat.color, cat.icon, cat.is_default ? 1 : 0, cat.sort_order]
        );
      }
    });
  }

  // Seed default settings if not present
  db.withTransactionSync(() => {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      const existing = db.getFirstSync<{ key: string }>(
        'SELECT key FROM settings WHERE key = ?',
        [key]
      );
      if (!existing) {
        db.runSync('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
      }
    }
  });

  return db;
}

