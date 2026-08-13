import type { StyleProp, ViewStyle } from 'react-native';

import { BrandSpinner } from '@/components/ui/brand-spinner';

export type ThemedActivityIndicatorProps = {
  /** Diameter of the ring in points. */
  size?: number;
  /** Color of the rotating arc. Defaults to theme.primary. */
  color?: string;
  style?: StyleProp<ViewStyle>;
};

/** Brand-styled inline spinner — drop-in replacement for ActivityIndicator. */
export function ThemedActivityIndicator({
  size = 20,
  color,
  style,
}: ThemedActivityIndicatorProps) {
  return <BrandSpinner size={size} color={color} style={style} />;
}
