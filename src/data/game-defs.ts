import type { ImageSourcePropType } from 'react-native';

import type { RealmDifficulty } from '@/types/game';

/**
 * Client-side game definitions: achievement icon assets and realm cards.
 *
 * Achievement definitions live server-side in src/lib/game.ts (conditions
 * are evaluated there); this file only maps their keys to image assets.
 */

/** Achievement key → badge image asset (mirrors src/lib/game.ts ACHIEVEMENT_DEFS keys). */
export const ACHIEVEMENT_ICONS: Record<string, ImageSourcePropType> = {
  'a-streak-7': require('@/assets/images/star.png'),
  'a-owl': require('@/assets/images/rocket.png'),
  'a-first-course': require('@/assets/images/trophy.png'),
  'a-speedrun': require('@/assets/images/medal.png'),
  'a-collector': require('@/assets/images/shield.png'),
};

/** Fallback badge for achievements without a mapped icon. */
export const ACHIEVEMENT_FALLBACK_ICON: ImageSourcePropType =
  require('@/assets/images/medal.png');

export interface RealmDef {
  id: string;
  title: string;
  subtitle: string;
  /** Player level required to unlock (1 = always available). */
  minLevel: number;
  isHot: boolean;
  difficulty: RealmDifficulty;
  imageAsset: ImageSourcePropType;
}

/**
 * Curated realm discovery cards. `locked` is computed at runtime from the
 * player's level vs. `minLevel` — beginner 1 / intermediate 3 / advanced 6.
 */
export const REALM_DEFS: RealmDef[] = [
  {
    id: 'realm-1',
    title: 'React Native 领域',
    subtitle: '移动端开发入门',
    minLevel: 1,
    isHot: true,
    difficulty: 'beginner',
    imageAsset: require('@/assets/images/outpost.png'),
  },
  {
    id: 'realm-2',
    title: 'TypeScript 圣殿',
    subtitle: '类型系统进阶',
    minLevel: 3,
    isHot: false,
    difficulty: 'intermediate',
    imageAsset: require('@/assets/images/fort.png'),
  },
  {
    id: 'realm-3',
    title: '算法迷宫',
    subtitle: '数据结构与算法',
    minLevel: 6,
    isHot: false,
    difficulty: 'advanced',
    imageAsset: require('@/assets/images/fortress.png'),
  },
  {
    id: 'realm-4',
    title: 'Python 领地',
    subtitle: '数据分析与 AI',
    minLevel: 1,
    isHot: true,
    difficulty: 'beginner',
    imageAsset: require('@/assets/images/citadel.png'),
  },
  {
    id: 'realm-5',
    title: '系统设计堡垒',
    subtitle: '架构与分布式',
    minLevel: 6,
    isHot: false,
    difficulty: 'advanced',
    imageAsset: require('@/assets/images/fortress.png'),
  },
  {
    id: 'realm-6',
    title: '前端魔法森林',
    subtitle: 'HTML/CSS/JS 全掌握',
    minLevel: 1,
    isHot: false,
    difficulty: 'beginner',
    imageAsset: require('@/assets/images/outpost.png'),
  },
];

/** Resolve a realm's lock state for the given player level. */
export function isRealmLocked(realm: RealmDef, playerLevel: number): boolean {
  return playerLevel < realm.minLevel;
}
