import { useAuth } from '@clerk/expo';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CurrentMission } from '@/components/game/current-mission';
import { DailyBounties } from '@/components/game/daily-bounties';
import { HonorShowcase } from '@/components/game/honor-showcase';
import { PlayerInfoCard } from '@/components/game/player-info-card';
import { UnlockableRealms } from '@/components/game/unlockable-realms';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { MOCK_GAME_STATE } from '@/data/game-data';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useGameStats } from '@/hooks/use-game-stats';

export default function HomeScreen() {
  const { isSignedIn } = useAuth();
  const guardAction = useAuthGuard();
  const { stats: dbStats, raw: dbRaw, loading: statsLoading } = useGameStats();

  // Use real DB stats when signed in, mock data when signed out
  const player = isSignedIn && dbStats ? dbStats : MOCK_GAME_STATE.player;
  const coins = isSignedIn && dbRaw ? dbRaw.coins : 0;

  const { currentMission, dailyBounties, realms, achievements } =
    MOCK_GAME_STATE;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* ── 1. 玩家信息卡 ── */}
          {isSignedIn && statsLoading ? (
            <ActivityIndicator size="small" style={styles.loader} />
          ) : (
            <PlayerInfoCard player={player} coins={coins} />
          )}

          {/* ── 2. 当前任务 ── */}
          {currentMission && (
            <CurrentMission
              mission={currentMission}
              onPress={() => guardAction(() => {})}
            />
          )}

          {/* ── 3. 每日赏金 ── */}
          <DailyBounties
            bounties={dailyBounties}
            onToggle={() => guardAction(() => {})}
          />

          {/* ── 4. 探索领域 ── */}
          <UnlockableRealms
            realms={realms}
            onRealmPress={() => guardAction(() => {})}
          />

          {/* ── 5. 荣誉陈列柜 ── */}
          <HonorShowcase achievements={achievements} />
        </SafeAreaView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: BottomTabInset + Spacing.six,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  loader: {
    paddingVertical: Spacing.four,
  },
});
