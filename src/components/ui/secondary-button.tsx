import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SecondaryButtonProps = {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Outlined secondary button — pill-shaped, transparent background,
 * 2px primary-color border, primary-color text.
 *
 * Used alongside PrimaryButton for alternative actions like
 * "注册" (when "登录" is the primary CTA).
 */
export function SecondaryButton({ label, onPress, style }: SecondaryButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          borderColor: theme.primary,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <ThemedText themeColor="primary" style={styles.label}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Radius.pill,
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  label: {
    fontSize: 16,
    fontWeight: 700,
  },
});
