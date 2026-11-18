import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  LayoutChangeEvent,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { useSettingsStore } from '@/store/useSettingsStore';
import { BorderRadius } from '@/theme';

export interface SegmentOption<T extends string = string> {
  label: string;
  value: T;
  icon?: string;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const { colors, isDark } = useTheme();
  const hapticsEnabled = useSettingsStore((s) => s.settings.haptics_enabled);

  const [containerWidth, setContainerWidth] = React.useState(0);
  const activeIndex = options.findIndex((opt) => opt.value === value);
  const indicatorPosition = useSharedValue(0);

  const segmentWidth = containerWidth > 0 ? (containerWidth - 6) / options.length : 0;

  React.useEffect(() => {
    if (segmentWidth > 0 && activeIndex >= 0) {
      indicatorPosition.value = withSpring(activeIndex * segmentWidth, {
        damping: 22,
        stiffness: 300,
      });
    }
  }, [activeIndex, segmentWidth, indicatorPosition]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorPosition.value }],
    width: segmentWidth,
  }));

  const handleSelect = (val: T) => {
    if (val === value) return;
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onChange(val);
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceVariant,
          borderColor: colors.borderSubtle,
        },
        style,
      ]}
    >
      {segmentWidth > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            indicatorStyle,
            {
              backgroundColor: isDark ? colors.surfaceElevated : colors.surface,
              borderColor: isDark ? colors.border : 'rgba(0,0,0,0.06)',
            },
          ]}
        />
      )}

      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => handleSelect(opt.value)}
            style={styles.segment}
            hitSlop={4}
          >
            {opt.icon && (
              <Ionicons
                name={opt.icon as any}
                size={14}
                color={isSelected ? colors.accent : colors.textSecondary}
                style={styles.icon}
              />
            )}
            <ThemedText
              variant="caption"
              style={[
                styles.label,
                {
                  color: isSelected ? colors.textPrimary : colors.textSecondary,
                  fontWeight: isSelected ? '700' : '500',
                },
              ]}
            >
              {opt.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    position: 'relative',
    minHeight: 40,
    alignItems: 'center',
  },
  indicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    zIndex: 1,
  },
  icon: {
    marginRight: 5,
  },
  label: {
    includeFontPadding: false,
  },
});

