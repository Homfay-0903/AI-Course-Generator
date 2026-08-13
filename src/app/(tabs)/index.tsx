import { useAuth, useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CourseDialog, type CourseDialogData } from '@/components/game/course-dialog';
import { CurrentMission } from '@/components/game/current-mission';
import { DailyBounties } from '@/components/game/daily-bounties';
import { HonorShowcase } from '@/components/game/honor-showcase';
import { PlayerInfoCard } from '@/components/game/player-info-card';
import { UnlockableRealms } from '@/components/game/unlockable-realms';
import { ThemedView } from '@/components/themed-view';
import { ThemedActivityIndicator } from '@/components/ui/activity-indicator';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { MOCK_GAME_STATE } from '@/data/game-data';
import { isRealmLocked, REALM_DEFS } from '@/data/game-defs';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useCourseGeneration } from '@/hooks/use-course-generation';
import { useGameState } from '@/hooks/use-game-state';
import type { RealmDef } from '@/data/game-defs';

type RealmWithLock = RealmDef & { locked: boolean };

export default function HomeScreen() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const guardAction = useAuthGuard();
  const { state: gameState, loading: statsLoading, refresh, claimBounty } = useGameState();

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogPreset, setDialogPreset] = useState<string | undefined>(undefined);

  const { overlay, dialogLoading, runCreate } = useCourseGeneration();

  const userEmail = user?.primaryEmailAddress?.emailAddress ?? null;

  // Real DB state when signed in, mock preview when signed out.
  const player = isSignedIn && gameState ? gameState.player : MOCK_GAME_STATE.player;
  const coins = isSignedIn && gameState ? gameState.player.coins : 0;
  const currentMission = isSignedIn && gameState ? gameState.currentMission : MOCK_GAME_STATE.currentMission;
  const dailyBounties = isSignedIn && gameState ? gameState.bounties : MOCK_GAME_STATE.dailyBounties;
  const achievements = isSignedIn && gameState ? gameState.achievements : MOCK_GAME_STATE.achievements;

  const playerLevel = isSignedIn && gameState ? gameState.player.level : MOCK_GAME_STATE.player.level;

  // Realms come from shared defs; lock state follows the player level.
  const realms: RealmWithLock[] = REALM_DEFS.map((realm) => ({
    ...realm,
    locked: isRealmLocked(realm, playerLevel),
  }));
  // ── Current mission → course detail ───────────────────
  const handleMissionPress = () => {
    if (!currentMission) return;
    if (!isSignedIn || !gameState) {
      guardAction(() => {});
      return;
    }
    router.push({ pathname: '/course/[id]', params: { id: currentMission.courseId } });
  };

  // ── Daily bounty claim ────────────────────────────────
  const handleBountyToggle = async (id: string) => {
    if (!isSignedIn || !gameState) {
      guardAction(() => {});
      return;
    }
    const bounty = gameState.bounties.find((b) => b.id === id);
    if (!bounty || bounty.completed) return;

    const result = await claimBounty(id);
    Alert.alert(result.title, result.message);
  };

  // ── Realm discovery → course creation ─────────────────
  const handleRealmPress = (realm: { id: string; title: string; subtitle: string }) => {
    const def = REALM_DEFS.find((r) => r.id === realm.id);
    if (!def) return;
    if (isRealmLocked(def, playerLevel)) {
      Alert.alert('领域未解锁', `达到 Lv.${def.minLevel} 后解锁「${def.title}」，继续学习提升等级吧！`);
      return;
    }
    setDialogPreset(`${def.title} · ${def.subtitle}`);
    setDialogVisible(true);
  };

  const handleCourseSubmit = (data: CourseDialogData) => {
    if (!userEmail) return;
    runCreate(userEmail, data, {
      onCourseCreated: () => {},
      setCourseStatus: () => {},
      onCourseUpdated: () => {},
      onError: (title, message) => {
        setDialogVisible(false);
        Alert.alert(title, message);
      },
      onDone: () => {
        setDialogVisible(false);
        if (gameState) refresh();
      },
    });
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* ── 1. 玩家信息卡 ── */}
          {isSignedIn && statsLoading ? (
            <ThemedActivityIndicator size={24} style={styles.loader} />
          ) : (
            <PlayerInfoCard player={player} coins={coins} />
          )}

          {/* ── 2. 当前任务 ── */}
          {currentMission && (
            <CurrentMission
              mission={currentMission}
              onPress={handleMissionPress}
            />
          )}

          {/* ── 3. 每日赏金 ── */}
          <DailyBounties
            bounties={dailyBounties}
            onToggle={handleBountyToggle}
          />

          {/* ── 4. 探索领域 ── */}
          <UnlockableRealms
            realms={realms}
            onRealmPress={handleRealmPress}
          />

          {/* ── 5. 荣誉陈列柜 ── */}
          <HonorShowcase achievements={achievements} />
        </SafeAreaView>
      </ScrollView>

      <CourseDialog
        visible={dialogVisible}
        initialDescription={dialogPreset}
        loading={dialogLoading}
        onCancel={() => setDialogVisible(false)}
        onSubmit={handleCourseSubmit}
      />

      <LoadingOverlay
        visible={overlay.visible}
        message={overlay.message}
        secondaryText="AI 正在生成内容，通常需要 1-2 分钟"
      />
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
