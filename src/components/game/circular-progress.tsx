import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export type CircularProgressProps = {
  /** Progress value from 0 to 100. */
  progress: number;
  /** Diameter of the ring in points. */
  size?: number;
  /** Width of the progress arc stroke. */
  strokeWidth?: number;
  /** Color of the filled progress arc. Defaults to theme.primary. */
  color?: string;
  /** Override the center percentage text. Pass null to hide. */
  label?: string | null;
};

/**
 * A circular progress ring built with react-native-svg.
 * Shows a track ring in `theme.border` and a filled arc in the given color.
 * The center displays the progress percentage by default.
 */
export function CircularProgress({
  progress,
  size = 80,
  strokeWidth = 6,
  color,
  label,
}: CircularProgressProps) {
  const theme = useTheme();

  const clampedProgress = Math.max(0, Math.min(100, progress));
  const arcColor = color ?? theme.primary;
  const trackColor = theme.border;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clampedProgress / 100);
  const center = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc — rotated -90° so it starts from top */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={arcColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {label !== null && (
        <View style={styles.labelContainer}>
          <ThemedText style={[styles.label, { fontSize: size * 0.22 }]}>
            {label ?? `${Math.round(clampedProgress)}%`}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: 700,
  },
});
