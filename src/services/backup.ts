import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDatabase } from '@/db/database';
import { format } from 'date-fns';

export interface BackupData {
  version: number;
  exported_at: string;
  categories: any[];
  tasks: any[];
  recurrence_rules: any[];
  task_exceptions: any[];
  settings: Record<string, string>;
}

/**
 * Exports all user data into a JSON file and presents the native Share sheet.
 */
export async function exportBackup(): Promise<boolean> {
  try {
    const db = getDatabase();

    const categories = db.getAllSync('SELECT * FROM categories');
    const tasks = db.getAllSync('SELECT * FROM tasks');
    const recurrence_rules = db.getAllSync('SELECT * FROM recurrence_rules');
    const task_exceptions = db.getAllSync('SELECT * FROM task_exceptions');
    const settingsRows = db.getAllSync<{ key: string; value: string }>('SELECT * FROM settings');

    const settings: Record<string, string> = {};
    for (const r of settingsRows) {
      settings[r.key] = r.value;
    }

    const backup: BackupData = {
      version: 1,
      exported_at: new Date().toISOString(),
      categories,
      tasks,
      recurrence_rules,
      task_exceptions,
      settings,
    };

    const fileName = `task_planner_backup_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
    const filePath = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(backup, null, 2), {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Export Task Planner Backup',
        UTI: 'public.json',
      });
      return true;
    }

    return true;
  } catch (error) {
    console.error('[Backup] Export error:', error);
    throw error;
  }
}

/**
 * Prompts user to select a JSON backup file and restores it into SQLite.
 */
export async function importBackup(): Promise<{ success: boolean; taskCount: number }> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/json', '*/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { success: false, taskCount: 0 };
    }

    const fileUri = result.assets[0].uri;
    const content = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const backup = JSON.parse(content) as BackupData;

    if (!backup.version || !Array.isArray(backup.tasks)) {
      throw new Error('Invalid backup file format');
    }

    const db = getDatabase();

    db.withTransactionSync(() => {
      // 1. Clear existing tasks, rules, exceptions
      db.runSync('DELETE FROM task_exceptions');
      db.runSync('DELETE FROM recurrence_rules');
      db.runSync('DELETE FROM tasks');

      // 2. Restore categories (preserve custom ones)
      if (Array.isArray(backup.categories)) {
        for (const cat of backup.categories) {
          db.runSync(
            `INSERT INTO categories (id, name, color, icon, is_default, sort_order)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               name = excluded.name,
               color = excluded.color,
               icon = excluded.icon,
               sort_order = excluded.sort_order`,
            [cat.id, cat.name, cat.color, cat.icon, cat.is_default, cat.sort_order]
          );
        }
      }

      // 3. Restore recurrence rules
      if (Array.isArray(backup.recurrence_rules)) {
        for (const rule of backup.recurrence_rules) {
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
              rule.weekdays,
              rule.month_day,
              rule.month_week,
              rule.month_weekday,
              rule.start_date,
              rule.end_type,
              rule.until_date,
              rule.count,
              rule.time_slots,
              rule.created_at,
              rule.updated_at,
            ]
          );
        }
      }

      // 4. Restore tasks
      if (Array.isArray(backup.tasks)) {
        for (const task of backup.tasks) {
          db.runSync(
            `INSERT INTO tasks (
              id, title, notes, date, start_time, end_time, all_day,
              category_id, priority, subtasks, reminders, status,
              recurrence_rule_id, created_at, updated_at, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              task.id,
              task.title,
              task.notes,
              task.date,
              task.start_time,
              task.end_time,
              task.all_day,
              task.category_id,
              task.priority,
              task.subtasks,
              task.reminders,
              task.status,
              task.recurrence_rule_id,
              task.created_at,
              task.updated_at,
              task.completed_at,
            ]
          );
        }
      }

      // 5. Restore exceptions
      if (Array.isArray(backup.task_exceptions)) {
        for (const ex of backup.task_exceptions) {
          db.runSync(
            `INSERT INTO task_exceptions (
              id, task_id, occurrence_date, exception_type, override_title,
              override_notes, override_start_time, override_end_time, override_all_day,
              override_date, override_status, override_subtasks, completed_at,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              ex.id,
              ex.task_id,
              ex.occurrence_date,
              ex.exception_type,
              ex.override_title,
              ex.override_notes,
              ex.override_start_time,
              ex.override_end_time,
              ex.override_all_day,
              ex.override_date,
              ex.override_status,
              ex.override_subtasks,
              ex.completed_at,
              ex.created_at,
              ex.updated_at,
            ]
          );
        }
      }
    });

    return { success: true, taskCount: backup.tasks.length };
  } catch (error) {
    console.error('[Backup] Import error:', error);
    throw error;
  }
}
