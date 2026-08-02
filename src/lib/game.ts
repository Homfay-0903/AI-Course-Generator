/**
 * Server-side game logic: reward formulas, bounty/achievement definitions,
 * and condition evaluators.
 *
 * HARD RULE: server-only. This module imports @/db and must never be
 * imported from client components (would bundle the DB driver into the
 * React Native runtime).
 */

import { and, asc, eq, inArray } from 'drizzle-orm';

import { db } from '@/db';
import {
  bountyCompletions,
  chapters,
  courses,
  lessonCompletions,
  lessons,
  userAchievements,
  users,
  type User,
} from '@/db/schema';
import { getLevelTitle, type Mission } from '@/types/game';

// ── Reward constants ────────────────────────────────────

export const REWARDS = {
  /** XP for first completion of a lesson. */
  lessonXp: 50,
  /** Coins for first completion of a lesson. */
  lessonCoins: 10,
  /** Bonus XP when every lesson of a chapter is completed. */
  chapterXp: 100,
  /** Bonus coins when every lesson of a chapter is completed. */
  chapterCoins: 30,
  /** Bonus XP when every lesson of a course is completed. */
  courseXp: 200,
  /** Bonus coins when every lesson of a course is completed. */
  courseCoins: 100,
} as const;

/** Max level, matches LEVEL_TITLES range in types/game.ts. */
export const MAX_LEVEL = 10;

/** XP required to advance FROM the given level. */
export function levelThreshold(level: number): number {
  return level * 200;
}

/**
 * Split a running XP total into (level, currentXp-within-level).
 * Level is always derived from XP — users.level is kept in sync but XP is
 * the single source of truth.
 */
export function splitLevel(totalXp: number): { level: number; currentXp: number } {
  let level = 1;
  let currentXp = totalXp;
  while (level < MAX_LEVEL && currentXp >= levelThreshold(level)) {
    currentXp -= levelThreshold(level);
    level += 1;
  }
  return { level, currentXp };
}

// ── Date helpers (server-local timezone) ────────────────

/** 'YYYY-MM-DD' for the server-local date, offset days from today. */
export function dateKey(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return formatDateKey(d);
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isToday(ts: Date, day: string): boolean {
  return formatDateKey(ts) === day;
}

// ── Bounty definitions ──────────────────────────────────

export interface BountyDef {
  key: string;
  title: string;
  description: string;
  reward: { type: 'coins' | 'xp'; amount: number };
}

export const BOUNTY_DEFS: BountyDef[] = [
  {
    key: 'b-lessons',
    title: '完成 2 节课',
    description: '今天完成任意 2 个课时学习',
    reward: { type: 'coins', amount: 50 },
  },
  {
    key: 'b-chapter',
    title: '开启新章节',
    description: '今天开始学习一个新章节',
    reward: { type: 'coins', amount: 30 },
  },
  {
    key: 'b-create',
    title: '创建新课程',
    description: '今天创建一门 AI 课程',
    reward: { type: 'xp', amount: 80 },
  },
  {
    key: 'b-complete',
    title: '完成一门课程',
    description: '今天学完一门课程的全部课时',
    reward: { type: 'coins', amount: 100 },
  },
];

// ── Achievement definitions ─────────────────────────────

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { key: 'a-streak-7', title: '连续学习 7 天', description: '连续一周每天坚持学习' },
  { key: 'a-owl', title: '夜猫达人', description: '在晚上 10 点后完成一节课程' },
  { key: 'a-first-course', title: '初次完成课程', description: '完成第一门课程' },
  { key: 'a-speedrun', title: '速通挑战', description: '在一天内完成一个完整章节' },
  { key: 'a-collector', title: '知识收藏家', description: '创建 5 门课程' },
];

// ── Shared lookups ──────────────────────────────────────

export async function findUserByEmail(email: string): Promise<User | null> {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0] ?? null;
}

/** All lessons (ordered) for a course. */
async function getCourseLessons(courseId: string) {
  const chapterRows = await db
    .select({ id: chapters.id, order: chapters.order, title: chapters.title })
    .from(chapters)
    .where(eq(chapters.courseId, courseId))
    .orderBy(asc(chapters.order));

  const result: { chapterId: string; chapterTitle: string; lessons: { id: string }[] }[] = [];
  for (const ch of chapterRows) {
    const lessonRows = await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(eq(lessons.chapterId, ch.id))
      .orderBy(asc(lessons.order));
    result.push({ chapterId: ch.id, chapterTitle: ch.title, lessons: lessonRows });
  }
  return result;
}

/** Set of lesson IDs the user has completed (for a given course). */
export async function getCompletionSet(userId: string, courseId: string): Promise<Set<string>> {
  const allLessons = await getCourseLessons(courseId);
  const ids = allLessons.flatMap((c) => c.lessons.map((l) => l.id));
  if (ids.length === 0) return new Set();

  const rows = await db
    .select({ lessonId: lessonCompletions.lessonId })
    .from(lessonCompletions)
    .where(and(eq(lessonCompletions.userId, userId), inArray(lessonCompletions.lessonId, ids)));
  return new Set(rows.map((r) => r.lessonId));
}

/** Progress for a course: completed/total lessons + percent (0-100). */
export async function getCourseProgress(
  userId: string,
  courseId: string,
): Promise<{ completedLessons: number; totalLessons: number; percent: number }> {
  const allLessons = await getCourseLessons(courseId);
  const totalLessons = allLessons.reduce((sum, c) => sum + c.lessons.length, 0);
  if (totalLessons === 0) return { completedLessons: 0, totalLessons: 0, percent: 0 };
  const completed = (await getCompletionSet(userId, courseId)).size;
  return { completedLessons: completed, totalLessons, percent: Math.round((completed / totalLessons) * 100) };
}

// ── User stats ──────────────────────────────────────────

export interface UserStats {
  studyDays: number;
  streakDays: number;
  completedLessons: number;
  totalLessons: number;
  completedCourses: number;
  createdCourses: number;
}

/**
 * Compute learning stats for a user from the completion tables.
 * studyDays = distinct days with at least one lesson completed.
 * streakDays = consecutive days ending today (or yesterday) with study activity.
 */
export async function computeUserStats(userId: string): Promise<UserStats> {
  const completionRows = await db
    .select({ lessonId: lessonCompletions.lessonId, createdAt: lessonCompletions.createdAt })
    .from(lessonCompletions)
    .where(eq(lessonCompletions.userId, userId));
  const completedIds = new Set(completionRows.map((r) => r.lessonId));
  const studyDates = new Set(completionRows.map((r) => formatDateKey(r.createdAt)));

  // Streak: count back from today; if today is empty but yesterday has activity, start at yesterday.
  let streakDays = 0;
  let cursor = studyDates.has(dateKey()) ? 0 : studyDates.has(dateKey(-1)) ? -1 : null;
  while (cursor !== null) {
    if (!studyDates.has(dateKey(cursor))) break;
    streakDays += 1;
    cursor -= 1;
  }

  // All lessons belonging to the user's courses (status ready).
  const userCourses = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.userId, userId));
  let totalLessons = 0;
  let completedCourses = 0;
  for (const course of userCourses) {
    const chapterRows = await db
      .select({ id: chapters.id })
      .from(chapters)
      .where(eq(chapters.courseId, course.id));
    const courseLessonIds: string[] = [];
    for (const ch of chapterRows) {
      const lessonRows = await db
        .select({ id: lessons.id })
        .from(lessons)
        .where(eq(lessons.chapterId, ch.id));
      courseLessonIds.push(...lessonRows.map((l) => l.id));
    }
    totalLessons += courseLessonIds.length;
    // A course counts as completed only when EVERY lesson of the course is done.
    if (courseLessonIds.length > 0 && courseLessonIds.every((id) => completedIds.has(id))) {
      completedCourses += 1;
    }
  }

  return {
    studyDays: studyDates.size,
    streakDays,
    completedLessons: completedIds.size,
    totalLessons,
    completedCourses,
    createdCourses: userCourses.length,
  };
}

// ── Current mission ─────────────────────────────────────

/**
 * Most recent course that is ready and not 100% complete.
 * chapterTitle = first chapter containing an incomplete lesson (fallback: last chapter).
 * rewardXP = chapter completion bonus.
 */
export async function findCurrentMission(userId: string): Promise<Mission | null> {
  // Newest first — return the first ready course that isn't 100% complete.
  const readyCourses = await db
    .select()
    .from(courses)
    .where(eq(courses.userId, userId))
    .orderBy(asc(courses.createdAt));

  for (const course of [...readyCourses].reverse()) {
    const chaptersWithLessons = await getCourseLessons(course.id);
    if (chaptersWithLessons.length === 0) continue;
    const allLessonIds = chaptersWithLessons.flatMap((c) => c.lessons.map((l) => l.id));
    const done = await getCompletionSet(userId, course.id);
    if (done.size >= allLessonIds.length) continue; // fully complete → not a current mission

    let chapterTitle = chaptersWithLessons[chaptersWithLessons.length - 1].chapterTitle;
    for (const ch of chaptersWithLessons) {
      if (ch.lessons.some((l) => !done.has(l.id))) {
        chapterTitle = ch.chapterTitle;
        break;
      }
    }

    const total = chaptersWithLessons.reduce((sum, c) => sum + c.lessons.length, 0);

    return {
      id: `mission-${course.id}`,
      courseId: course.id,
      title: course.title,
      chapterTitle,
      progress: Math.round((done.size / total) * 100),
      rewardXP: REWARDS.chapterXp,
    };
  }

  return null;
}

// ── Bounty evaluation ───────────────────────────────────

/**
 * Whether a bounty's condition is met for the user on the given day ('YYYY-MM-DD').
 * Conditions are evaluated against DB state at call time (no background tracking).
 */
export async function evaluateBounty(userId: string, key: string, day: string): Promise<boolean> {
  const completions = await db
    .select({ lessonId: lessonCompletions.lessonId, createdAt: lessonCompletions.createdAt })
    .from(lessonCompletions)
    .where(eq(lessonCompletions.userId, userId));
  const todayCompletions = completions.filter((c) => isToday(c.createdAt, day));

  switch (key) {
    case 'b-lessons':
      return todayCompletions.length >= 2;

    case 'b-chapter': {
      if (todayCompletions.length === 0) return false;
      const lessonRows = await db
        .select({ id: lessons.id, chapterId: lessons.chapterId })
        .from(lessons)
        .where(inArray(lessons.id, todayCompletions.map((c) => c.lessonId)));
      const chapterIds = new Set(lessonRows.map((l) => l.chapterId));
      return chapterIds.size >= 1;
    }

    case 'b-create': {
      const rows = await db
        .select({ createdAt: courses.createdAt })
        .from(courses)
        .where(eq(courses.userId, userId));
      return rows.some((r) => isToday(r.createdAt, day));
    }

    case 'b-complete': {
      const userCourses = await db
        .select({ id: courses.id })
        .from(courses)
        .where(eq(courses.userId, userId));
      for (const course of userCourses) {
        const allLessons = await getCourseLessons(course.id);
        const allIds = allLessons.flatMap((c) => c.lessons.map((l) => l.id));
        if (allIds.length === 0) continue;
        const done = completions.filter((c) => allIds.includes(c.lessonId));
        if (done.length !== allIds.length) continue; // not fully complete
        // Fully complete — did the FINAL completion happen today?
        const latest = done.reduce((max, c) => (c.createdAt > max ? c.createdAt : max), done[0].createdAt);
        if (isToday(latest, day)) return true;
      }
      return false;
    }

    default:
      return false;
  }
}

// ── Achievement evaluation ──────────────────────────────

/**
 * Achievement definitions the user qualifies for but has NOT yet unlocked.
 * Returns defs (not keys) so callers can render title/description.
 */
export async function evaluateAchievements(userId: string): Promise<AchievementDef[]> {
  const unlockedRows = await db
    .select({ key: userAchievements.achievementKey })
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));
  const unlocked = new Set(unlockedRows.map((r) => r.key));

  const result: AchievementDef[] = [];
  const check = (key: string, met: boolean) => {
    if (met && !unlocked.has(key)) {
      const def = ACHIEVEMENT_DEFS.find((d) => d.key === key);
      if (def) result.push(def);
    }
  };

  const stats = await computeUserStats(userId);
  check('a-streak-7', stats.streakDays >= 7);
  check('a-first-course', stats.completedCourses >= 1);
  check('a-collector', stats.createdCourses >= 5);

  // a-owl: any lesson completed between 22:00–23:59 or 00:00–03:59.
  const owlRows = await db
    .select({ lessonId: lessonCompletions.lessonId, createdAt: lessonCompletions.createdAt })
    .from(lessonCompletions)
    .where(eq(lessonCompletions.userId, userId));
  check(
    'a-owl',
    owlRows.some((r) => {
      const h = r.createdAt.getHours();
      return h >= 22 || h < 4;
    }),
  );

  // a-speedrun: all lessons of a single chapter completed today.
  let speedrun = false;
  const today = dateKey();
  const userCourses = await db.select({ id: courses.id }).from(courses).where(eq(courses.userId, userId));
  for (const course of userCourses) {
    if (speedrun) break;
    const allLessons = await getCourseLessons(course.id);
    for (const ch of allLessons) {
      if (ch.lessons.length === 0) continue;
      const chIds = ch.lessons.map((l) => l.id);
      const done = owlRows.filter((c) => chIds.includes(c.lessonId));
      if (done.length === chIds.length && done.length > 0 && done.every((c) => isToday(c.createdAt, today))) {
        speedrun = true;
        break;
      }
    }
  }
  check('a-speedrun', speedrun);

  return result;
}

// ── Public game-state builders ──────────────────────────

/** Player payload for game-state responses. */
export function buildPlayerPayload(user: User) {
  const { level, currentXp } = splitLevel(user.xp);
  return {
    level,
    levelTitle: getLevelTitle(level),
    currentXP: currentXp,
    xpToNextLevel: level >= MAX_LEVEL ? 0 : levelThreshold(level),
    totalXP: user.xp,
    coins: user.coins,
  };
}

/** Today's bounties with claimed flags for the user. */
export async function buildBountiesPayload(userId: string): Promise<(BountyDef & { completed: boolean })[]> {
  const today = dateKey();
  const claimed = await db
    .select({ key: bountyCompletions.bountyKey })
    .from(bountyCompletions)
    .where(and(eq(bountyCompletions.userId, userId), eq(bountyCompletions.day, today)));
  const claimedSet = new Set(claimed.map((r) => r.key));
  return BOUNTY_DEFS.map((def) => ({ ...def, completed: claimedSet.has(def.key) }));
}
