import { Flame, Lock } from 'lucide-react-native';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Realm, RealmDifficulty } from '@/types/game';

export type UnlockableRealmsProps = {
  realms: Realm[];
  onRealmPress?: (realm: Realm) => void;
};

const CARD_WIDTH = 150;
const CARD_HEIGHT = 120;

const DIFFICULTY_LABELS: Record<RealmDifficulty, string> = {
  beginner: '入门',
  intermediate: '进阶',
  advanced: '高级',
};

/**
 * 可解锁领域 — horizontal scrolling course cards styled as game realms.
 * Locked realms show a dark overlay + lock icon.
 * Hot/popular realms get a flame badge.
 */
export function UnlockableRealms({ realms, onRealmPress }: UnlockableRealmsProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.section}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="subtitle">探索领域</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          选择你的下一个冒险
        </ThemedText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {realms.map((realm) => {
          const difficultyColor =
            realm.difficulty === 'beginner'
              ? theme.primary
              : realm.difficulty === 'intermediate'
                ? theme.accent
                : theme.textSecondary;

          return (
            <Pressable
              key={realm.id}
              onPress={() => !realm.locked && onRealmPress?.(realm)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: realm.isHot ? theme.accent : theme.border,
                },
                pressed && !realm.locked && styles.cardPressed,
              ]}
            >
              {/* Realm image */}
              <View style={styles.imageContainer}>
                <Image
                  source={realm.imageAsset}
                  style={styles.realmImage}
                  resizeMode="cover"
                />

                {/* Lock overlay */}
                {realm.locked && (
                  <View style={styles.lockOverlay}>
                    <Lock size={24} color={theme.onPrimary} />
                    <ThemedText
                      type="small"
                      themeColor="onPrimary"
                      style={styles.lockText}
                    >
                      需要完成前置课程
                    </ThemedText>
                  </View>
                )}

                {/* Hot badge */}
                {realm.isHot && !realm.locked && (
                  <View
                    style={[
                      styles.hotBadge,
                      { backgroundColor: theme.accent },
                    ]}
                  >
                    <Flame size={12} color={theme.onPrimary} />
                  </View>
                )}
              </View>

              {/* Card footer */}
              <View style={styles.cardFooter}>
                <View style={styles.titleRow}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {realm.title}
                  </ThemedText>
                  <View
                    style={[
                      styles.difficultyBadge,
                      { backgroundColor: difficultyColor + '1A' },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={{ color: difficultyColor, fontSize: 11 }}
                    >
                      {DIFFICULTY_LABELS[realm.difficulty]}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  numberOfLines={1}
                >
                  {realm.subtitle}
                </ThemedText>
              </View>
            </Pressable>
          );
        })}
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
  card: {
    width: CARD_WIDTH,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardPressed: {
    opacity: 0.85,
  },
  imageContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    position: 'relative',
  },
  realmImage: {
    width: '100%',
    height: '100%',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  lockText: {
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: Spacing.two,
  },
  hotBadge: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooter: {
    padding: Spacing.two,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.one,
  },
  difficultyBadge: {
    paddingHorizontal: Spacing.one + 2,
    paddingVertical: 1,
    borderRadius: Radius.sm,
  },
});
