import { useUser } from '@clerk/expo';
import { Image, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PlayerStats } from '@/types/game';

export type PlayerInfoCardProps = {
  player: PlayerStats;
  /** Coin count to display. Defaults to 0. */
  coins?: number;
};

/**
 * 玩家信息卡 — shows avatar, name, level badge, coins, and XP progress bar.
 * Uses Clerk user data when signed in; falls back to "冒险者" for anonymous users.
 */
export function PlayerInfoCard({ player, coins = 0 }: PlayerInfoCardProps) {
  const theme = useTheme();
  const { user } = useUser();

  const displayName = user?.fullName ?? '冒险者';
  const avatarSource = user?.imageUrl
    ? { uri: user.imageUrl }
    : require('@/assets/images/avatar.png');

  const xpPercent = Math.min(100, (player.currentXP / player.xpToNextLevel) * 100);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {/* Top row: avatar + name + badges */}
      <View style={styles.topRow}>
        <Image
          source={avatarSource}
          style={[styles.avatar, { borderColor: theme.primaryContainer }]}
        />
        <View style={styles.nameBlock}>
          <ThemedText type="subtitle">{displayName}</ThemedText>
          <View style={styles.badgesRow}>
            <ThemedView type="primaryContainer" style={styles.levelBadge}>
              <ThemedText type="smallBold" themeColor="primary">
                {player.level} 级 · {player.levelTitle}
              </ThemedText>
            </ThemedView>
            <View style={[styles.coinsBadge, { backgroundColor: theme.accent + '1A' }]}>
              <Image
                source={require('@/assets/images/coin.png')}
                style={[styles.coinIcon, { tintColor: theme.accent }]}
              />
              <ThemedText type="smallBold" themeColor="accent">
                {coins}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>

      {/* XP progress bar */}
      <View style={styles.xpSection}>
        <View style={[styles.xpTrack, { backgroundColor: theme.backgroundSelected }]}>
          <View
            style={[
              styles.xpFill,
              {
                backgroundColor: theme.primary,
                width: `${xpPercent}%` as unknown as number,
              },
            ]}
          />
        </View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.xpLabel}>
          {player.currentXP} / {player.xpToNextLevel} XP
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const AVATAR_SIZE = 56;

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
  },
  nameBlock: {
    flex: 1,
    gap: Spacing.one,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  levelBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  coinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  coinIcon: {
    width: 16,
    height: 16,
  },
  xpSection: {
    gap: Spacing.one,
  },
  xpTrack: {
    height: 8,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  xpLabel: {
    textAlign: 'right',
  },
});
