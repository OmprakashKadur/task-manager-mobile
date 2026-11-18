import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
  '#4F46E5', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Teal
  '#8B5CF6', // Purple
  '#F97316', // Coral
];

interface Particle {
  id: number;
  startX: number;
  color: string;
  size: number;
  delay: number;
  speed: number;
  rotateZ: number;
}

function ConfettiPiece({ particle }: { particle: Particle }) {
  const translateY = useSharedValue(-50);
  const opacity = useSharedValue(1);

  useEffect(() => {
    translateY.value = withDelay(
      particle.delay,
      withTiming(SCREEN_HEIGHT * 0.7, {
        duration: particle.speed,
        easing: Easing.out(Easing.quad),
      })
    );

    opacity.value = withDelay(
      particle.delay + particle.speed * 0.6,
      withTiming(0, { duration: particle.speed * 0.4 })
    );
  }, [particle, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: particle.startX },
      { translateY: translateY.value },
      { rotateZ: `${particle.rotateZ}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.piece,
        animatedStyle,
        {
          width: particle.size,
          height: particle.size * 1.5,
          backgroundColor: particle.color,
        },
      ]}
    />
  );
}

const STATIC_PARTICLES: Particle[] = Array.from({ length: 32 }, (_, i) => {
  const normX = (((i * 37 + 11) % 90) + 5) / 100;
  const normSize = ((i * 29 + 7) % 7) + 6;
  const normDelay = (i * 47) % 350;
  const normSpeed = 1800 + ((i * 61) % 800);
  const normRot = (i * 83) % 360;
  return {
    id: i,
    startX: normX * SCREEN_WIDTH,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: normSize,
    delay: normDelay,
    speed: normSpeed,
    rotateZ: normRot,
  };
});

export function ConfettiOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      {STATIC_PARTICLES.map((p) => (
        <ConfettiPiece key={p.id} particle={p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
  },
  piece: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 2,
  },
});
