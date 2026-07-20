import { Play } from 'lucide-react-native';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { CircularProgress } from '@/components/game/circular-progress';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Mission } from '@/types/game';

export type CurrentMissionProps = {
  mission: Mission;
  onPress?: () => void;
};

const RING_SIZE = 88;
const RING_STROKE = 6;
const PLAY_ICON_SIZE = 28;

/**
 * 当前任务 — glass-morphism card showing active course progress.
 * Features a breathing play button centered in a circular progress ring,
 * course/chapter info, and a reward hint.
 */
export function CurrentMission({ mission, onPress }: CurrentMissionProps) {
  const theme = useTheme();

  // ── Breathing animation for the play button ──────────
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.45, { duration: 1200 }), -1, true);
  }, [opacity]);

  const playButtonStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Pressable onPress={onPress}>
      <ThemedView
        type="backgroundElement"
        style={[
          styles.card,
          Platform.OS === 'web'
            ? // Web: box-shadow glow
              { boxShadow: `0 0 24px ${theme.primary}22` }
            : // Native: shadow props
              {
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.18,
                shadowRadius: 16,
                elevation: 6,
              },
        ]}
      >
        {/* Glow border overlay */}
        <View
          style={[
            styles.glowBorder,
            { borderColor: theme.primary + '30' },
          ]}
          pointerEvents="none"
        />

        <View style={styles.content}>
          {/* Left: progress ring + play button */}
          <View style={styles.progressArea}>
            <CircularProgress
              progress={mission.progress}
              size={RING_SIZE}
              strokeWidth={RING_STROKE}
              color={theme.primary}
              label={null}
            />
            <Animated.View
              style={[
                styles.playButton,
                { backgroundColor: theme.primary },
                playButtonStyle,
              ]}
            >
              <Play
                size={PLAY_ICON_SIZE}
                color={theme.onPrimary}
                fill={theme.onPrimary}
                style={styles.playIcon}
              />
            </Animated.View>
          </View>

          {/* Right: course info */}
          <View style={styles.infoArea}>
            <ThemedText type="small" themeColor="textSecondary">
              当前任务
            </ThemedText>
            <ThemedText type="subtitle" style={styles.courseTitle}>
              {mission.title}
            </ThemedText>
            <ThemedText style={styles.chapter}>{mission.chapterTitle}</ThemedText>
            <View
              style={[styles.rewardBadge, { backgroundColor: theme.primaryContainer }]}
            >
              <ThemedText type="smallBold" themeColor="primary">
                完成本章即可解锁 {mission.rewardXP} 点经验
              </ThemedText>
            </View>
          </View>
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  glowBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    padding: Spacing.four,
    gap: Spacing.four,
    alignItems: 'center',
  },
  progressArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    marginLeft: 2, // optical centering for Play triangle
  },
  infoArea: {
    flex: 1,
    gap: Spacing.one,
  },
  courseTitle: {
    marginTop: 2,
  },
  chapter: {
    fontSize: 15,
    lineHeight: 22,
  },
  rewardBadge: {
    alignSelf: 'flex-start',
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.sm,
  },
});
