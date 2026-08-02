import { useAuth, useUser } from '@clerk/expo';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ACHIEVEMENT_FALLBACK_ICON, ACHIEVEMENT_ICONS } from '@/data/game-defs';
import type { Achievement, Bounty, Mission, PlayerStats } from '@/types/game';

export interface GameStatsPayload {
  studyDays: number;
  streakDays: number;
  completedLessons: number;
  totalLessons: number;
  completedCourses: number;
  createdCourses: number;
}

/** Fully client-shaped game state (icons mapped, bounty ids set). */
export interface GameState {
  player: PlayerStats & { coins: number };
  currentMission: Mission | null;
  bounties: Bounty[];
  achievements: Achievement[];
  stats: GameStatsPayload;
}

/** Result of a bounty claim attempt. */
export interface ClaimResult {
  success: boolean;
  title: string;
  message: string;
}

interface UseGameStateResult {
  /** Real game state from the API, or null while loading / when signed out. */
  state: GameState | null;
  loading: boolean;
  error: string | null;
  /** Re-fetch the game state (after completing a lesson or claiming a bounty). */
  refresh: () => Promise<void>;
  /** Claim a daily bounty; on success the game state is refreshed. */
  claimBounty: (bountyKey: string) => Promise<ClaimResult>;
}

/**
 * Fetches the aggregated game state (player, mission, bounties,
 * achievements, stats) from the API for the signed-in user.
 * Returns null for signed-out users.
 */
export function useGameState(): UseGameStateResult {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { user } = useUser();
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastEmail = useRef<string | null>(null);

  const email = user?.primaryEmailAddress?.emailAddress ?? null;

  const fetchState = useCallback(
    async (force = false) => {
      if (!authLoaded || !isSignedIn || email === null) return;

      // Avoid re-fetching for the same email (Clerk fires user updates repeatedly).
      if (!force && email === lastEmail.current && state !== null) return;
      lastEmail.current = email;

      setLoading(true);
      try {
        const res = await fetch(`/api/game-state?email=${encodeURIComponent(email)}`);
        if (!res.ok) throw new Error(`API error: ${res.status}`);

        const data = await res.json();
        setState({
          player: data.player,
          currentMission: data.currentMission,
          bounties: (data.bounties ?? []).map((b: { key: string; title: string; description: string; reward: Bounty['reward']; completed: boolean }) => ({
            id: b.key,
            title: b.title,
            description: b.description,
            reward: b.reward,
            completed: b.completed,
          })),
          achievements: (data.achievements ?? []).map((a: { key: string; title: string; description: string; isUnlocked: boolean; unlockedAt?: string }) => ({
            id: a.key,
            title: a.title,
            description: a.description,
            iconAsset: ACHIEVEMENT_ICONS[a.key] ?? ACHIEVEMENT_FALLBACK_ICON,
            isUnlocked: a.isUnlocked,
            unlockedAt: a.unlockedAt,
          })),
          stats: data.stats,
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取数据失败');
      } finally {
        setLoading(false);
      }
    },
    [authLoaded, isSignedIn, email, state],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchState();
  }, [fetchState]);

  const refresh = useCallback(() => fetchState(true), [fetchState]);

  const claimBounty = useCallback(
    async (bountyKey: string): Promise<ClaimResult> => {
      if (!isSignedIn || email === null) {
        return { success: false, title: '需要登录', message: '登录后才能领取赏金' };
      }

      try {
        const res = await fetch('/api/bounties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userEmail: email, bountyKey }),
        });

        if (res.status === 409) {
          return { success: false, title: '已领取', message: '该赏金今天已经领取过了' };
        }

        if (!res.ok) {
          const err = await res.json();
          return {
            success: false,
            title: '任务尚未完成',
            message: err.error ?? '完成对应任务后再来领取',
          };
        }

        const result = await res.json();
        const unit = result.reward?.type === 'coins' ? '金币' : 'XP';
        const message = `+${result.reward?.amount ?? 0} ${unit}${result.leveledUp ? ' · 恭喜升级！' : ''}`;
        void refresh();
        return { success: true, title: '领取成功', message };
      } catch {
        return { success: false, title: '网络错误', message: '请检查网络连接后重试' };
      }
    },
    [isSignedIn, email, refresh],
  );

  if (!authLoaded) {
    return { state: null, loading: true, error: null, refresh, claimBounty };
  }

  if (!isSignedIn || email === null) {
    return { state: null, loading: false, error: null, refresh, claimBounty };
  }

  return { state, loading, error, refresh, claimBounty };
}
