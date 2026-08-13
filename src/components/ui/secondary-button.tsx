import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedActivityIndicator } from '@/components/ui/activity-indicator';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SecondaryButtonProps = {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  /** Show an inline spinner and disable the button. */
  loading?: boolean;
  /** Disable the button (press becomes a no-op). */
  disabled?: boolean;
  /** Label shown while loading; defaults to `label`. */
  loadingLabel?: string;
};

/**
 * Outlined secondary button — pill-shaped, transparent background,
 * 2px primary-color border, primary-color text.
 *
 * Used alongside PrimaryButton for alternative actions like
 * "注册" (when "登录" is the primary CTA).
 */
export function SecondaryButton({
  label,
  onPress,
  style,
  loading = false,
  disabled = false,
  loadingLabel,
}: SecondaryButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        {
          borderColor: theme.primary,
          opacity: isDisabled ? 0.6 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {loading ? <ThemedActivityIndicator size={16} color={theme.primary} /> : null}
      <ThemedText themeColor="primary" style={styles.label}>
        {loading && loadingLabel ? loadingLabel : label}
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
    flexDirection: 'row',
    gap: Spacing.one,
  },
  label: {
    fontSize: 16,
    fontWeight: 700,
  },
});
