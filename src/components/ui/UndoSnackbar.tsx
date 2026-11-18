import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useTaskStore } from '@/store/useTaskStore';
import { useAppTheme } from '@/hooks/useAppTheme';
import { ThemedText } from './ThemedText';
import { BorderRadius, Shadows, Spacing } from '@/theme';
import { Ionicons } from '@expo/vector-icons';

export function UndoSnackbar() {
  const undoAction = useTaskStore((s) => s.undoAction);
  const clearUndo = useTaskStore((s) => s.clearUndo);
  const { colors } = useAppTheme();

  if (!undoAction) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(200)}
      exiting={FadeOutDown.duration(200)}
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        Shadows.md,
      ]}
    >
      <View style={styles.content}>
        <Ionicons name="information-circle" size={20} color={colors.primary} />
        <ThemedText variant="subhead" style={styles.message} numberOfLines={1}>
          {undoAction.message}
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={undoAction.undo}
          style={({ pressed }) => [
            styles.undoButton,
            { backgroundColor: colors.primaryLight, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <ThemedText variant="subhead" style={{ color: colors.primary, fontWeight: '700' }}>
            Undo
          </ThemedText>
        </Pressable>

        <Pressable onPress={clearUndo} style={styles.dismissButton}>
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.md,
    gap: Spacing.sm,
  },
  message: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  undoButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.sm,
  },
  dismissButton: {
    padding: 4,
  },
});
