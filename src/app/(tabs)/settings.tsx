import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Switch,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  ThemedText,
  Card,
  Button,
  Chip,
  SegmentedControl,
  TextField,
  SectionHeader,
  Badge,
} from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useThemeStore } from '@/store/useThemeStore';
import { useTaskStore } from '@/store/useTaskStore';
import { clearAllData } from '@/db/tasks';
import { exportBackup, importBackup } from '@/services/backup';
import {
  getNotificationPermissionStatus,
  requestNotificationPermissions,
  resyncNotificationSchedule,
} from '@/services/notifications';
import { registerDevice, getOrCreateDeviceId } from '@/services/telemetry';
import { Spacing, BorderRadius } from '@/theme';
import { ThemeMode } from '@/types';

const REMINDER_OPTIONS = [5, 10, 15, 30, 60];

export default function SettingsScreen() {
  const { colors, mode } = useTheme();
  const setMode = useThemeStore((s) => s.setMode);
  const settings = useSettingsStore((s) => s.settings);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const triggerRefresh = useTaskStore((s) => s.triggerRefresh);
  const hapticsEnabled = useSettingsStore((s) => s.settings.haptics_enabled);

  const [userNameInput, setUserNameInput] = useState(settings.user_name || '');
  const [hasNotifPermission, setHasNotifPermission] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    getNotificationPermissionStatus().then(setHasNotifPermission);
  }, []);

  const handleSaveUserName = async () => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    updateSetting('user_name', userNameInput.trim());
    await registerDevice(userNameInput.trim());
    Alert.alert('Saved', 'Profile name updated successfully.');
  };

  const handleRequestPermissions = async () => {
    const granted = await requestNotificationPermissions();
    setHasNotifPermission(granted);
    if (granted) {
      await resyncNotificationSchedule();
      Alert.alert('Granted', 'Notifications are enabled.');
    } else {
      Alert.alert(
        'Permission Required',
        'Please enable notifications in your device settings to receive task reminders.'
      );
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      await exportBackup();
    } catch {
      Alert.alert('Export Failed', 'Unable to export backup file.');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    try {
      setImporting(true);
      const res = await importBackup();
      if (res.success) {
        triggerRefresh();
        await resyncNotificationSchedule();
        Alert.alert(
          'Backup Restored',
          `Successfully restored ${res.taskCount} tasks.`
        );
      }
    } catch (err: any) {
      Alert.alert('Import Failed', err.message || 'Invalid backup file');
    } finally {
      setImporting(false);
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Tasks',
      'This will permanently delete all tasks, recurrence rules, and exceptions. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: () => {
            clearAllData();
            triggerRefresh();
            resyncNotificationSchedule().catch(() => {});
            Alert.alert('Cleared', 'All tasks have been removed.');
          },
        },
      ]
    );
  };

  const deviceId = getOrCreateDeviceId();

  const handleThemeSelect = (newMode: ThemeMode) => {
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    setMode(newMode);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText variant="display" style={styles.title}>
          Settings
        </ThemedText>
        <ThemedText variant="caption" secondary style={styles.subtitle}>
          Customize your experience, notifications, and data
        </ThemedText>

        {/* 1. Theme Preview Selector */}
        <Card style={styles.card} elevated>
          <SectionHeader title="Appearance" icon="color-palette-outline" />
          <ThemedText variant="caption" secondary style={{ marginTop: -Spacing.xs, marginBottom: Spacing.md }}>
            Choose a theme or sync with your system settings
          </ThemedText>

          <View style={styles.themeCardsRow}>
            {/* System */}
            <Pressable
              onPress={() => handleThemeSelect('system')}
              style={[
                styles.themeCard,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: mode === 'system' ? colors.accent : colors.borderSubtle,
                  borderWidth: mode === 'system' ? 2 : 1,
                },
              ]}
            >
              <View style={styles.themeMockupSystem}>
                <View style={[styles.mockupHalf, { backgroundColor: '#F8F9FC' }]}>
                  <View style={[styles.mockupCard, { backgroundColor: '#FFFFFF' }]} />
                </View>
                <View style={[styles.mockupHalf, { backgroundColor: '#0D1117' }]}>
                  <View style={[styles.mockupCard, { backgroundColor: '#161B22' }]} />
                </View>
              </View>
              <ThemedText variant="caption" style={{ fontWeight: '700', marginTop: 8 }}>
                System
              </ThemedText>
              {mode === 'system' && (
                <View style={[styles.themeCheckmark, { backgroundColor: colors.accent }]}>
                  <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                </View>
              )}
            </Pressable>

            {/* Light */}
            <Pressable
              onPress={() => handleThemeSelect('light')}
              style={[
                styles.themeCard,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: mode === 'light' ? colors.accent : colors.borderSubtle,
                  borderWidth: mode === 'light' ? 2 : 1,
                },
              ]}
            >
              <View style={[styles.themeMockup, { backgroundColor: '#F8F9FC', borderColor: '#E5E9F0' }]}>
                <View style={[styles.mockupHeader, { backgroundColor: '#4F46E5' }]} />
                <View style={[styles.mockupCard, { backgroundColor: '#FFFFFF', borderColor: '#E5E9F0' }]} />
                <View style={[styles.mockupCard, { backgroundColor: '#FFFFFF', borderColor: '#E5E9F0' }]} />
              </View>
              <ThemedText variant="caption" style={{ fontWeight: '700', marginTop: 8 }}>
                Light
              </ThemedText>
              {mode === 'light' && (
                <View style={[styles.themeCheckmark, { backgroundColor: colors.accent }]}>
                  <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                </View>
              )}
            </Pressable>

            {/* Dark */}
            <Pressable
              onPress={() => handleThemeSelect('dark')}
              style={[
                styles.themeCard,
                {
                  backgroundColor: colors.surfaceVariant,
                  borderColor: mode === 'dark' ? colors.accent : colors.borderSubtle,
                  borderWidth: mode === 'dark' ? 2 : 1,
                },
              ]}
            >
              <View style={[styles.themeMockup, { backgroundColor: '#0D1117', borderColor: '#2A313C' }]}>
                <View style={[styles.mockupHeader, { backgroundColor: '#818CF8' }]} />
                <View style={[styles.mockupCard, { backgroundColor: '#161B22', borderColor: '#2A313C' }]} />
                <View style={[styles.mockupCard, { backgroundColor: '#161B22', borderColor: '#2A313C' }]} />
              </View>
              <ThemedText variant="caption" style={{ fontWeight: '700', marginTop: 8 }}>
                Dark
              </ThemedText>
              {mode === 'dark' && (
                <View style={[styles.themeCheckmark, { backgroundColor: colors.accent }]}>
                  <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                </View>
              )}
            </Pressable>
          </View>
        </Card>

        {/* 2. User Profile / Name */}
        <Card style={styles.card} elevated>
          <SectionHeader title="Profile & Greeting" icon="person-outline" />
          <ThemedText variant="caption" secondary style={{ marginTop: -Spacing.xs, marginBottom: Spacing.md }}>
            Used for your personalized daily greetings and device registration
          </ThemedText>

          <View style={styles.nameRow}>
            <TextField
              value={userNameInput}
              onChangeText={setUserNameInput}
              placeholder="Your Name (e.g. Alex)"
              containerStyle={{ flex: 1, marginBottom: 0 }}
            />
            <Button
              title="Save"
              onPress={handleSaveUserName}
              variant="primary"
              size="md"
              style={{ marginLeft: Spacing.sm }}
            />
          </View>

          <ThemedText variant="micro" secondary style={{ marginTop: Spacing.xs }}>
            Device ID: {deviceId}
          </ThemedText>
        </Card>

        {/* 3. Schedule & Reminder Preferences */}
        <Card style={styles.card} elevated>
          <SectionHeader title="Planning Preferences" icon="options-outline" />

          {/* Week Start Day */}
          <View style={styles.settingRow}>
            <View style={styles.settingLabelArea}>
              <ThemedText variant="bodyMedium" style={{ fontWeight: '600' }}>
                Week Starts On
              </ThemedText>
              <ThemedText variant="micro" secondary>
                Determines the first column on calendar grids
              </ThemedText>
            </View>

            <SegmentedControl
              options={[
                { label: 'Monday', value: '1' },
                { label: 'Sunday', value: '0' },
              ]}
              value={String(settings.week_start_day)}
              onChange={(val) => updateSetting('week_start_day', (parseInt(val, 10) === 1 ? 1 : 0))}
              style={{ width: 170 }}
            />
          </View>

          {/* Default Reminder Minutes */}
          <View style={[styles.settingRow, { marginTop: Spacing.md }]}>
            <View style={styles.settingLabelArea}>
              <ThemedText variant="bodyMedium" style={{ fontWeight: '600' }}>
                Default Reminder
              </ThemedText>
              <ThemedText variant="micro" secondary>
                Pre-selected notification lead time for tasks
              </ThemedText>
            </View>

            <View style={styles.reminderChips}>
              {REMINDER_OPTIONS.map((min) => {
                const active = settings.default_reminder_minutes === min;
                return (
                  <Chip
                    key={min}
                    label={`${min}m`}
                    selected={active}
                    size="sm"
                    onPress={() => updateSetting('default_reminder_minutes', min)}
                  />
                );
              })}
            </View>
          </View>

          {/* Haptics Switch */}
          <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: colors.borderSubtle, marginTop: Spacing.md, paddingTop: Spacing.md }]}>
            <View style={styles.settingLabelArea}>
              <ThemedText variant="bodyMedium" style={{ fontWeight: '600' }}>
                Haptic Feedback
              </ThemedText>
              <ThemedText variant="micro" secondary>
                Vibrations on complete, delete, and actions
              </ThemedText>
            </View>
            <Switch
              value={settings.haptics_enabled}
              onValueChange={(val) => updateSetting('haptics_enabled', val)}
              trackColor={{ false: colors.border, true: colors.accent }}
            />
          </View>
        </Card>

        {/* 4. Notifications Configuration */}
        <Card style={styles.card} elevated>
          <SectionHeader title="Notifications" icon="notifications-outline" />

          {/* Permission Status */}
          <View style={styles.switchRow}>
            <View style={styles.settingLabelArea}>
              <ThemedText variant="bodyMedium" style={{ fontWeight: '600' }}>
                Task Reminders
              </ThemedText>
              <ThemedText variant="micro" secondary>
                {hasNotifPermission
                  ? 'Scheduled using a 14-day rolling window'
                  : 'Notifications permission is required'}
              </ThemedText>
            </View>

            <Badge
              label={hasNotifPermission ? 'Enabled' : 'Disabled'}
              color={hasNotifPermission ? colors.success : colors.danger}
              backgroundColor={hasNotifPermission ? colors.successSoft : colors.dangerSoft}
              size="md"
            />
          </View>

          {!hasNotifPermission && (
            <Button
              title="Enable Notifications"
              onPress={handleRequestPermissions}
              variant="outline"
              size="sm"
              style={{ marginTop: Spacing.sm }}
            />
          )}

          {/* Morning Summary Briefing */}
          <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: colors.borderSubtle, marginTop: Spacing.md, paddingTop: Spacing.md }]}>
            <View style={styles.settingLabelArea}>
              <ThemedText variant="bodyMedium" style={{ fontWeight: '600' }}>
                Morning Summary
              </ThemedText>
              <ThemedText variant="micro" secondary>
                Daily 8:00 AM briefing with your tasks for the day
              </ThemedText>
            </View>
            <Switch
              value={settings.morning_summary_enabled}
              onValueChange={async (val) => {
                updateSetting('morning_summary_enabled', val);
                await resyncNotificationSchedule();
              }}
              trackColor={{ false: colors.border, true: colors.accent }}
            />
          </View>
        </Card>

        {/* 5. Backup & Data Management */}
        <Card style={styles.card} elevated>
          <SectionHeader title="Backup & Restore" icon="cloud-outline" />
          <ThemedText variant="caption" secondary style={{ marginTop: -Spacing.xs, marginBottom: Spacing.md }}>
            Export all data to a local JSON file or import a saved backup
          </ThemedText>

          <View style={styles.backupActions}>
            <Button
              title="Export JSON Backup"
              onPress={handleExport}
              loading={exporting}
              variant="secondary"
              icon={<Ionicons name="share-outline" size={16} color={colors.textPrimary} />}
              style={{ flex: 1 }}
            />
            <Button
              title="Restore"
              onPress={handleImport}
              loading={importing}
              variant="secondary"
              icon={<Ionicons name="download-outline" size={16} color={colors.textPrimary} />}
              style={{ marginLeft: Spacing.sm }}
            />
          </View>
        </Card>

        {/* 6. Danger Zone */}
        <Card style={styles.card} elevated>
          <SectionHeader title="Reset All Data" icon="warning-outline" />
          <ThemedText variant="caption" secondary style={{ marginTop: -Spacing.xs, marginBottom: Spacing.md }}>
            Permanently delete all tasks, recurrence rules, and exceptions
          </ThemedText>

          <Button
            title="Clear All App Data"
            onPress={handleClearAll}
            variant="destructive"
            icon={<Ionicons name="trash-outline" size={16} color="#FFFFFF" />}
            fullWidth
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: 110,
  },
  title: {
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    marginBottom: Spacing.base,
  },
  card: {
    marginBottom: Spacing.base,
    padding: Spacing.base,
  },
  themeCardsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  themeCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    position: 'relative',
  },
  themeMockup: {
    width: 60,
    height: 70,
    borderRadius: 8,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  themeMockupSystem: {
    width: 60,
    height: 70,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  mockupHalf: {
    flex: 1,
    padding: 3,
  },
  mockupHeader: {
    height: 10,
    borderRadius: 3,
    marginBottom: 2,
  },
  mockupCard: {
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
    marginBottom: 3,
  },
  themeCheckmark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabelArea: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  reminderChips: {
    flexDirection: 'row',
    gap: 4,
  },
  backupActions: {
    flexDirection: 'row',
  },
});
