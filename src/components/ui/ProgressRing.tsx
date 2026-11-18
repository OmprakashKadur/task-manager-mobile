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
import { useAppTheme } from '@/hooks/useAppTheme';

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
  size = 100,
  strokeWidth = 10,
  progress,
  completed,
  total,
  color,
  trackColor,
  showText = true,
}: ProgressRingProps) {
  const { colors } = useAppTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    const clamped = Math.min(Math.max(progress, 0), 1);
    animatedProgress.value = withTiming(clamped, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, animatedProgress]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - animatedProgress.value);
    return {
      strokeDashoffset,
    };
  });

  const activeColor = color || colors.success;
  const activeTrackColor = trackColor || colors.borderSubtle;

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
          <ThemedText variant="h3" style={{ fontWeight: '700' }}>
            {completed}/{total}
          </ThemedText>
          <ThemedText variant="caption" secondary>
            done
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
  },
  textContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

