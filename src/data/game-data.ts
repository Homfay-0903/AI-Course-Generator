import type { Achievement, Bounty, GameState, Mission, PlayerStats, Realm } from '@/types/game';

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

// ── Realms ──────────────────────────────────────────────

const realms: Realm[] = [
  {
    id: 'realm-1',
    title: 'React Native 领域',
    subtitle: '移动端开发入门',
    locked: false,
    isHot: true,
    difficulty: 'beginner',
    imageAsset: require('@/assets/images/outpost.png'),
  },
  {
    id: 'realm-2',
    title: 'TypeScript 圣殿',
    subtitle: '类型系统进阶',
    locked: false,
    isHot: false,
    difficulty: 'intermediate',
    imageAsset: require('@/assets/images/fort.png'),
  },
  {
    id: 'realm-3',
    title: '算法迷宫',
    subtitle: '数据结构与算法',
    locked: true,
    isHot: false,
    difficulty: 'advanced',
    imageAsset: require('@/assets/images/fortress.png'),
  },
  {
    id: 'realm-4',
    title: 'Python 领地',
    subtitle: '数据分析与 AI',
    locked: false,
    isHot: true,
    difficulty: 'beginner',
    imageAsset: require('@/assets/images/citadel.png'),
  },
  {
    id: 'realm-5',
    title: '系统设计堡垒',
    subtitle: '架构与分布式',
    locked: true,
    isHot: false,
    difficulty: 'advanced',
    imageAsset: require('@/assets/images/fortress.png'),
  },
  {
    id: 'realm-6',
    title: '前端魔法森林',
    subtitle: 'HTML/CSS/JS 全掌握',
    locked: false,
    isHot: false,
    difficulty: 'beginner',
    imageAsset: require('@/assets/images/outpost.png'),
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

// ── Aggregated State ────────────────────────────────────

export const MOCK_GAME_STATE: GameState = {
  player,
  currentMission,
  dailyBounties,
  realms,
  achievements,
};
