import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

export type PaginationDotsProps = {
  count: number;
  scrollX: SharedValue<number>;
  pageWidth: number;
};

export function PaginationDots({ count, scrollX, pageWidth }: PaginationDotsProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, index) => (
        <Dot key={index} index={index} scrollX={scrollX} pageWidth={pageWidth} />
      ))}
    </View>
  );
}

type DotProps = {
  index: number;
  scrollX: SharedValue<number>;
  pageWidth: number;
};

function Dot({ index, scrollX, pageWidth }: DotProps) {
  const theme = useTheme();

  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * pageWidth, index * pageWidth, (index + 1) * pageWidth];
    return {
      width: interpolate(scrollX.value, inputRange, [6, 16, 6], Extrapolation.CLAMP),
      backgroundColor: interpolateColor(scrollX.value, inputRange, [
        theme.backgroundSelected,
        theme.primary,
        theme.backgroundSelected,
      ]),
    };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
