/**
 * Mock game data — signed-out preview ONLY.
 *
 * Signed-in users are served real data from the API via useGameState().
 * Realm defs moved to src/data/game-defs.ts (level-gated, shared by all users).
 */
import type { Achievement, Bounty, GameState, Mission, PlayerStats } from '@/types/game';

// ── Player ──────────────────────────────────────────────

const player: PlayerStats = {
  level: 5,
  levelTitle: '博学巫师',
  currentXP: 720,
  xpToNextLevel: 1000,
  totalXP: 4720,
};

// ── Current Mission ─────────────────────────────────────

const currentMission: Mission = {
  id: 'mission-1',
  courseId: 'course-rn-basics',
  title: 'React Native 入门',
  chapterTitle: '第三章：组件与样式',
  progress: 60,
  rewardXP: 100,
};

// ── Daily Bounties ──────────────────────────────────────

const dailyBounties: Bounty[] = [
  {
    id: 'bounty-1',
    title: '学习 15 分钟',
    description: '今天完成任意课程学习满 15 分钟',
    reward: { type: 'coins', amount: 50 },
    completed: false,
  },
  {
    id: 'bounty-2',
    title: '一次测验满分',
    description: '在任意章节测验中获得满分',
    reward: { type: 'gems', amount: 5 },
    completed: false,
  },
  {
    id: 'bounty-3',
    title: '开启新章节',
    description: '解锁并开始学习一个新章节',
    reward: { type: 'xp', amount: 80 },
    completed: true,
  },
];

// ── Achievements ────────────────────────────────────────

const achievements: Achievement[] = [
  {
    id: 'ach-1',
    title: '连续学习 7 天',
    description: '连续一周每天坚持学习',
    iconAsset: require('@/assets/images/star.png'),
    isUnlocked: true,
    unlockedAt: '2026-07-12',
  },
  {
    id: 'ach-2',
    title: '夜猫达人',
    description: '在晚上 10 点后完成一门课程',
    iconAsset: require('@/assets/images/rocket.png'),
    isUnlocked: true,
    unlockedAt: '2026-07-15',
  },
  {
    id: 'ach-3',
    title: '首次测验满分',
    description: '第一次参加测验即获得满分',
    iconAsset: require('@/assets/images/trophy.png'),
    isUnlocked: true,
    unlockedAt: '2026-07-08',
  },
  {
    id: 'ach-4',
    title: '速通挑战',
    description: '在一天内完成一个完整章节',
    iconAsset: require('@/assets/images/medal.png'),
    isUnlocked: false,
  },
  {
    id: 'ach-5',
    title: '知识收藏家',
    description: '解锁全部基础领域课程',
    iconAsset: require('@/assets/images/shield.png'),
    isUnlocked: false,
  },
];

// ── Aggregated State (signed-out preview only) ──────────

export const MOCK_GAME_STATE: GameState = {
  player,
  currentMission,
  dailyBounties,
  achievements,
};
