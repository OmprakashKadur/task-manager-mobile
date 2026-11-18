import React from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import { ThemedText, Card } from '@/components/ui';
import { useAppTheme } from '@/hooks/useAppTheme';
import {
  RecurrenceRule,
  RecurrenceFrequency,
  RecurrenceEndType,
  TimeSlot,
} from '@/types';
import { Spacing, BorderRadius } from '@/theme';
import { Ionicons } from '@expo/vector-icons';
import { getRecurrenceRuleSummary } from '@/services/recurrence/summary';

export interface RecurrenceRulePickerProps {
  rule: Partial<RecurrenceRule> | null;
  startDate: string;
  onChange: (rule: Partial<RecurrenceRule> | null) => void;
}

const FREQUENCIES: { label: string; value: RecurrenceFrequency }[] = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Date Range', value: 'date_range' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

const WEEKDAYS = [
  { label: 'S', value: 0 },
  { label: 'M', value: 1 },
  { label: 'T', value: 2 },
  { label: 'W', value: 3 },
  { label: 'T', value: 4 },
  { label: 'F', value: 5 },
  { label: 'S', value: 6 },
];

export function RecurrenceRulePicker({
  rule,
  startDate,
  onChange,
}: RecurrenceRulePickerProps) {
  const { colors } = useAppTheme();
  const isEnabled = rule !== null;

  const handleToggleEnabled = () => {
    if (isEnabled) {
      onChange(null);
    } else {
      onChange({
        frequency: 'daily',
        interval: 1,
        start_date: startDate,
        end_type: 'never',
        weekdays: [1, 3, 5],
      });
    }
  };

  const updateField = <K extends keyof RecurrenceRule>(
    field: K,
    val: RecurrenceRule[K]
  ) => {
    if (!rule) return;
    onChange({ ...rule, [field]: val });
  };

  const toggleWeekday = (day: number) => {
    if (!rule) return;
    const current = rule.weekdays || [];
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort();
    updateField('weekdays', next.length > 0 ? next : [day]);
  };

  const addTimeSlot = () => {
    if (!rule) return;
    const currentSlots = rule.time_slots || [];
    updateField('time_slots', [
      ...currentSlots,
      { start_time: '18:00', end_time: '19:00' },
    ]);
  };

  const updateTimeSlot = (
    index: number,
    field: 'start_time' | 'end_time',
    val: string
  ) => {
    if (!rule || !rule.time_slots) return;
    const next = [...rule.time_slots];
    next[index] = { ...next[index], [field]: val };
    updateField('time_slots', next);
  };

  const removeTimeSlot = (index: number) => {
    if (!rule || !rule.time_slots) return;
    updateField(
      'time_slots',
      rule.time_slots.filter((_, i) => i !== index)
    );
  };

  return (
    <Card style={styles.card}>
      {/* Enable toggle header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="repeat" size={20} color={colors.primary} />
          <ThemedText variant="bodyMedium" style={{ fontWeight: '600', marginLeft: Spacing.sm }}>
            Repeat Task
          </ThemedText>
        </View>
        <Pressable
          onPress={handleToggleEnabled}
          style={[
            styles.togglePill,
            { backgroundColor: isEnabled ? colors.primary : colors.surfaceVariant },
          ]}
        >
          <ThemedText
            variant="caption"
            style={{
              color: isEnabled ? colors.textInverse : colors.textSecondary,
              fontWeight: '700',
            }}
          >
            {isEnabled ? 'Enabled' : 'Does not repeat'}
          </ThemedText>
        </Pressable>
      </View>

      {isEnabled && rule && (
        <View style={styles.body}>
          {/* Summary preview */}
          <View style={[styles.summaryBox, { backgroundColor: colors.surfaceVariant }]}>
            <ThemedText variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
              Summary: {getRecurrenceRuleSummary(rule as RecurrenceRule)}
            </ThemedText>
          </View>

          {/* Frequency selector */}
          <ThemedText variant="caption" secondary style={styles.label}>
            Frequency
          </ThemedText>
          <View style={styles.frequencyRow}>
            {FREQUENCIES.map((freq) => {
              const selected = rule.frequency === freq.value;
              return (
                <Pressable
                  key={freq.value}
                  onPress={() => updateField('frequency', freq.value)}
                  style={[
                    styles.freqButton,
                    {
                      backgroundColor: selected ? colors.primary : colors.surfaceVariant,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <ThemedText
                    variant="caption"
                    style={{
                      color: selected ? colors.textInverse : colors.text,
                      fontWeight: selected ? '700' : '500',
                    }}
                  >
                    {freq.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {/* Weekly weekdays selector */}
          {rule.frequency === 'weekly' && (
            <View style={{ marginTop: Spacing.md }}>
              <ThemedText variant="caption" secondary style={styles.label}>
                On days
              </ThemedText>
              <View style={styles.weekdaysRow}>
                {WEEKDAYS.map((w) => {
                  const active = rule.weekdays?.includes(w.value);
                  return (
                    <Pressable
                      key={w.value}
                      onPress={() => toggleWeekday(w.value)}
                      style={[
                        styles.weekdayCircle,
                        {
                          backgroundColor: active ? colors.primary : colors.surfaceVariant,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <ThemedText
                        variant="caption"
                        style={{
                          color: active ? colors.textInverse : colors.text,
                          fontWeight: '700',
                        }}
                      >
                        {w.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Interval Stepper */}
          {rule.frequency !== 'date_range' && (
            <View style={styles.intervalRow}>
              <ThemedText variant="bodyMedium">
                Repeat every {rule.interval || 1}{' '}
                {rule.frequency === 'daily'
                  ? 'days'
                  : rule.frequency === 'weekly'
                  ? 'weeks'
                  : rule.frequency === 'monthly'
                  ? 'months'
                  : 'years'}
              </ThemedText>
              <View style={styles.stepper}>
                <Pressable
                  onPress={() =>
                    updateField('interval', Math.max((rule.interval || 1) - 1, 1))
                  }
                  style={[styles.stepBtn, { backgroundColor: colors.surfaceVariant }]}
                >
                  <Ionicons name="remove" size={16} color={colors.text} />
                </Pressable>
                <ThemedText variant="bodyMedium" style={styles.stepVal}>
                  {rule.interval || 1}
                </ThemedText>
                <Pressable
                  onPress={() =>
                    updateField('interval', (rule.interval || 1) + 1)
                  }
                  style={[styles.stepBtn, { backgroundColor: colors.surfaceVariant }]}
                >
                  <Ionicons name="add" size={16} color={colors.text} />
                </Pressable>
              </View>
            </View>
          )}

          {/* End condition */}
          <View style={{ marginTop: Spacing.md }}>
            <ThemedText variant="caption" secondary style={styles.label}>
              Ends
            </ThemedText>
            <View style={styles.endTypeRow}>
              {(['never', 'until_date', 'count'] as RecurrenceEndType[]).map((type) => {
                const selected = (rule.end_type || 'never') === type;
                const label =
                  type === 'never'
                    ? 'Never'
                    : type === 'until_date'
                    ? 'On Date'
                    : 'After Count';
                return (
                  <Pressable
                    key={type}
                    onPress={() => updateField('end_type', type)}
                    style={[
                      styles.endBtn,
                      {
                        backgroundColor: selected ? colors.primary : colors.surfaceVariant,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <ThemedText
                      variant="caption"
                      style={{
                        color: selected ? colors.textInverse : colors.text,
                        fontWeight: selected ? '700' : '500',
                      }}
                    >
                      {label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {rule.end_type === 'until_date' && (
              <View style={styles.endSubRow}>
                <ThemedText variant="caption" secondary>
                  Until date (YYYY-MM-DD):
                </ThemedText>
                <TextInput
                  value={rule.until_date || ''}
                  onChangeText={(val) => updateField('until_date', val)}
                  placeholder="2026-12-31"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.textInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceVariant,
                    },
                  ]}
                />
              </View>
            )}

            {rule.end_type === 'count' && (
              <View style={styles.endSubRow}>
                <ThemedText variant="caption" secondary>
                  Total occurrences:
                </ThemedText>
                <View style={styles.stepper}>
                  <Pressable
                    onPress={() =>
                      updateField('count', Math.max((rule.count || 10) - 1, 1))
                    }
                    style={[styles.stepBtn, { backgroundColor: colors.surfaceVariant }]}
                  >
                    <Ionicons name="remove" size={16} color={colors.text} />
                  </Pressable>
                  <ThemedText variant="bodyMedium" style={styles.stepVal}>
                    {rule.count || 10}
                  </ThemedText>
                  <Pressable
                    onPress={() => updateField('count', (rule.count || 10) + 1)}
                    style={[styles.stepBtn, { backgroundColor: colors.surfaceVariant }]}
                  >
                    <Ionicons name="add" size={16} color={colors.text} />
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {/* Multiple time slots */}
          <View style={{ marginTop: Spacing.lg }}>
            <View style={styles.slotHeader}>
              <ThemedText variant="caption" secondary style={styles.label}>
                Time slots (optional multiple slots per day)
              </ThemedText>
              <Pressable onPress={addTimeSlot} style={styles.addSlotBtn}>
                <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                <ThemedText variant="caption" style={{ color: colors.primary, fontWeight: '700', marginLeft: 4 }}>
                  Add slot
                </ThemedText>
              </Pressable>
            </View>

            {rule.time_slots?.map((slot: TimeSlot, idx: number) => (
              <View key={idx} style={styles.slotRow}>
                <TextInput
                  value={slot.start_time}
                  onChangeText={(val) => updateTimeSlot(idx, 'start_time', val)}
                  placeholder="08:00"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.slotInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceVariant,
                    },
                  ]}
                />
                <ThemedText variant="caption" secondary style={{ marginHorizontal: 4 }}>
                  to
                </ThemedText>
                <TextInput
                  value={slot.end_time || ''}
                  onChangeText={(val) => updateTimeSlot(idx, 'end_time', val)}
                  placeholder="09:00"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.slotInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceVariant,
                    },
                  ]}
                />
                <Pressable onPress={() => removeTimeSlot(idx)} style={styles.removeSlotBtn}>
                  <Ionicons name="close-circle" size={20} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  togglePill: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
  },
  body: {
    marginTop: Spacing.md,
  },
  summaryBox: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  label: {
    marginBottom: Spacing.xs,
    fontWeight: '600',
  },
  frequencyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  freqButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  weekdayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intervalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepVal: {
    marginHorizontal: Spacing.md,
    fontWeight: '700',
  },
  endTypeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  endBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  endSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
    width: 120,
    fontSize: 13,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  slotInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 13,
  },
  removeSlotBtn: {
    marginLeft: Spacing.sm,
  },
});
