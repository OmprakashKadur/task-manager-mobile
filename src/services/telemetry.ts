import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getLocalItem, setLocalItem } from '@/db/settings';

const APP_ID = 'task-manager-mobile';
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

function generateUUID(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getOrCreateDeviceId(): string {
  try {
    let deviceId = getLocalItem('device_id', '');
    if (!deviceId) {
      deviceId = generateUUID();
      setLocalItem('device_id', deviceId);
    }
    return deviceId;
  } catch {
    return 'anon_local_device';
  }
}

export function getUserName(): string {
  try {
    return getLocalItem('user_name', '');
  } catch {
    return '';
  }
}

export function setUserName(name: string): void {
  try {
    setLocalItem('user_name', name.trim());
  } catch (e) {
    if (__DEV__) {
      console.log('[Telemetry] Failed to save name:', e);
    }
  }
}

/**
 * Register or update this device in central Supabase app_devices table.
 * Non-blocking, safe to call while offline.
 */
export async function registerDevice(name?: string): Promise<void> {
  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    const deviceId = getOrCreateDeviceId();
    const finalName = name !== undefined ? name.trim() : getUserName();
    if (name !== undefined) {
      setUserName(finalName);
    }

    if (!supabaseUrl || !supabaseKey) {
      if (__DEV__) {
        console.log('[Fleet Telemetry] Supabase credentials missing; recorded locally only.');
      }
      return;
    }

    const payload = {
      app_id: APP_ID,
      device_id: deviceId,
      user_name: finalName || null,
      platform: Platform.OS,
      app_version: APP_VERSION,
      last_active_at: new Date().toISOString(),
    };

    const response = await fetch(
      `${supabaseUrl}/rest/v1/app_devices?on_conflict=app_id,device_id`,
      {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(payload),
      }
    );

    if (__DEV__) {
      console.log('[Fleet Telemetry] Ping response status:', response.status);
    }
  } catch (err) {
    if (__DEV__) {
      console.log('[Fleet Telemetry] Offline or ping error:', err);
    }
  }
}

/**
 * Throttled ping (once every 10 minutes, unless force=true) to update last_active_at.
 */
export async function pingActive(force: boolean = false): Promise<void> {
  try {
    const lastPingStr = getLocalItem('last_ping_timestamp', '0');
    const lastPing = parseInt(lastPingStr, 10) || 0;
    const now = Date.now();
    const THROTTLE_MS = 10 * 60 * 1000;

    if (!force && now - lastPing < THROTTLE_MS) {
      return;
    }

    setLocalItem('last_ping_timestamp', String(now));
    await registerDevice();
  } catch {}
}

