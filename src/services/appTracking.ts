import { registerDevice, pingActive } from './telemetry';
import { getLocalItem, setLocalItem } from '@/db/settings';

/**
 * Tracks the initial app installation.
 * Non-blocking, isolated, and fails silently when offline.
 */
export async function trackInstall(): Promise<void> {
  try {
    const isInstalled = getLocalItem('has_tracked_install', '0');
    if (isInstalled !== '1') {
      await registerDevice();
      setLocalItem('has_tracked_install', '1');
    }
  } catch (error) {
    if (__DEV__) {
      console.log('[AppTracking] trackInstall silent catch:', error);
    }
  }
}

/**
 * Tracks device activity on app launch and foreground resume.
 * Throttled to avoid unnecessary network traffic, fails silently when offline.
 */
export async function trackLastActive(): Promise<void> {
  try {
    await pingActive(false);
  } catch (error) {
    if (__DEV__) {
      console.log('[AppTracking] trackLastActive silent catch:', error);
    }
  }
}

