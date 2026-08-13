import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BrandSpinnerProps = {
  /** Diameter of the ring in points. */
  size?: number;
  /** Color of the rotating arc. Defaults to theme.primary. */
  color?: string;
  /** Color of the background track. Defaults to theme.border. */
  trackColor?: string;
  /** Width of the arc stroke. */
  strokeWidth?: number;
  /** Show a breathing pulse dot in the center (overlay style). */
  pulse?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * Brand loading spinner — a rotating ring with a gap in the primary color,
 * optionally with a breathing pulse dot in the center (full-screen overlay
 * style). Replaces the platform ActivityIndicator everywhere.
 */
export function BrandSpinner({
  size = 48,
  color,
  trackColor,
  strokeWidth,
  pulse = false,
  style,
}: BrandSpinnerProps) {
  const theme = useTheme();

  const arcColor = color ?? theme.primary;
  const ringTrackColor = trackColor ?? theme.border;
  const ringStrokeWidth = strokeWidth ?? Math.max(3, Math.round(size * 0.08));

  const rotation = useSharedValue(0);
  const breathing = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1100, easing: Easing.linear }),
      -1,
      false,
    );
    breathing.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
    return () => {
      cancelAnimation(rotation);
      cancelAnimation(breathing);
    };
  }, [rotation, breathing]);

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.6 + 0.4 * breathing.value,
    transform: [{ scale: 0.85 + 0.3 * breathing.value }],
  }));

  const radius = (size - ringStrokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, rotateStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background track ring */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={ringTrackColor}
            strokeWidth={ringStrokeWidth}
            fill="none"
          />
          {/* Rotating arc with a gap — rotated -90° so it starts from top */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={arcColor}
            strokeWidth={ringStrokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={[0.75 * circumference, 0.25 * circumference]}
            transform={`rotate(-90 ${center} ${center})`}
          />
        </Svg>
      </Animated.View>
      {pulse ? (
        <Animated.View
          style={[
            styles.pulse,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: Radius.pill,
              backgroundColor: theme.primary,
            },
            pulseStyle,
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
  },
});
