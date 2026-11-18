import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ThemedText } from './ThemedText';
import { useTheme } from '@/hooks/useTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ProgressRingProps {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0 to 1
  completed: number;
  total: number;
  color?: string;
  trackColor?: string;
  showText?: boolean;
}

export function ProgressRing({
  size = 110,
  strokeWidth = 10,
  progress,
  completed,
  total,
  color,
  trackColor,
  showText = true,
}: ProgressRingProps) {
  const { colors, isDark } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    const clamped = Math.min(Math.max(progress, 0), 1);
    animatedProgress.value = withTiming(clamped, {
      duration: 650,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, animatedProgress]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - animatedProgress.value);
    return {
      strokeDashoffset,
    };
  });

  const isComplete = total > 0 && completed === total;
  const activeColor =
    color || (isComplete ? colors.success : colors.accent);
  const activeTrackColor =
    trackColor || (isDark ? 'rgba(255,255,255,0.08)' : colors.borderSubtle);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={activeTrackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated Progress Circle */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={activeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          fill="none"
          originX={size / 2}
          originY={size / 2}
          rotation="-90"
        />
      </Svg>
      {showText && (
        <View style={styles.textContainer}>
          <ThemedText variant="heading" tabular style={styles.countText}>
            {completed}/{total}
          </ThemedText>
          <ThemedText variant="micro" secondary style={styles.labelText}>
            {isComplete ? 'All Done! 🎉' : 'completed'}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontWeight: '800',
    includeFontPadding: false,
  },
  labelText: {
    fontWeight: '600',
    marginTop: 1,
    includeFontPadding: false,
  },
});
