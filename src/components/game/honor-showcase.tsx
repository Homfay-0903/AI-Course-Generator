import { Image, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Achievement } from '@/types/game';

export type HonorShowcaseProps = {
  achievements: Achievement[];
};

const BADGE_SIZE = 64;
const CARD_WIDTH = 100;

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

/**
 * 荣誉陈列柜 — horizontal scroll of achievement badge cards.
 * Unlocked badges show full-color with unlock date.
 * Locked badges are dimmed and show "???" as the title.
 */
export function HonorShowcase({ achievements }: HonorShowcaseProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.section}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="subtitle">荣誉陈列柜</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          你的成就与荣耀
        </ThemedText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {achievements.map((ach) => (
          <ThemedView
            key={ach.id}
            type="backgroundElement"
            style={[
              styles.badgeCard,
              { borderColor: theme.border },
              ach.isUnlocked && {
                borderColor: theme.accent + '40',
              },
            ]}
          >
            {/* Badge icon */}
            <View style={styles.badgeIconWrap}>
              <Image
                source={ach.iconAsset}
                style={[
                  styles.badgeIcon,
                  { opacity: ach.isUnlocked ? 1 : 0.25 },
                ]}
                resizeMode="contain"
              />
              {ach.isUnlocked && (
                <View
                  style={[
                    styles.badgeGlow,
                    { backgroundColor: theme.accent + '18' },
                  ]}
                />
              )}
            </View>

            {/* Title */}
            <ThemedText
              type="smallBold"
              style={styles.badgeTitle}
              numberOfLines={1}
              themeColor={ach.isUnlocked ? 'text' : 'textSecondary'}
            >
              {ach.isUnlocked ? ach.title : '???'}
            </ThemedText>

            {/* Unlock date */}
            {ach.isUnlocked && ach.unlockedAt ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.date}>
                {formatDate(ach.unlockedAt)}
              </ThemedText>
            ) : (
              <ThemedText type="small" themeColor="textSecondary" style={styles.date}>
                未解锁
              </ThemedText>
            )}
          </ThemedView>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  header: {
    paddingHorizontal: Spacing.four,
    gap: 2,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  badgeCard: {
    width: CARD_WIDTH,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    gap: Spacing.two,
  },
  badgeIconWrap: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  badgeIcon: {
    width: BADGE_SIZE - 16,
    height: BADGE_SIZE - 16,
  },
  badgeGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BADGE_SIZE / 2,
  },
  badgeTitle: {
    textAlign: 'center',
    fontSize: 12,
  },
  date: {
    textAlign: 'center',
    fontSize: 11,
  },
});
