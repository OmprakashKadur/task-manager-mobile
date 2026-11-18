import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTaskStore } from '@/store/useTaskStore';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from './ThemedText';
import { BorderRadius, Spacing } from '@/theme';

export function UndoSnackbar() {
  const undoAction = useTaskStore((s) => s.undoAction);
  const clearUndo = useTaskStore((s) => s.clearUndo);
  const { colors, isDark, shadows } = useTheme();

  const progress = useSharedValue(1);

  useEffect(() => {
    if (undoAction) {
      progress.value = 1;
      progress.value = withTiming(0, {
        duration: 5000,
        easing: Easing.linear,
      });
    }
  }, [undoAction, progress]);

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  if (!undoAction) return null;

  const handleUndo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    undoAction.undo();
  };

  return (
    <Animated.View
      entering={FadeInDown.duration(240).springify()}
      exiting={FadeOutDown.duration(200)}
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
          borderColor: isDark ? colors.border : colors.borderSubtle,
        },
        shadows.lg,
      ]}
    >
      <View style={styles.content}>
        <Ionicons name="sparkles" size={18} color={colors.accent} />
        <ThemedText variant="bodyMedium" style={styles.message} numberOfLines={1}>
          {undoAction.message}
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={handleUndo}
          style={({ pressed }) => [
            styles.undoButton,
            {
              backgroundColor: colors.accentSoft,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <ThemedText
            variant="caption"
            style={{ color: colors.accent, fontWeight: '700' }}
          >
            Undo
          </ThemedText>
        </Pressable>

        <Pressable onPress={clearUndo} hitSlop={10} style={styles.dismissButton}>
          <Ionicons name="close" size={18} color={colors.textTertiary} />
        </Pressable>
      </View>

      {/* Auto-dismiss progress bar */}
      <View
        style={[
          styles.track,
          {
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(0,0,0,0.04)',
          },
        ]}
      >
        <Animated.View
          style={[
            styles.progressBar,
            progressBarStyle,
            { backgroundColor: colors.accent },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
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
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  undoButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
  },
  dismissButton: {
    padding: 4,
  },
  track: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  progressBar: {
    height: '100%',
  },
});
