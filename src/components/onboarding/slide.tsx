import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type OnboardingSlideProps = {
  width: number;
  title: string;
  subtitle: string;
  emoji?: string;
  illustration?: ReactNode;
};

export function OnboardingSlide({ width, title, subtitle, emoji, illustration }: OnboardingSlideProps) {
  const theme = useTheme();

  return (
    <View style={[styles.slide, { width }]}>
      <View style={[styles.blob, { backgroundColor: theme.primaryContainer }]}>
        {illustration ?? <ThemedText style={styles.emoji}>{emoji}</ThemedText>}
        <View style={[styles.decorTopRight, { backgroundColor: theme.accent }]} />
        <View style={[styles.decorBottomLeft, { backgroundColor: theme.primary }]} />
      </View>
      <ThemedText type="title" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        {subtitle}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
  },
  blob: {
    width: 240,
    height: 190,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 72,
    lineHeight: 84,
  },
  decorTopRight: {
    position: 'absolute',
    top: -8,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  decorBottomLeft: {
    position: 'absolute',
    bottom: -6,
    left: -10,
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 0.45,
  },
  title: {
    marginTop: Spacing.five,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: Spacing.three,
    textAlign: 'center',
    lineHeight: 24,
  },
});
