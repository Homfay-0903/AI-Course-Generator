import { Modal, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BrandSpinner } from '@/components/ui/brand-spinner';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type LoadingOverlayProps = {
  /** Show the overlay (keep the component mounted; toggle this prop). */
  visible: boolean;
  /** Primary Chinese message under the spinner. */
  message?: string;
  /** Optional smaller hint line, e.g. "通常需要 1-2 分钟". */
  secondaryText?: string;
};

/**
 * Full-screen loading overlay that blocks all interaction.
 *
 * Uses a transparent Modal with `onRequestClose` as a no-op so the Android
 * hardware back button and (on web) the Escape key are both ignored — the
 * screen stays locked until the caller flips `visible` to false. `visible`
 * must be toggled, not unmounted, so the fade-out animation plays.
 */
export function LoadingOverlay({ visible, message, secondaryText }: LoadingOverlayProps) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
      statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: theme.background + 'E6' }]}>
        <View style={styles.center}>
          <BrandSpinner size={64} pulse />
          {message ? (
            <ThemedText type="subtitle" style={styles.message}>
              {message}
            </ThemedText>
          ) : null}
          {secondaryText ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.secondary}>
              {secondaryText}
            </ThemedText>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.five,
  },
  message: {
    textAlign: 'center',
  },
  secondary: {
    textAlign: 'center',
  },
});
