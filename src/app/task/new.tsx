import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText, IconButton } from '@/components/ui';
import { TaskForm } from '@/components/TaskForm';
import { useTheme } from '@/hooks/useTheme';
import { Spacing } from '@/theme';

export default function NewTaskScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
        <ThemedText variant="heading">New Task</ThemedText>
        <IconButton
          icon={<Ionicons name="close" size={22} color={colors.textPrimary} />}
          onPress={() => router.back()}
          accessibilityLabel="Close new task modal"
          size={36}
        />
      </View>

      <TaskForm />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
});
