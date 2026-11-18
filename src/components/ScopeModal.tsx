import React from 'react';
import { View, Modal, Pressable, StyleSheet } from 'react-native';
import { ThemedText, Card, Button } from '@/components/ui';
import { useAppTheme } from '@/hooks/useAppTheme';
import { RecurrenceEditScope } from '@/types';
import { Spacing, BorderRadius } from '@/theme';
import { Ionicons } from '@expo/vector-icons';

export interface ScopeModalProps {
  visible: boolean;
  actionType: 'edit' | 'delete';
  onSelectScope: (scope: RecurrenceEditScope) => void;
  onCancel: () => void;
}

export function ScopeModal({
  visible,
  actionType,
  onSelectScope,
  onCancel,
}: ScopeModalProps) {
  const { colors } = useAppTheme();

  const title = actionType === 'delete' ? 'Delete Recurring Task' : 'Edit Recurring Task';
  const subtitle =
    actionType === 'delete'
      ? 'Which occurrences would you like to delete?'
      : 'Which occurrences would you like to apply changes to?';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onCancel}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <Card style={styles.card}>
            <ThemedText variant="h3" style={{ marginBottom: Spacing.xs }}>
              {title}
            </ThemedText>
            <ThemedText variant="body" secondary style={{ marginBottom: Spacing.xl }}>
              {subtitle}
            </ThemedText>

            <Pressable
              onPress={() => onSelectScope('this_day')}
              style={({ pressed }) => [
                styles.optionButton,
                { backgroundColor: colors.surfaceVariant, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View style={styles.optionIcon}>
                <Ionicons name="calendar-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.optionText}>
                <ThemedText variant="bodyMedium" style={{ fontWeight: '600' }}>
                  This day only
                </ThemedText>
                <ThemedText variant="caption" secondary>
                  Only affect this single occurrence
                </ThemedText>
              </View>
            </Pressable>

            <Pressable
              onPress={() => onSelectScope('this_and_following')}
              style={({ pressed }) => [
                styles.optionButton,
                { backgroundColor: colors.surfaceVariant, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View style={styles.optionIcon}>
                <Ionicons name="arrow-forward-circle-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.optionText}>
                <ThemedText variant="bodyMedium" style={{ fontWeight: '600' }}>
                  This and following days
                </ThemedText>
                <ThemedText variant="caption" secondary>
                  Affect today and all future occurrences
                </ThemedText>
              </View>
            </Pressable>

            <Pressable
              onPress={() => onSelectScope('all_days')}
              style={({ pressed }) => [
                styles.optionButton,
                {
                  backgroundColor:
                    actionType === 'delete' ? colors.dangerLight : colors.surfaceVariant,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={styles.optionIcon}>
                <Ionicons
                  name="repeat"
                  size={22}
                  color={actionType === 'delete' ? colors.danger : colors.primary}
                />
              </View>
              <View style={styles.optionText}>
                <ThemedText
                  variant="bodyMedium"
                  style={{
                    fontWeight: '600',
                    color: actionType === 'delete' ? colors.danger : colors.text,
                  }}
                >
                  All days
                </ThemedText>
                <ThemedText variant="caption" secondary>
                  {actionType === 'delete'
                    ? 'Delete the entire series permanently'
                    : 'Update the entire series'}
                </ThemedText>
              </View>
            </Pressable>

            <Button
              title="Cancel"
              onPress={onCancel}
              variant="ghost"
              style={{ marginTop: Spacing.sm }}
            />
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
  },
  card: {
    padding: Spacing.xl,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  optionIcon: {
    marginRight: Spacing.md,
  },
  optionText: {
    flex: 1,
  },
});

