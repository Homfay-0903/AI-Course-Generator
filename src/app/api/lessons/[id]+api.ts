import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { chapters, courses, lessonCompletions, lessons, userAchievements, users } from '@/db/schema';
import {
  evaluateAchievements,
  findUserByEmail,
  getCompletionSet,
  REWARDS,
  splitLevel,
} from '@/lib/game';

/**
 * GET /api/lessons/[id]
 *
 * Returns a single lesson with its course/chapter context and
 * prev/next navigation (flattened across chapters, in learning order).
 *
 * Query parameters:
 *   ?email=user@example.com  — required for ownership verification
 *
 * Response shape:
 *   {
 *     courseId, courseTitle, chapterTitle,
 *     lesson: { id, title, content },
 *     completed: boolean,
 *     prevLessonId: string | null,
 *     nextLessonId: string | null,
 *   }
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.indexOf('lessons') + 1];
  const email = url.searchParams.get('email');

  if (!id) {
    return Response.json({ error: 'Lesson ID is required in the URL path' }, { status: 400 });
  }
  if (!email) {
    return Response.json({ error: 'email query parameter is required' }, { status: 400 });
  }

  try {
    const row = await db
      .select({
        lesson: lessons,
        chapter: chapters,
        course: courses,
      })
      .from(lessons)
      .innerJoin(chapters, eq(lessons.chapterId, chapters.id))
      .innerJoin(courses, eq(chapters.courseId, courses.id))
      .innerJoin(users, eq(courses.userId, users.id))
      .where(and(eq(lessons.id, id), eq(users.email, email)))
      .limit(1);

    const found = row[0];
    if (!found) {
      return Response.json({ error: 'Lesson not found or access denied' }, { status: 404 });
    }

    // Flatten all lessons of the course in learning order to find prev/next.
    const chapterRows = await db
      .select()
      .from(chapters)
      .where(eq(chapters.courseId, found.course.id))
      .orderBy(asc(chapters.order));

    const flat: { lesson: typeof found.lesson }[] = [];
    for (const ch of chapterRows) {
      const lessonRows = await db
        .select()
        .from(lessons)
        .where(eq(lessons.chapterId, ch.id))
        .orderBy(asc(lessons.order));
      for (const l of lessonRows) {
        flat.push({ lesson: l });
      }
    }

    const index = flat.findIndex((f) => f.lesson.id === id);
    const prev = index > 0 ? flat[index - 1].lesson : null;
    const next = index >= 0 && index < flat.length - 1 ? flat[index + 1].lesson : null;

    const completedRows = await db
      .select({ id: lessonCompletions.id })
      .from(lessonCompletions)
      .where(and(eq(lessonCompletions.userId, found.course.userId), eq(lessonCompletions.lessonId, id)))
      .limit(1);

    return Response.json({
      courseId: found.course.id,
      courseTitle: found.course.title,
      chapterTitle: found.chapter.title,
      lesson: { id: found.lesson.id, title: found.lesson.title, content: found.lesson.content },
      completed: completedRows.length > 0,
      prevLessonId: prev?.id ?? null,
      nextLessonId: next?.id ?? null,
    });
  } catch (error) {
    console.error('GET /api/lessons/[id] error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/lessons/[id]
 *
 * Completes a lesson and grants rewards (idempotent — completing twice
 * never grants a second reward).
 *
 * Request body (JSON): { userEmail: string }
 *
 * Rewards:
 *   - lesson: 50 XP + 10 coins (first completion only)
 *   - chapter bonus: +100 XP + 30 coins when every lesson of the chapter is done
 *   - course bonus:  +200 XP + 100 coins when every lesson of the course is done
 * Newly unlocked achievements are also recorded.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const id = pathParts[pathParts.indexOf('lessons') + 1];

  if (!id) {
    return Response.json({ error: 'Lesson ID is required in the URL path' }, { status: 400 });
  }

  try {
    const body = (await request.json()) as { userEmail?: string };
    const userEmail = body.userEmail;
    if (!userEmail || typeof userEmail !== 'string') {
      return Response.json({ error: 'userEmail is required' }, { status: 400 });
    }

    const user = await findUserByEmail(userEmail);
    if (!user) {
      return Response.json({ error: 'User not found. Please sign in first.' }, { status: 404 });
    }

    // Verify lesson ownership: lesson → chapter → course → user.
    const lessonRow = await db
      .select({ lesson: lessons, chapter: chapters, course: courses })
      .from(lessons)
      .innerJoin(chapters, eq(lessons.chapterId, chapters.id))
      .innerJoin(courses, eq(chapters.courseId, courses.id))
      .where(and(eq(lessons.id, id), eq(courses.userId, user.id)))
      .limit(1);

    const found = lessonRow[0];
    if (!found) {
      return Response.json({ error: 'Lesson not found or access denied' }, { status: 404 });
    }
    if (found.course.status !== 'ready') {
      return Response.json({ error: '课程尚未生成完成，请稍后再试' }, { status: 409 });
    }

    // Idempotency check (also enforced by the unique index).
    const existing = await db
      .select({ id: lessonCompletions.id })
      .from(lessonCompletions)
      .where(and(eq(lessonCompletions.userId, user.id), eq(lessonCompletions.lessonId, id)))
      .limit(1);
    if (existing.length > 0) {
      return Response.json({
        lessonId: id,
        alreadyCompleted: true,
        xpEarned: 0,
        coinsEarned: 0,
        level: user.level,
        leveledUp: false,
        unlockedAchievements: [],
      });
    }

    // Determine chapter/course completion with this lesson included.
    const done = await getCompletionSet(user.id, found.course.id);

    const chapterLessonRows = await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(eq(lessons.chapterId, found.chapter.id));
    const chapterDone =
      chapterLessonRows.length > 0 &&
      chapterLessonRows.every((l) => done.has(l.id) || l.id === id);

    const chapterRows = await db.select().from(chapters).where(eq(chapters.courseId, found.course.id));
    let allCourseLessons = 0;
    for (const ch of chapterRows) {
      const rows = await db.select({ id: lessons.id }).from(lessons).where(eq(lessons.chapterId, ch.id));
      allCourseLessons += rows.length;
    }
    const courseDone = allCourseLessons > 0 && done.size + 1 >= allCourseLessons;

    const xpEarned =
      REWARDS.lessonXp +
      (chapterDone ? REWARDS.chapterXp : 0) +
      (courseDone ? REWARDS.courseXp : 0);
    const coinsEarned =
      REWARDS.lessonCoins +
      (chapterDone ? REWARDS.chapterCoins : 0) +
      (courseDone ? REWARDS.courseCoins : 0);

    const newXp = user.xp + xpEarned;
    const newLevel = splitLevel(newXp).level;

    // No transactions in the neon-http driver — the unique index on
    // (user_id, lesson_id) is the authoritative duplicate guard.
    // Order: insert completion first (wins the race via unique index),
    // then update the user; on update failure, best-effort roll back the
    // completion row so a retry can still earn the reward.
    try {
      await db.insert(lessonCompletions).values({
        userId: user.id,
        lessonId: id,
        xpEarned,
        coinsEarned,
      });
    } catch (error) {
      // Unique index race: someone else completed it first → idempotent success.
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('unique') || msg.includes('duplicate')) {
        return Response.json({
          lessonId: id,
          alreadyCompleted: true,
          xpEarned: 0,
          coinsEarned: 0,
          level: user.level,
          leveledUp: false,
          unlockedAchievements: [],
        });
      }
      throw error;
    }

    try {
      await db
        .update(users)
        .set({ xp: newXp, coins: user.coins + coinsEarned, level: newLevel, updatedAt: new Date() })
        .where(eq(users.id, user.id));
    } catch (error) {
      console.error('POST /api/lessons/[id] user update failed, rolling back completion:', error);
      try {
        await db
          .delete(lessonCompletions)
          .where(and(eq(lessonCompletions.userId, user.id), eq(lessonCompletions.lessonId, id)));
      } catch {
        // Best effort — a stale completion row without rewards is acceptable.
      }
      throw error;
    }

    // Evaluate achievements against the fresh state (after commit).
    const unlockedDefs = await evaluateAchievements(user.id);
    const unlockedAchievements: { key: string; title: string; description: string }[] = [];
    for (const def of unlockedDefs) {
      try {
        await db.insert(userAchievements).values({
          userId: user.id,
          achievementKey: def.key,
        });
        unlockedAchievements.push(def);
      } catch {
        // already unlocked by a concurrent request — ignore
      }
    }

    return Response.json({
      lessonId: id,
      alreadyCompleted: false,
      xpEarned,
      coinsEarned,
      level: newLevel,
      leveledUp: newLevel > user.level,
      unlockedAchievements,
    });
  } catch (error) {
    console.error('POST /api/lessons/[id] error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
