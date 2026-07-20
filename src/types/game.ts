/**
 * Game data types for the gamified learning experience.
 * These types power the player card, missions, bounties, realms, and achievements.
 */

import type { ImageSourcePropType } from 'react-native';

// ── Player ──────────────────────────────────────────────

export interface PlayerStats {
  level: number;
  levelTitle: string;
  currentXP: number;
  xpToNextLevel: number;
  totalXP: number;
}

// ── Current Mission (继续学习的课程) ────────────────────

export interface Mission {
  id: string;
  courseId: string;
  title: string;
  chapterTitle: string;
  progress: number; // 0–100
  rewardXP: number;
}

// ── Daily Bounty (每日赏金任务) ─────────────────────────

export type RewardType = 'coins' | 'gems' | 'xp';

export interface BountyReward {
  type: RewardType;
  amount: number;
}

export interface Bounty {
  id: string;
  title: string;
  description: string;
  reward: BountyReward;
  completed: boolean;
}

// ── Realm / Unlockable Course (可解锁领域) ──────────────

export type RealmDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Realm {
  id: string;
  title: string;
  subtitle: string;
  locked: boolean;
  isHot: boolean;
  difficulty: RealmDifficulty;
  imageAsset: ImageSourcePropType;
}

// ── Achievement (荣誉勋章) ──────────────────────────────

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconAsset: ImageSourcePropType;
  isUnlocked: boolean;
  unlockedAt?: string; // ISO date string
}

// ── Aggregated Game State ───────────────────────────────

export interface GameState {
  player: PlayerStats;
  currentMission: Mission | null;
  dailyBounties: Bounty[];
  realms: Realm[];
  achievements: Achievement[];
}

// ── Level titles (universal learning/adventure theme) ───

export const LEVEL_TITLES: Record<number, string> = {
  1: '知识学徒',
  2: '探索新兵',
  3: '学问猎手',
  4: '智慧骑士',
  5: '博学巫师',
  6: '睿智贤者',
  7: '学问大师',
  8: '知识领主',
  9: '智慧贤王',
  10: '全知传说',
};

/** Resolve a level number to its title, clamping to the defined range. */
export function getLevelTitle(level: number): string {
  if (level < 1) return LEVEL_TITLES[1];
  if (level > 10) return LEVEL_TITLES[10];
  return LEVEL_TITLES[level] ?? `第${level}级`;
}
