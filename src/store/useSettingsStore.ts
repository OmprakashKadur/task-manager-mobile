import { create } from 'zustand';
import { AppSettings } from '@/types';
import { getAllSettings, setSetting } from '@/db/settings';

interface SettingsState {
  settings: AppSettings;
  isLoaded: boolean;
  loadSettings: () => void;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme_mode: 'system',
  default_reminder_minutes: 15,
  week_start_day: 1,
  morning_summary_enabled: true,
  morning_summary_time: '08:00',
  sound_enabled: true,
  haptics_enabled: true,
  user_name: '',
  device_id: '',
  last_ping_timestamp: '0',
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,

  loadSettings: () => {
    try {
      const settings = getAllSettings();
      set({ settings, isLoaded: true });
    } catch (e) {
      console.error('[SettingsStore] Failed to load settings:', e);
      set({ isLoaded: true });
    }
  },

  updateSetting: (key, value) => {
    const current = get().settings;
    const updated = { ...current, [key]: value };
    set({ settings: updated });

    // Persist to SQLite
    let dbValue = String(value);
    if (typeof value === 'boolean') {
      dbValue = value ? '1' : '0';
    }
    setSetting(key, dbValue);
  },
}));

