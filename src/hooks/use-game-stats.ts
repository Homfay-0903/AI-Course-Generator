import { useAuth, useUser } from '@clerk/expo';
import { useEffect, useRef, useState } from 'react';

import type { PlayerStats } from '@/types/game';
import { getLevelTitle } from '@/types/game';

export interface GameStats {
  xp: number;
  coins: number;
  level: number;
}

interface UseGameStatsResult {
  /** Real player stats from the DB, or null while loading / when signed out. */
  stats: PlayerStats | null;
  /** Raw game data from the DB (xp, coins, level). null when signed out. */
  raw: GameStats | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetches the current user's game stats from the database via the API.
 * On first access, syncs the Clerk user to the DB (creates a record if needed).
 * Returns null for signed-out users.
 */
export function useGameStats(): UseGameStatsResult {
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { user } = useUser();
  const [raw, setRaw] = useState<GameStats | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastEmail = useRef<string | null>(null);

  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const shouldFetch = authLoaded && isSignedIn && email !== null;

  useEffect(() => {
    if (!shouldFetch || email === null) return;

    // Avoid re-fetching for the same email (Clerk fires user updates repeatedly)
    if (email === lastEmail.current && raw !== null) return;
    lastEmail.current = email;

    setFetching(true);
    let cancelled = false;

    const sync = async () => {
      try {
        const res = await fetch('/api/user', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            name: user?.fullName ?? undefined,
            avatarUrl: user?.imageUrl ?? undefined,
          }),
        });

        if (!res.ok) throw new Error(`API error: ${res.status}`);

        const data = await res.json();
        if (!cancelled) {
          setRaw({
            xp: data.user.xp,
            coins: data.user.coins,
            level: data.user.level,
          });
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '获取数据失败');
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    };

    sync();
    return () => { cancelled = true; };
  }, [shouldFetch, email, user, raw]);

  // Signed-out / no email → return null stats without loading
  if (!authLoaded) {
    return { stats: null, raw: null, loading: true, error: null };
  }

  if (!shouldFetch) {
    return { stats: null, raw: null, loading: false, error: null };
  }

  // Build PlayerStats from raw data
  const stats: PlayerStats | null = raw
    ? {
        level: raw.level,
        levelTitle: getLevelTitle(raw.level),
        currentXP: raw.xp,
        xpToNextLevel: raw.level * 200,
        totalXP: raw.xp,
      }
    : null;

  return { stats, raw, loading: fetching, error };
}
