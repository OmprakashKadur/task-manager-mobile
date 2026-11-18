# Central Fleet Telemetry & User Tracking Integration Guide

This guide contains everything you need to replicate the **accountless user tracking and device telemetry system** across your other React Native / Expo apps using your central **Supabase** backend.

---

## Part 1: Ready-to-Use AI Agent Prompt

Copy and paste the prompt below into Cursor, Claude, Antigravity, or ChatGPT in any other mobile app codebase to automatically implement the integration.

````markdown
You are tasked with integrating our central lightweight Fleet Telemetry & User Tracking System into this React Native / Expo application.

### Architecture Overview
This app uses an accountless model (no passwords or social login required), but tracks user identity (name) and device activity into our shared Supabase backend (`app_devices` table) using native `fetch` (no heavy `@supabase/supabase-js` SDK dependency).

---

### Step 1: Central Database Schema (Reference)
If the table does not exist in Supabase yet, execute this in the Supabase SQL Editor:
```sql
CREATE TABLE IF NOT EXISTS public.app_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id VARCHAR(50) NOT NULL,            -- Unique app name, e.g. 'notes-mobile'
    device_id VARCHAR(100) NOT NULL,        -- Persistent UUID per installation
    user_name VARCHAR(100),                 -- Name or identifier entered by user
    platform VARCHAR(20),                   -- 'ios', 'android', 'web'
    app_version VARCHAR(20),                -- e.g. '1.0.0'
    installed_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT app_devices_app_device_unique UNIQUE (app_id, device_id)
);

ALTER TABLE public.app_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon insert and upsert" ON public.app_devices;
CREATE POLICY "Allow anon insert and upsert"
ON public.app_devices
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_app_devices_app_id ON public.app_devices(app_id);
CREATE INDEX IF NOT EXISTS idx_app_devices_last_active ON public.app_devices(last_active_at DESC);
```

---

### Step 2: Environment Variables
1. Add the Supabase credentials to `.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://brubvcrryljnlfvosrvs.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJydWJ2Y3JyeWxqbmxmdm9zcnZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNjc2NzgsImV4cCI6MjEwNzY0MzY3OH0.Ic_CV5lQwgap0TjkZTU8Yp0Pt4hiUdN0M9BjCMicM_8
```
2. Also inject these environment variables into `eas.json` under `build.preview.env` and `build.production.env` so cloud EAS builds have access to them.

---

### Step 3: Implement `services/telemetry.ts`
Create `services/telemetry.ts`. Inspect the app's existing local storage solution (AsyncStorage, SQLite, or MMKV) and adapt the storage helpers `getLocalItem` and `setLocalItem`:

```typescript
import { Platform } from 'react-native';
import Constants from 'expo-constants';
// TODO: Import your app's existing storage mechanism (e.g. AsyncStorage, SQLite, or MMKV)

const APP_ID = '<REPLACE_WITH_CURRENT_APP_ID>'; // e.g. 'focus-timer', 'fitness-tracker'
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

// Adapt these two functions to the app's local persistence
function getLocalItem(key: string, defaultValue: string = ''): string {
  // e.g. return getSetting(key, defaultValue);
  return defaultValue;
}

function setLocalItem(key: string, value: string): void {
  // e.g. setSetting(key, value);
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
    console.log('[Telemetry] Failed to save name:', e);
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
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
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
```

---

### Step 4: Hook into App Lifecycle
1. **Onboarding / Profile Screen**:
   - Collect the user's name or display name.
   - On completion, call `await registerDevice(name);`.
2. **App Entry Point (`_layout.tsx` or `App.tsx`)**:
   - Add a launch effect:
     ```typescript
     useEffect(() => {
       pingActive();
     }, []);
     ```
3. **Core Action Milestones**:
   - Whenever the user completes a core activity, call `pingActive(true);` to update `last_active_at`.
4. **Home Greeting (Optional)**:
   - Use `getUserName()` to display a personalized greeting (e.g. `"Hello, {userName}"`).

Please inspect the existing storage solution in this repository, wire up `services/telemetry.ts`, update `.env` / `eas.json`, and connect `registerDevice` and `pingActive`.
````

---

## Part 2: Storage Adapter Implementations

Depending on what your target app uses for storage, here are ready-made replacements for `getLocalItem` and `setLocalItem`:

### Option A: Using SQLite (like Mantra)
```typescript
import { getSetting, setSetting } from '@/services/database';

function getLocalItem(key: string, defaultValue: string = ''): string {
  return getSetting(key, defaultValue);
}

function setLocalItem(key: string, value: string): void {
  setSetting(key, value);
}
```

### Option B: Using `@react-native-async-storage/async-storage`
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// In-memory cache for synchronous reads:
const memoryCache: Record<string, string> = {};

// Initialize cache once on app start:
export async function initTelemetryStorage(): Promise<void> {
  try {
    const keys = ['device_id', 'user_name', 'last_ping_timestamp'];
    const pairs = await AsyncStorage.multiGet(keys);
    pairs.forEach(([k, v]) => {
      if (v) memoryCache[k] = v;
    });
  } catch {}
}

function getLocalItem(key: string, defaultValue: string = ''): string {
  return memoryCache[key] ?? defaultValue;
}

function setLocalItem(key: string, value: string): void {
  memoryCache[key] = value;
  AsyncStorage.setItem(key, value).catch(() => {});
}
```

### Option C: Using `react-native-mmkv`
```typescript
import { MMKV } from 'react-native-mmkv';
const storage = new MMKV();

function getLocalItem(key: string, defaultValue: string = ''): string {
  return storage.getString(key) ?? defaultValue;
}

function setLocalItem(key: string, value: string): void {
  storage.set(key, value);
}
```

---

## Part 3: Google Play & App Store Compliance

When publishing an app using this telemetry system, declare the following:

- **Data Collected**:
  - **Name (Optional / User-Provided)**: For personalizing app greetings and identity mapping.
  - **Device / Other IDs**: Random installation UUID for fleet diagnostics and app version management.
- **Data Sharing**:
  - **No data shared with third parties**: Data is stored securely in your private first-party Supabase database.
- **Purposes**:
  - App functionality, accountless analytics, and diagnostics.

