import { Circle, CircleCheckBig } from 'lucide-react-native';
import type { ImageSourcePropType } from 'react-native';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Bounty, RewardType } from '@/types/game';

export type DailyBountiesProps = {
  bounties: Bounty[];
  onToggle?: (id: string) => void;
};

const REWARD_ICONS: Record<RewardType, ImageSourcePropType> = {
  coins: require('@/assets/images/coin.png'),
  gems: require('@/assets/images/gem.png'),
  xp: require('@/assets/images/lightning.png'),
};

const CHECK_SIZE = 22;
const REWARD_ICON_SIZE = 18;

/**
 * 每日赏金 — daily challenge checklist with golden reward accents.
 * Shows 3 tasks, each with a completion toggle and reward badge.
 */
export function DailyBounties({ bounties, onToggle }: DailyBountiesProps) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {/* Accent top border */}
      <View style={[styles.accentBorder, { backgroundColor: theme.accent }]} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('@/assets/images/coin-stack.png')}
            style={[styles.headerIcon, { tintColor: theme.accent }]}
          />
          <ThemedText type="subtitle">每日赏金</ThemedText>
        </View>
      </View>

      {/* Bounty rows */}
      <View style={styles.list}>
        {bounties.map((bounty, index) => {
          const isCompleted = bounty.completed;
          const checkColor = isCompleted ? theme.primary : theme.textSecondary;
          const textColor = isCompleted ? theme.textSecondary : theme.text;

          return (
            <Pressable
              key={bounty.id}
              onPress={() => onToggle?.(bounty.id)}
              style={[
                styles.bountyRow,
                index < bounties.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.border,
                },
              ]}
            >
              {/* Checkbox */}
              {isCompleted ? (
                <CircleCheckBig size={CHECK_SIZE} color={checkColor} />
              ) : (
                <Circle size={CHECK_SIZE} color={checkColor} />
              )}

              {/* Task text */}
              <View style={styles.taskText}>
                <ThemedText
                  style={[
                    styles.taskTitle,
                    { color: textColor },
                    isCompleted && styles.completedText,
                  ]}
                >
                  {bounty.title}
                </ThemedText>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={isCompleted && styles.completedText}
                >
                  {bounty.description}
                </ThemedText>
              </View>

              {/* Reward badge */}
              <View
                style={[
                  styles.rewardBadge,
                  { backgroundColor: theme.accent + '1A' },
                ]}
              >
                <Image
                  source={REWARD_ICONS[bounty.reward.type]}
                  style={[styles.rewardIcon, { tintColor: theme.accent }]}
                />
                <ThemedText type="smallBold" themeColor="accent">
                  +{bounty.reward.amount}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  accentBorder: {
    height: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerIcon: {
    width: 24,
    height: 24,
  },
  list: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.one,
  },
  bountyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  taskText: {
    flex: 1,
    gap: 2,
  },
  taskTitle: {
    fontWeight: 600,
    fontSize: 15,
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  rewardIcon: {
    width: REWARD_ICON_SIZE,
    height: REWARD_ICON_SIZE,
  },
});
