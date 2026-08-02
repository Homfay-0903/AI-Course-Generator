import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { userAchievements } from '@/db/schema';
import {
  ACHIEVEMENT_DEFS,
  buildBountiesPayload,
  buildPlayerPayload,
  computeUserStats,
  findCurrentMission,
  findUserByEmail,
} from '@/lib/game';

/**
 * GET /api/game-state
 *
 * Aggregates everything the home/stats screens need in one call:
 * player (level/XP/coins), current mission, today's bounties,
 * achievements, and learning stats.
 *
 * Query parameters:
 *   ?email=user@example.com  — required, the Clerk user's primary email
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const email = url.searchParams.get('email');

    if (!email) {
      return Response.json({ error: 'email query parameter is required' }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return Response.json({ error: 'User not found. Please sign in first.' }, { status: 404 });
    }

    const [currentMission, bounties, stats] = await Promise.all([
      findCurrentMission(user.id),
      buildBountiesPayload(user.id),
      computeUserStats(user.id),
    ]);

    const unlockedRows = await db
      .select({ key: userAchievements.achievementKey, unlockedAt: userAchievements.unlockedAt })
      .from(userAchievements)
      .where(eq(userAchievements.userId, user.id));
    const unlockedMap = new Map(unlockedRows.map((r) => [r.key, r.unlockedAt]));

    const achievements = ACHIEVEMENT_DEFS.map((def) => {
      const unlockedAt = unlockedMap.get(def.key);
      return {
        ...def,
        isUnlocked: unlockedAt !== undefined,
        unlockedAt: unlockedAt ? unlockedAt.toISOString() : undefined,
      };
    });

    return Response.json({
      player: buildPlayerPayload(user),
      currentMission,
      bounties,
      achievements,
      stats,
    });
  } catch (error) {
    console.error('GET /api/game-state error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
