import React, { useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemedText, Card, Button } from '@/components/ui';
import { useAppTheme } from '@/hooks/useAppTheme';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTaskStore } from '@/store/useTaskStore';
import { registerDevice } from '@/services/telemetry';
import { Spacing, BorderRadius } from '@/theme';

export interface OnboardingModalProps {
  visible: boolean;
  onComplete?: () => void;
}

export function OnboardingModal({ visible, onComplete }: OnboardingModalProps) {
  const { colors } = useAppTheme();
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const triggerRefresh = useTaskStore((s) => s.triggerRefresh);

  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      setSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      // 1. Save in Zustand store & SQLite settings
      updateSetting('user_name', trimmed);

      // 2. Transmit to central fleet telemetry in Supabase
      await registerDevice(trimmed);

      // 3. Trigger home screen greeting re-render
      triggerRefresh();

      onComplete?.();
    } catch (err) {
      if (__DEV__) {
        console.log('[Onboarding] Error submitting name:', err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.backdrop, { backgroundColor: colors.overlay }]}
      >
        <Card style={styles.card}>
          {/* Welcome Icon */}
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="sparkles" size={28} color={colors.primary} />
          </View>

          {/* Heading */}
          <ThemedText variant="h2" style={styles.title}>
            Welcome to Task Planner
          </ThemedText>

          <ThemedText variant="body" secondary style={styles.subtitle}>
            Let&apos;s personalize your daily schedule and planner. What should we call you?
          </ThemedText>

          {/* Name Input Field */}
          <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.surfaceVariant }]}>
            <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
              placeholderTextColor={colors.textMuted}
              autoFocus
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              style={[styles.input, { color: colors.text }]}
            />
          </View>

          <ThemedText variant="caption" secondary style={styles.helperText}>
            Used for your personalized daily greetings and fleet device telemetry.
          </ThemedText>

          {/* Submit Button */}
          <Button
            title="Get Started"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!name.trim() || submitting}
            size="lg"
            style={styles.submitButton}
          />
        </Card>
      </KeyboardAvoidingView>
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
  card: {
    width: '100%',
    maxWidth: 420,
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    width: '100%',
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  helperText: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
    textAlign: 'center',
    fontSize: 11,
  },
  submitButton: {
    width: '100%',
  },
});

