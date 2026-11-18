import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Switch,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText, Card, Button } from '@/components/ui';
import { useAppTheme } from '@/hooks/useAppTheme';
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
  const { colors, mode } = useAppTheme();
  const setMode = useThemeStore((s) => s.setMode);
  const settings = useSettingsStore((s) => s.settings);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const triggerRefresh = useTaskStore((s) => s.triggerRefresh);

  const [userNameInput, setUserNameInput] = useState(settings.user_name || '');
  const [hasNotifPermission, setHasNotifPermission] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    getNotificationPermissionStatus().then(setHasNotifPermission);
  }, []);

  const themeOptions: { label: string; value: ThemeMode; icon: any }[] = [
    { label: 'System', value: 'system', icon: 'phone-portrait-outline' },
    { label: 'Light', value: 'light', icon: 'sunny-outline' },
    { label: 'Dark', value: 'dark', icon: 'moon-outline' },
  ];

  const handleSaveUserName = async () => {
    updateSetting('user_name', userNameInput.trim());
    await registerDevice(userNameInput.trim());
    Alert.alert('Saved', 'Name updated successfully.');
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText variant="h1" style={{ marginBottom: Spacing.xs }}>
          Settings
        </ThemedText>
        <ThemedText variant="body" secondary style={{ marginBottom: Spacing.lg }}>
          Preferences, backups, and app configuration.
        </ThemedText>

        {/* User Profile / Name */}
        <Card style={styles.card}>
          <ThemedText variant="h3" style={styles.cardTitle}>
            Profile
          </ThemedText>
          <ThemedText variant="caption" secondary style={{ marginBottom: Spacing.sm }}>
            Your name is used for personalizing daily greetings and fleet telemetry.
          </ThemedText>

          <View style={styles.inputRow}>
            <TextInput
              value={userNameInput}
              onChangeText={setUserNameInput}
              placeholder="Enter your name"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.nameInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceVariant },
              ]}
            />
            <Button
              title="Save"
              onPress={handleSaveUserName}
              size="sm"
              disabled={userNameInput.trim() === settings.user_name}
            />
          </View>
        </Card>

        {/* Appearance */}
        <Card style={styles.card}>
          <ThemedText variant="h3" style={styles.cardTitle}>
            Appearance
          </ThemedText>

          <View style={styles.themeSelector}>
            {themeOptions.map((opt) => {
              const selected = mode === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setMode(opt.value)}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor: selected ? colors.primary : colors.surfaceVariant,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={opt.icon}
                    size={20}
                    color={selected ? '#FFFFFF' : colors.text}
                  />
                  <ThemedText
                    variant="caption"
                    style={{
                      color: selected ? '#FFFFFF' : colors.text,
                      fontWeight: selected ? '700' : '500',
                      marginTop: 4,
                    }}
                  >
                    {opt.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Notifications & Reminders */}
        <Card style={styles.card}>
          <ThemedText variant="h3" style={styles.cardTitle}>
            Notifications & Reminders
          </ThemedText>

          {/* Permission Status */}
          <View style={styles.row}>
            <View style={styles.rowText}>
              <ThemedText variant="bodyMedium">Notification Status</ThemedText>
              <ThemedText variant="caption" secondary>
                {hasNotifPermission ? 'Granted and active' : 'Not granted'}
              </ThemedText>
            </View>
            {!hasNotifPermission && (
              <Button
                title="Enable"
                onPress={handleRequestPermissions}
                variant="primary"
                size="sm"
              />
            )}
          </View>

          {/* Morning Summary */}
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.borderSubtle, marginTop: Spacing.md, paddingTop: Spacing.md }]}>
            <View style={styles.rowText}>
              <ThemedText variant="bodyMedium">Daily Morning Summary</ThemedText>
              <ThemedText variant="caption" secondary>
                Receive an 8:00 AM briefing of scheduled tasks
              </ThemedText>
            </View>
            <Switch
              value={settings.morning_summary_enabled}
              onValueChange={(val) => {
                updateSetting('morning_summary_enabled', val);
                resyncNotificationSchedule().catch(() => {});
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          {/* Default reminder offset */}
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.borderSubtle, marginTop: Spacing.md, paddingTop: Spacing.md }]}>
            <View style={styles.rowText}>
              <ThemedText variant="bodyMedium">Default Reminder</ThemedText>
              <ThemedText variant="caption" secondary>
                Preset minutes before task start
              </ThemedText>
            </View>
            <View style={styles.pillRow}>
              {REMINDER_OPTIONS.map((min) => {
                const active = settings.default_reminder_minutes === min;
                return (
                  <Pressable
                    key={min}
                    onPress={() => updateSetting('default_reminder_minutes', min)}
                    style={[
                      styles.smallPill,
                      {
                        backgroundColor: active ? colors.primary : colors.surfaceVariant,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <ThemedText
                      variant="caption"
                      style={{
                        color: active ? '#FFFFFF' : colors.text,
                        fontWeight: active ? '700' : '500',
                      }}
                    >
                      {min}m
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Card>

        {/* Preferences */}
        <Card style={styles.card}>
          <ThemedText variant="h3" style={styles.cardTitle}>
            Calendar & Preferences
          </ThemedText>

          {/* Week start day */}
          <View style={styles.row}>
            <View style={styles.rowText}>
              <ThemedText variant="bodyMedium">Start Week On</ThemedText>
              <ThemedText variant="caption" secondary>
                First day of the week in calendar views
              </ThemedText>
            </View>
            <View style={styles.pillRow}>
              {[
                { label: 'Monday', val: 1 as const },
                { label: 'Sunday', val: 0 as const },
              ].map((opt) => {
                const active = settings.week_start_day === opt.val;
                return (
                  <Pressable
                    key={opt.val}
                    onPress={() => updateSetting('week_start_day', opt.val)}
                    style={[
                      styles.smallPill,
                      {
                        backgroundColor: active ? colors.primary : colors.surfaceVariant,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <ThemedText
                      variant="caption"
                      style={{
                        color: active ? '#FFFFFF' : colors.text,
                        fontWeight: active ? '700' : '500',
                      }}
                    >
                      {opt.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Haptic feedback */}
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.borderSubtle, marginTop: Spacing.md, paddingTop: Spacing.md }]}>
            <View style={styles.rowText}>
              <ThemedText variant="bodyMedium">Haptic Feedback</ThemedText>
              <ThemedText variant="caption" secondary>
                Tactile response on gestures, taps, and completions
              </ThemedText>
            </View>
            <Switch
              value={settings.haptics_enabled}
              onValueChange={(val) => updateSetting('haptics_enabled', val)}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          {/* Notification Sounds */}
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.borderSubtle, marginTop: Spacing.md, paddingTop: Spacing.md }]}>
            <View style={styles.rowText}>
              <ThemedText variant="bodyMedium">Notification Sounds</ThemedText>
              <ThemedText variant="caption" secondary>
                Play system sound when reminders trigger
              </ThemedText>
            </View>
            <Switch
              value={settings.sound_enabled}
              onValueChange={(val) => updateSetting('sound_enabled', val)}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
        </Card>

        {/* Data & Backup */}
        <Card style={styles.card}>
          <ThemedText variant="h3" style={styles.cardTitle}>
            Data & Backup
          </ThemedText>
          <ThemedText variant="caption" secondary style={{ marginBottom: Spacing.md }}>
            Export all data as a JSON file or restore from a previous backup.
          </ThemedText>

          <View style={styles.backupButtonsRow}>
            <Button
              title="Export Backup"
              onPress={handleExport}
              loading={exporting}
              variant="outline"
              icon={<Ionicons name="share-outline" size={16} color={colors.primary} />}
              style={{ flex: 1 }}
            />
            <Button
              title="Import Backup"
              onPress={handleImport}
              loading={importing}
              variant="secondary"
              icon={<Ionicons name="download-outline" size={16} color={colors.text} />}
              style={{ flex: 1, marginLeft: Spacing.sm }}
            />
          </View>

          {/* Clear all data */}
          <Button
            title="Clear All Data"
            onPress={handleClearAll}
            variant="danger"
            style={{ marginTop: Spacing.md }}
          />
        </Card>

        {/* Diagnostics & Info */}
        <Card style={styles.card}>
          <ThemedText variant="h3" style={styles.cardTitle}>
            About & Diagnostics
          </ThemedText>
          <View style={styles.diagRow}>
            <ThemedText variant="caption" secondary>
              App Version
            </ThemedText>
            <ThemedText variant="caption" style={{ fontWeight: '600' }}>
              1.0.0
            </ThemedText>
          </View>
          <View style={styles.diagRow}>
            <ThemedText variant="caption" secondary>
              Storage Engine
            </ThemedText>
            <ThemedText variant="caption" style={{ fontWeight: '600' }}>
              expo-sqlite (WAL mode)
            </ThemedText>
          </View>
          <View style={styles.diagRow}>
            <ThemedText variant="caption" secondary>
              Fleet Device ID
            </ThemedText>
            <ThemedText variant="caption" style={{ fontWeight: '600', maxWidth: 180 }} numberOfLines={1}>
              {deviceId}
            </ThemedText>
          </View>
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
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  card: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  themeSelector: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowText: {
    flex: 1,
    marginRight: Spacing.md,
  },
  pillRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  smallPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  backupButtonsRow: {
    flexDirection: 'row',
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
});
