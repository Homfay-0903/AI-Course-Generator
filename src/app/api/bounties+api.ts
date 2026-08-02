import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { bountyCompletions, users } from '@/db/schema';
import {
  BOUNTY_DEFS,
  dateKey,
  evaluateBounty,
  findUserByEmail,
  splitLevel,
} from '@/lib/game';

/**
 * POST /api/bounties
 *
 * Claims a daily bounty — grants its reward (coins or XP) and records
 * the claim for today. Each bounty can only be claimed once per day.
 *
 * Request body (JSON): { userEmail: string, bountyKey: string }
 *
 * Responses:
 *   200 — reward granted: { bountyKey, reward, balance: { xp, coins }, leveledUp }
 *   400 — bounty key unknown / condition not yet met
 *   404 — user not found
 *   409 — already claimed today
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userEmail?: string;
      bountyKey?: string;
    };

    const { userEmail, bountyKey } = body;
    if (!userEmail || typeof userEmail !== 'string') {
      return Response.json({ error: 'userEmail is required' }, { status: 400 });
    }
    if (!bountyKey || typeof bountyKey !== 'string') {
      return Response.json({ error: 'bountyKey is required' }, { status: 400 });
    }

    const def = BOUNTY_DEFS.find((d) => d.key === bountyKey);
    if (!def) {
      return Response.json({ error: 'Unknown bounty key' }, { status: 400 });
    }

    const user = await findUserByEmail(userEmail);
    if (!user) {
      return Response.json({ error: 'User not found. Please sign in first.' }, { status: 404 });
    }

    const today = dateKey();

    // Already claimed today?
    const claimed = await db
      .select({ id: bountyCompletions.id })
      .from(bountyCompletions)
      .where(and(eq(bountyCompletions.userId, user.id), eq(bountyCompletions.bountyKey, bountyKey), eq(bountyCompletions.day, today)))
      .limit(1);
    if (claimed.length > 0) {
      return Response.json({ error: '该赏金今天已经领取过了' }, { status: 409 });
    }

    // Condition met?
    const met = await evaluateBounty(user.id, bountyKey, today);
    if (!met) {
      return Response.json({ error: '条件尚未达成，完成对应任务后再来领取' }, { status: 400 });
    }

    const { reward } = def;
    const newXp = reward.type === 'xp' ? user.xp + reward.amount : user.xp;
    const newCoins = reward.type === 'coins' ? user.coins + reward.amount : user.coins;
    const newLevel = splitLevel(newXp).level;

    // No transactions in the neon-http driver — the unique index on
    // (user_id, bounty_key, day) is the authoritative duplicate guard.
    // Insert the claim first (wins the race via unique index), then update
    // the user; on update failure, best-effort roll back the claim row.
    try {
      await db.insert(bountyCompletions).values({
        userId: user.id,
        bountyKey,
        day: today,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('unique') || msg.includes('duplicate')) {
        return Response.json({ error: '该赏金今天已经领取过了' }, { status: 409 });
      }
      throw error;
    }

    try {
      await db
        .update(users)
        .set({ xp: newXp, coins: newCoins, level: newLevel, updatedAt: new Date() })
        .where(eq(users.id, user.id));
    } catch (error) {
      console.error('POST /api/bounties user update failed, rolling back claim:', error);
      try {
        await db
          .delete(bountyCompletions)
          .where(and(eq(bountyCompletions.userId, user.id), eq(bountyCompletions.bountyKey, bountyKey), eq(bountyCompletions.day, today)));
      } catch {
        // Best effort — a stale claim row without rewards is acceptable.
      }
      throw error;
    }

    return Response.json({
      bountyKey,
      reward,
      balance: { xp: newXp, coins: newCoins },
      leveledUp: newLevel > user.level,
    });
  } catch (error) {
    console.error('POST /api/bounties error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
