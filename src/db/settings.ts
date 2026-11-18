import { getDatabase } from './database';
import { AppSettings, ThemeMode } from '@/types';

export function getSetting(key: string, defaultValue: string = ''): string {
  try {
    const db = getDatabase();
    const row = db.getFirstSync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      [key]
    );
    return row ? row.value : defaultValue;
  } catch (error) {
    console.error(`[Settings] Failed to get ${key}:`, error);
    return defaultValue;
  }
}

export function setSetting(key: string, value: string): void {
  try {
    const db = getDatabase();
    db.runSync(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value]
    );
  } catch (error) {
    console.error(`[Settings] Failed to set ${key}:`, error);
  }
}

export function getAllSettings(): AppSettings {
  return {
    theme_mode: (getSetting('theme_mode', 'system') as ThemeMode),
    default_reminder_minutes: parseInt(getSetting('default_reminder_minutes', '15'), 10),
    week_start_day: (parseInt(getSetting('week_start_day', '1'), 10) === 0 ? 0 : 1) as 0 | 1,
    morning_summary_enabled: getSetting('morning_summary_enabled', '1') === '1',
    morning_summary_time: getSetting('morning_summary_time', '08:00'),
    sound_enabled: getSetting('sound_enabled', '1') === '1',
    haptics_enabled: getSetting('haptics_enabled', '1') === '1',
    user_name: getSetting('user_name', ''),
    device_id: getSetting('device_id', ''),
    last_ping_timestamp: getSetting('last_ping_timestamp', '0'),
  };
}

// Storage helpers for Telemetry adapter
export function getLocalItem(key: string, defaultValue: string = ''): string {
  return getSetting(key, defaultValue);
}

export function setLocalItem(key: string, value: string): void {
  setSetting(key, value);
}

