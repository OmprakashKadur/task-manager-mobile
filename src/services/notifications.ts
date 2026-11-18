import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router } from 'expo-router';
import { format, parseISO, isAfter } from 'date-fns';
import { getTodayLocalDate, addCalendarDays } from './recurrence/dateUtils';
import { loadOccurrencesForRange, toggleTaskOccurrence } from './taskService';
import { getTaskById } from '@/db/tasks';
import { getAllSettings } from '@/db/settings';

const TASK_CATEGORY_ID = 'TASK_REMINDER';
const ACTION_MARK_DONE = 'MARK_DONE';
const ACTION_SNOOZE_10 = 'SNOOZE_10';

const CHANNEL_REMINDERS = 'task-reminders';
const CHANNEL_SUMMARY = 'daily-summary';

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Initializes notification categories, action buttons, and Android channels.
 */
export async function initNotifications(): Promise<void> {
  try {
    // 1. Android channels
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_REMINDERS, {
        name: 'Task Reminders',
        importance: AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        enableLights: true,
        lightColor: '#2563EB',
      });

      await Notifications.setNotificationChannelAsync(CHANNEL_SUMMARY, {
        name: 'Daily Summary',
        importance: AndroidImportance.DEFAULT,
        sound: 'default',
      });
    }

    // 2. Action buttons (Mark Done & Snooze)
    await Notifications.setNotificationCategoryAsync(TASK_CATEGORY_ID, [
      {
        identifier: ACTION_MARK_DONE,
        buttonTitle: 'Mark Done',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: ACTION_SNOOZE_10,
        buttonTitle: 'Snooze 10m',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);
  } catch (error) {
    if (__DEV__) {
      console.log('[Notifications] Init error:', error);
    }
  }
}

/**
 * Requests notification permissions gracefully.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch {
    return false;
  }
}

/**
 * Checks current notification permission status.
 */
export async function getNotificationPermissionStatus(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Re-syncs scheduled notifications for the rolling 14-day window.
 * Keeps scheduled notifications under the iOS limit (64 max; we target ~50).
 */
export async function resyncNotificationSchedule(): Promise<void> {
  try {
    const hasPermission = await getNotificationPermissionStatus();
    if (!hasPermission) return;

    // 1. Cancel all scheduled notifications to refresh with newest tasks
    await Notifications.cancelAllScheduledNotificationsAsync();

    const today = getTodayLocalDate();
    const windowEnd = addCalendarDays(today, 14);
    const occurrences = loadOccurrencesForRange(today, windowEnd);
    const settings = getAllSettings();
    const now = new Date();

    let scheduledCount = 0;
    const MAX_SCHEDULED = 50;

    // 2. Schedule reminders for pending tasks
    for (const occ of occurrences) {
      if (occ.status !== 'pending' || occ.all_day || !occ.start_time) {
        continue;
      }
      if (scheduledCount >= MAX_SCHEDULED) break;

      // Calculate task start DateTime
      const [hStr, mStr] = occ.start_time.split(':');
      const taskDate = parseISO(occ.date);
      taskDate.setHours(parseInt(hStr, 10), parseInt(mStr, 10), 0, 0);

      // Determine reminder offsets in minutes (fallback to default setting if empty)
      const reminders =
        occ.reminders && occ.reminders.length > 0
          ? occ.reminders
          : [settings.default_reminder_minutes];

      for (const minutesBefore of reminders) {
        if (scheduledCount >= MAX_SCHEDULED) break;

        const triggerDate = new Date(taskDate.getTime() - minutesBefore * 60 * 1000);

        if (isAfter(triggerDate, now)) {
          const bodyText =
            minutesBefore === 0
              ? `Starting now at ${occ.start_time}`
              : `Starting in ${minutesBefore} minutes at ${occ.start_time}`;

          await Notifications.scheduleNotificationAsync({
            content: {
              title: occ.title,
              body: bodyText,
              data: {
                taskId: occ.task_id,
                occurrenceDate: occ.date,
                url: `/task/${occ.task_id}`,
              },
              categoryIdentifier: TASK_CATEGORY_ID,
              sound: settings.sound_enabled ? 'default' : undefined,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerDate,
              channelId: CHANNEL_REMINDERS,
            },
          });
          scheduledCount++;
        }
      }
    }

    // 3. Optional Morning Summary notification
    if (settings.morning_summary_enabled && settings.morning_summary_time) {
      const [mHour, mMin] = settings.morning_summary_time.split(':');
      const todaySummaryTime = new Date();
      todaySummaryTime.setHours(parseInt(mHour, 10), parseInt(mMin, 10), 0, 0);

      const summaryTargetDate = isAfter(todaySummaryTime, now)
        ? todaySummaryTime
        : new Date(todaySummaryTime.getTime() + 24 * 60 * 60 * 1000);

      const targetDateStr = format(summaryTargetDate, 'yyyy-MM-dd');
      const targetOccurrences = occurrences.filter((o) => o.date === targetDateStr);
      const pendingCount = targetOccurrences.filter((o) => o.status === 'pending').length;

      if (pendingCount > 0) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Good Morning!',
            body: `You have ${pendingCount} task${pendingCount === 1 ? '' : 's'} planned for today.`,
            data: { url: '/(tabs)' },
            sound: settings.sound_enabled ? 'default' : undefined,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: summaryTargetDate,
            channelId: CHANNEL_SUMMARY,
          },
        });
      }
    }
  } catch (error) {
    if (__DEV__) {
      console.log('[Notifications] Resync schedule error:', error);
    }
  }
}

/**
 * Setup notification response listeners (for Action buttons and Taps).
 */
export function setupNotificationListeners(
  onTaskCompleted?: () => void
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    async (response) => {
      try {
        const actionId = response.actionIdentifier;
        const data = response.notification.request.content.data as {
          taskId?: string;
          occurrenceDate?: string;
          url?: string;
        };

        if (actionId === ACTION_MARK_DONE && data.taskId && data.occurrenceDate) {
          const task = getTaskById(data.taskId);
          if (task) {
            toggleTaskOccurrence(task, data.occurrenceDate, 'pending');
            onTaskCompleted?.();
          }
          return;
        }

        if (actionId === ACTION_SNOOZE_10 && data.taskId) {
          const task = getTaskById(data.taskId);
          if (task) {
            const snoozeDate = new Date(Date.now() + 10 * 60 * 1000);
            await Notifications.scheduleNotificationAsync({
              content: {
                title: task.title,
                body: 'Snoozed task reminder',
                data,
                categoryIdentifier: TASK_CATEGORY_ID,
              },
              trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: snoozeDate,
                channelId: CHANNEL_REMINDERS,
              },
            });
          }
          return;
        }

        // Default tap: deep link to task or home
        if (data.url) {
          router.push(data.url as any);
        }
      } catch (err) {
        if (__DEV__) {
          console.log('[Notifications] Handle response error:', err);
        }
      }
    }
  );

  return () => {
    subscription.remove();
  };
}
