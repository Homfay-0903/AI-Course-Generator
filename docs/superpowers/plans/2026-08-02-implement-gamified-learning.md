# 游戏化学习全链路落地 · 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前所有 mock / 占位功能替换为真实实现：课程学习（课程详情 + 课时阅读 + Markdown 渲染）、学习进度追踪、每日赏金领取、成就解锁、XP/金币/等级成长、学习统计真实化、领域与当前任务卡片接入真实数据。未登录用户保留 mock 预览（现状不变），登录用户全链路走真实数据。

**Architecture:** 数据库新增 3 张表（`lesson_completions` / `bounty_completions` / `user_achievements`）；服务端新增游戏核心 lib（奖励公式、赏金/成就定义与条件评估）+ 3 个新 API（`game-state`、lesson complete、bounty claim），并扩展课程详情 API 返回进度；客户端新增 2 个页面（`course/[id]`、`lesson/[id]`）+ `useGameState` hook + 主题化 Markdown 渲染组件，三个 tab 页面全部改为消费真实数据。奖励发放只发生在服务端 API，客户端仅展示与触发。

**Tech Stack:** 现有 Expo SDK ~57.0.7 栈不变，新增唯一依赖 `react-native-markdown-display`（纯 JS，无原生模块，RN 0.86 / RN Web 均兼容）。

**关联文档:** CLAUDE.md（架构约束）、`docs/superpowers/specs/2026-07-17-theme-welcome-design.md`（主题 token 语义）

## Global Constraints

- **服务端硬规则（沿用 CLAUDE.md）：** `src/db/`、`src/lib/game.ts`、`src/lib/glm.ts` 只能被 `src/app/api/+api.ts` 引用；`GLM_API_KEY`/`DATABASE_URL` 不得有 `EXPO_PUBLIC_` 前缀。
- **客户端硬规则：** 组件代码禁止硬编码 hex，一律走 `useTheme()` token（仅 theme.ts / app.json / animated-icon.tsx 例外）。
- **奖励防重：** 所有奖励发放必须依托唯一约束（`user_id + lesson_id` 等），重复完成/重复领取不重复发奖。
- **文案例外声明：** CLAUDE.md 称文案已定稿，但本计划需要改写三处占位文案：① 两处"即将上线"Alert 被真实跳转取代；② 每日赏金条件全部重写（原"学习 15 分钟""一次测验满分"无对应系统可判定——无计时与测验功能，测验明确不在本计划范围内）；③ 成就"首次测验满分"替换为"初次完成课程"。其余既有文案逐字保留。
- **奖励币种简化：** `users` 表无 gems 字段，赏金/成就奖励只用 coins 与 xp 两种（`RewardType` 类型保留 gems 不动，`daily-bounties.tsx` 的图标映射保留，仅定义不再产出 gems）。
- **迁移纪律：** 只用 `npm run db:generate` + `npm run db:migrate`，不用 `db:push`。
- **每任务收尾验证：** `npx tsc --noEmit`（期望无输出）+ `npm run lint`（期望无 error）。新增/修改路由后先 `npx expo start --web` 重生成 `.expo/types` 再跑 tsc（typed routes 会过期报错）。
- **验证策略：** 项目无测试基建（CLAUDE.md），以 tsc + lint + 每任务手动验证代替单测，不引入 jest。

---

### Task 1: 数据库 Schema 扩展与迁移

**Files:**
- Modify: `src/db/schema.ts`
- Generate: `src/db/migrations/0004_*.sql`（`npm run db:generate` + `npm run db:migrate`）

**Interfaces:**
- Produces: 3 张新表 + 导出类型 `LessonCompletion / NewLessonCompletion / BountyCompletion / NewBountyCompletion / UserAchievement / NewUserAchievement`。`users` 表不加列（学习天数/连续打卡等全部由 `lesson_completions` 推导，避免冗余状态）。

- [ ] **Step 1: 建工作分支**

```bash
git checkout -b feat/gamified-learning
```

- [ ] **Step 2: `src/db/schema.ts` 末尾新增三张表**（沿用现有 `varchar(36) UUID + timestamp` 风格，与 `users` 表注释风格一致）

```ts
/** 课时完成记录 — 每完成一节课时插一行，唯一约束防重复发奖。 */
export const lessonCompletions = pgTable('lesson_completions', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  lessonId: varchar('lesson_id', { length: 36 }).notNull().references(() => lessons.id),
  xpEarned: integer('xp_earned').notNull().default(0),
  coinsEarned: integer('coins_earned').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [t.uniqueIndex().on(t.userId, t.lessonId)]);

/** 每日赏金领取记录 — day 为 'YYYY-MM-DD'，同一天同一赏金只能领一次。 */
export const bountyCompletions = pgTable('bounty_completions', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  bountyKey: varchar('bounty_key', { length: 50 }).notNull(),
  day: varchar('day', { length: 10 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [t.uniqueIndex().on(t.userId, t.bountyKey, t.day)]);

/** 用户成就解锁记录 — 同用户同成就只能解锁一次。 */
export const userAchievements = pgTable('user_achievements', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  achievementKey: varchar('achievement_key', { length: 50 }).notNull(),
  unlockedAt: timestamp('unlocked_at').defaultNow().notNull(),
}, (t) => [t.uniqueIndex().on(t.userId, t.achievementKey)]);
```

- [ ] **Step 3: 生成并应用迁移**

```bash
npm run db:generate   # 生成 0004_*.sql，人工核对 SQL 含三个唯一索引
npm run db:migrate    # 应用到 NeonDB
```

- [ ] **Step 4: 验证** — `npx tsc --noEmit`、`npm run lint`，并在 Step 5 手动验证：`npm run db:studio` 中确认三张新表存在。

---

### Task 2: 服务端游戏核心 lib（`src/lib/game.ts`）

**Files:**
- Create: `src/lib/game.ts`

**Interfaces:**
- Produces: 奖励常量、`BOUNTY_DEFS`（4 条）、`ACHIEVEMENT_DEFS`（5 条）、纯函数 `calculateLevel`、`evaluateBounty`、`evaluateAchievements`、`computeUserStats`、`findCurrentMission`。全部为服务端专用（引用 `@/db` 与 `@/db/schema`）。

- [ ] **Step 1: 常量与公式**

```ts
export const REWARDS = {
  lessonXp: 50, lessonCoins: 10,      // 每节首次完成
  chapterXp: 100, chapterCoins: 30,   // 一章全部课时完成
  courseXp: 200, courseCoins: 100,    // 一门课全部章节完成
};
export function levelThreshold(level: number) { return level * 200; } // 与 use-game-stats 旧公式一致
export function calculateLevel(xp: number, level: number): { level: number; xp: number } {
  // while xp >= levelThreshold(level) { xp -= levelThreshold(level); level++ }
  // 返回升级后 level 与剩余 xp（上限封顶 10 级，沿用 LEVEL_TITLES 范围）
}
```

- [ ] **Step 2: 赏金定义**（4 条，条件全部可服务端判定；写死在 lib 中，不落库）

```ts
export interface BountyDef { key: string; title: string; description: string; reward: { type: 'coins' | 'xp'; amount: number }; }
export const BOUNTY_DEFS: BountyDef[] = [
  { key: 'b-lessons',  title: '完成 2 节课', description: '今天完成任意 2 个课时学习', reward: { type: 'coins', amount: 50 } },
  { key: 'b-chapter',  title: '开启新章节', description: '今天开始学习一个新章节',   reward: { type: 'coins', amount: 30 } },
  { key: 'b-create',   title: '创建新课程', description: '今天创建一门 AI 课程',     reward: { type: 'xp', amount: 80 } },
  { key: 'b-complete', title: '完成一门课程', description: '今天学完一门课程的全部课时', reward: { type: 'coins', amount: 100 } },
];
```

- [ ] **Step 3: 成就定义**（5 条，沿用 mock 的图片资源语义：star/rocket/trophy/medal/shield；`key` 客户端用 `ACHIEVEMENT_ICONS` 映射资源，服务端只存 key）

```ts
export const ACHIEVEMENT_DEFS = [
  { key: 'a-streak-7',  title: '连续学习 7 天',  description: '连续一周每天坚持学习',  condition: 'streak >= 7' },
  { key: 'a-owl',       title: '夜猫达人',        description: '在晚上 10 点后完成一节课程', condition: 'lesson completed in 22:00–04:00' },
  { key: 'a-first-course', title: '初次完成课程', description: '完成第一门课程',       condition: 'completedCourses >= 1' },
  { key: 'a-speedrun',  title: '速通挑战',        description: '在一天内完成一个完整章节', condition: 'all lessons of one chapter completed today' },
  { key: 'a-collector', title: '知识收藏家',      description: '创建 5 门课程',        condition: 'createdCourses >= 5' },
];
```

- [ ] **Step 4: 统计与条件评估纯函数**（全部 `userId` 入参，`db` 查询，返回布尔/数值）

- `computeUserStats(userId) → { studyDays, streakDays, completedLessons, totalLessons, completedCourses, createdCourses, lastStudyDate }`
  - `studyDays`：`lesson_completions.createdAt` 去重日期数；`streakDays`：从今天（或昨天）往回数连续有学习记录的日期数；`completedLessons` 计数；`completedCourses`：课程下所有课时都在 `lesson_completions` 中（status 为 ready）；`createdCourses`：`courses` 计数。
- `evaluateBounty(userId, key, today)`：b-lessons 查今日完成数 ≥ 2；b-chapter 查今日完成的课时所属章节数 ≥ 1；b-create 查 `courses.createdAt` 为今天的行 ≥ 1；b-complete 查存在一门课程今日完成了最后一节课（该课程全部课时完成 且 完成记录的最大日期为今天）。
- `evaluateAchievements(userId)`：遍历 5 条定义，返回尚未解锁且条件满足的 key 列表（条件判定复用 `computeUserStats` 与逐条查询，如 a-owl 查 `EXTRACT(HOUR FROM lesson_completions.created_at)` ∈ {0,1,2,3,22,23}；a-speedrun 查同章节全部课时完成且都在今天）。
- `findCurrentMission(userId)`：在 ready 且未 100% 完成的课程中取最近创建的一条 → `Mission` 形状（`{ id, courseId, title, chapterTitle, progress, rewardXP }`；`chapterTitle` 为第一个未完成课时的所属章节标题；`progress = 已完成课时/总课时 × 100`；`rewardXP = REWARDS.chapterXp`）；全部学完则返回 `null`。

- [ ] **Step 5: 验证** — `npx tsc --noEmit`、`npm run lint`。

---

### Task 3: API 路由（3 新增 + 1 扩展）

**Files:**
- Create: `src/app/api/game-state+api.ts`
- Create: `src/app/api/lessons/[id]+api.ts`
- Create: `src/app/api/bounties+api.ts`
- Modify: `src/app/api/courses/[id]+api.ts`

**Interfaces:**
- Produces: 以下端点的 Request/Response 形状（所有权校验一律沿用 generate 的 email join 模式）。

- [ ] **Step 1: `GET /api/game-state?email=`** — 一次聚合首页/统计页所需全部数据

```ts
// 200:
{
  player: { level, levelTitle, currentXP, xpToNextLevel, totalXP, coins },
  currentMission: Mission | null,        // findCurrentMission
  bounties: [{ ...bountyDef, completed: boolean }],   // completed = 今天已领取
  achievements: [{ key, title, description, isUnlocked, unlockedAt }],
  stats: { studyDays, streakDays, completedLessons, totalLessons, completedCourses, createdCourses },
}
// 404: 邮箱无对应用户
```

- [ ] **Step 2: `POST /api/lessons/[id]`（完成课时）** — body `{ userEmail }`

流程（一次事务内完成，失败整体回滚）：
1. `lesson → chapter → course → users` 联查校验归属；`course.status !== 'ready'` 返回 409。
2. 查 `lesson_completions` 已有记录 → 幂等返回 `{ alreadyCompleted: true, ... }`（不发奖）。
3. 插入完成记录（记录 `xpEarned: 50, coinsEarned: 10`）。
4. 计算章/课完成奖励：该章全部课时已完成 → 追加 `+100 XP +30 coins`；该课程全部课时已完成 → 追加 `+200 XP +100 coins`。
5. `users` 行更新：`xp += 总奖励，coins += 总奖励`，`updatedAt = now`；用 `calculateLevel` 处理连升。
6. `evaluateAchievements` → 新解锁的逐条插入 `user_achievements`。
7. 返回 `{ lessonId, xpEarned, coinsEarned, level, levelTitle, leveledUp, unlockedAchievements: [{key, title, description}] }`。

- [ ] **Step 3: `POST /api/bounties`（领取赏金）** — body `{ userEmail, bountyKey }`

1. 校验 key 在 `BOUNTY_DEFS` 中；今天已领取（唯一约束命中）→ 409。
2. `evaluateBounty` 未达成 → 400 `{ error: '条件尚未达成' }`。
3. 插入 `bounty_completions` + 更新 `users`（xp 或 coins），返回 `{ bountyKey, reward, balance: { xp, coins } }`。

- [ ] **Step 4: 扩展 `GET /api/courses/[id]`** — 新增 `?email=` 参数（缺省时行为不变，向后兼容）

返回体中每节课附加 `completed: boolean`，并新增顶层字段：

```ts
{ course, chapters: [{ ...chapter, lessons: [{ ...lesson, completed }] }],
  progress: { completedLessons, totalLessons, percent } }
```

- [ ] **Step 5: `GET /api/lessons/[id]?email=`（课时内容 + 邻接导航）** — 用于课时阅读页

```ts
{ courseId, courseTitle, chapterTitle, lesson: { id, title, content },
  completed, prevLessonId: string | null, nextLessonId: string | null }
```

- [ ] **Step 6: 手动验证** — `npx expo start --web` 起服务后，用登录邮箱 curl 各端点（建课→generate→等 ready→complete 课时→查 game-state 数值变化）；核对 404/409/400 分支。完成后 `npx tsc --noEmit`、`npm run lint`。

---

### Task 4: 客户端数据层

**Files:**
- Create: `src/data/game-defs.ts`
- Create: `src/hooks/use-game-state.ts`
- Create: `src/lib/create-course.ts`（客户端建课共享流程）
- Delete: `src/hooks/use-game-stats.ts`
- Modify: `src/data/game-data.ts`

**Interfaces:**
- Produces: `useGameState()` 返回 `{ state, loading, error, refresh }`；`ACHIEVEMENT_ICONS: Record<string, ImageSourcePropType>`；`REALM_DEFS`（从 mock 移出，新增 `minLevel` 解锁门槛）。

- [ ] **Step 1: `src/data/game-defs.ts`**
  - `ACHIEVEMENT_ICONS`：key → 资源（`a-streak-7→star.png`、`a-owl→rocket.png`、`a-first-course→trophy.png`、`a-speedrun→medal.png`、`a-collector→shield.png`）。
  - `REALM_DEFS`：把 `game-data.ts` 的 6 个领域搬过来，每个加 `minLevel`（beginner 领域 1、intermediate 领域 3、advanced 领域 6），`locked` 字段删除（改为运行时按 `minLevel` 与玩家等级计算）。

- [ ] **Step 2: `src/hooks/use-game-state.ts`** — 仿照 `use-game-stats` 的 email 去重/取消模式：签名后 `GET /api/game-state?email=`；提供 `refresh()`（完成课时/领取赏金后调用）；未登录返回 `state: null, loading: false`。

- [ ] **Step 3: `src/lib/create-course.ts`** — 把 `missions.tsx` 的 `handleCreateCourse + pollCourseStatus + setCourseGenerating/Failed/Updated` 提取为共享函数 `createCourseAndGenerate(userEmail, data, onUpdate)`（返回 `course`，内部做 POST → generate → 轮询，`onUpdate` 回调驱动列表状态）；首页与任务页共用。

- [ ] **Step 4: 替换 `useGameStats`** — `(tabs)/index.tsx` 改用 `useGameState`；删除 `src/hooks/use-game-stats.ts`。

- [ ] **Step 5: `src/data/game-data.ts`** — `MOCK_GAME_STATE` 只保留未登录预览用途；`realms` 移除（迁到 game-defs）；在文件头注释"仅未登录预览"。

- [ ] **Step 6: 验证** — `npx tsc --noEmit`、`npm run lint`。

---

### Task 5: Markdown 渲染组件

**Files:**
- Modify: `package.json`（新增依赖）
- Create: `src/components/markdown-content.tsx`

- [ ] **Step 1: 安装依赖**

```bash
npm install react-native-markdown-display
```

- [ ] **Step 2: `src/components/markdown-content.tsx`** — `react-native-markdown-display` 的主题化包装：
  - `Markdown` 的 `style` 用 `useTheme()` token 生成（body/text 用 `theme.text`，heading 加粗、`code` 块用 `backgroundSelected` 底 + mono 字体、`link` 用 `theme.primary`、`bullet_list`/`ordered_list` 间距对齐 `Spacing`）。
  - 导出 `MarkdownContent({ children })`，供课时阅读页使用。GLM 输出的标题/列表/代码块/加粗全部覆盖。
  - **降级预案：** 若 `react-native-markdown-display` 在 RN 0.86 渲染异常，改用 `markdown-it` 解析 + 自定义 `ThemedText/ThemedView` 块渲染（只支持 GLM 实际产出的标题/段落/列表/代码块/加粗子集）。

- [ ] **Step 3: 验证** — `npx tsc --noEmit`、`npm run lint`；临时在 `lesson` 页面挂真实生成内容确认渲染（随 Task 6 一并手动验证）。

---

### Task 6: 课程详情页与课时阅读页

**Files:**
- Create: `src/app/course/[id].tsx`
- Create: `src/app/lesson/[id].tsx`
- Modify: `src/app/_layout.tsx`

- [ ] **Step 1: 根 Stack 注册两个页面** — `_layout.tsx` 的 `<Stack>` 中 `(tabs)` 之后新增 `<Stack.Screen name="course/[id]" />` 与 `<Stack.Screen name="lesson/[id]" />`（覆盖 tabs，沉浸阅读）。新增路由后先 `npx expo start --web` 重生成 typed routes。

- [ ] **Step 2: `src/app/course/[id].tsx`**
  - 顶部：返回按钮 + 课程图标 emoji + 标题 + 难度徽章 + `CircularProgress` 总进度。
  - 章节列表：每章展开显示课时行（已完成打勾、未完成空心圆）；`completed` 状态来自 `GET /api/courses/[id]?email=`。
  - 课时行 press → `router.push('/lesson/[id]')`；`generating`/`failed` 课程显示对应状态与禁用态。
  - 未登录守卫：`useAuth` 加载完成后未登录 → `router.replace('/(auth)/sign-in')`。

- [ ] **Step 3: `src/app/lesson/[id].tsx`**
  - `GET /api/lessons/[id]?email=` 加载内容；`MarkdownContent` 渲染 `lesson.content`。
  - 底部固定操作区：未完成 → `PrimaryButton "完成本课"`，POST complete 后展示 XP/金币获得 + 等级提升/成就解锁反馈（新解锁成就用 Alert 或内嵌卡片展示，文案格式如 `解锁成就：连续学习 7 天`）；已完成 → 按钮变 `SecondaryButton "已完成"` 禁用态。
  - 完成态下提供 `上一节 / 下一节`（`prevLessonId/nextLessonId`），跨章节自动衔接。
  - 顶部返回课程详情。

- [ ] **Step 4: 手动验证** — 完整走一遍：课程详情 → 课时 → 完成 → 返回刷新进度 → 下一节；`npx tsc --noEmit`、`npm run lint`。

---

### Task 7: 首页真实化（`src/app/(tabs)/index.tsx`）

**Files:**
- Modify: `src/app/(tabs)/index.tsx`
- Modify: `src/components/game/current-mission.tsx`（如需 null 态样式，最小改动）

- [ ] **Step 1: 登录态全部改用 `useGameState`** — `player/coins/currentMission/bounties/achievements` 不再来自 `MOCK_GAME_STATE`（未登录仍走 mock 预览，逻辑分支 `isSignedIn ? real : mock`）。
- [ ] **Step 2: 当前任务** — `currentMission` 为 null（全部学完或暂无课程）时隐藏该区块；非 null 时 `onPress → router.push('/course/[id]')`（去掉 `guardAction(() => {})` 空壳）。
- [ ] **Step 3: 每日赏金** — `onToggle` → `POST /api/bounties` claim；成功 toast/Alert 显示奖励到账并 `refresh()`；已达成未领取的赏金在卡片上可点击领取（服务端判定条件，未达成返回 400 时 Alert `条件尚未达成`）。
- [ ] **Step 4: 探索领域** — `REALM_DEFS` + 玩家等级计算 `locked = level < minLevel`；press 未锁定领域 → 打开 `CourseDialog` 并预填 `description = '${realm.title}：${realm.subtitle}'`（复用 Task 4 的共享建课流程）；锁定领域 press 提示 `达到 X 级解锁`。
- [ ] **Step 5: 荣誉陈列柜** — 真实成就数据 + `ACHIEVEMENT_ICONS` 映射；完成课时/领赏金后 `refresh()` 生效。
- [ ] **Step 6: 验证** — 手动：登录后首页数值与 DB 一致、赏金领取链路、领域门槛；`npx tsc --noEmit`、`npm run lint`。

---

### Task 8: 任务页真实化（`src/app/(tabs)/missions.tsx`）

**Files:**
- Modify: `src/app/(tabs)/missions.tsx`

- [ ] **Step 1: 课程 press** — `status === 'ready'` → `router.push('/course/[id]')`（替换"即将上线"Alert）；`failed` → Alert 询问"重新生成"→ 再次 `POST generate` + 轮询（状态复位 generating）。
- [ ] **Step 2: 每日赏金** — 与首页相同的 claim 流程（替换"即将上线"Alert）；同一组件、同一 claim 逻辑（可从 `useGameState` 派生 `claimBounty` 辅助函数，首页与任务页共用）。
- [ ] **Step 3: quickStats 真实化** — 已创建（已有）、连续学习 → `stats.streakDays`、总经验 → `stats.totalXP`（登录态；未登录保留 mock 显示或 0）。
- [ ] **Step 4: 建课流程切换为共享函数**（Task 4 Step 3），删除本文件的轮询/状态补丁函数。
- [ ] **Step 5: 验证** — `npx tsc --noEmit`、`npm run lint`。

---

### Task 9: 统计页真实化（`src/app/(tabs)/stats.tsx`）

**Files:**
- Modify: `src/app/(tabs)/stats.tsx`

- [ ] **Step 1: 数据接入** — `useGameState().state.stats`：学习天数 `studyDays`、完成课程 `completedCourses`、连续打卡 `streakDays`、总经验 `totalXP`（新增第 4 张卡，沿用现有卡片样式）。
- [ ] **Step 2: 登录守卫** — 未登录显示 `useAuthGuard` 引导（点击"去登录"），不再显示全 0 静态卡。
- [ ] **Step 3: 验证** — 完成一节课后切到统计页数字实时变化；`npx tsc --noEmit`、`npm run lint`。

---

### Task 10: 收尾与回归

**Files:**
- Modify: 视审计结果微调
- Modify: `CLAUDE.md`（架构章节同步新表/新 API/新 hook/新页面）

- [ ] **Step 1: mock 引用审计** — `grep -r MOCK_GAME_STATE src/`，确认仅剩 `(tabs)/index.tsx` 未登录分支与 `game-data.ts` 本体。
- [ ] **Step 2: 占位文案审计** — `grep -r "即将上线" src/` 应为 0 处。
- [ ] **Step 3: 手动回归清单**（`npx expo start --web` + 手机/模拟器）：
  1. 未登录：首页 mock 预览、操作弹登录引导（现状不回归）。
  2. 登录 → 首页真实数据，无 mock 的 720 XP/5 级残留。
  3. 建课 → 生成 → 详情 → 课时 → 完成：XP/金币增加、等级可提升、成就解锁提示出现。
  4. 赏金条件达成 → 领取到账；未达成领取报"条件尚未达成"；同日重复领取 409。
  5. 统计页各数字与学习行为一致；次日连续打卡 +1、断签清零。
  6. 领域：等级不足锁定、点击提示；解锁领域预填建课对话框。
  7. 深链 `course/[id]`、`lesson/[id]` 未登录被重定向到登录页。
- [ ] **Step 4: 文档同步** — CLAUDE.md 更新：新表、`game-state / lessons / bounties` API、`useGameState`、`course/lesson` 页面、`src/lib/game.ts`、`src/data/game-defs.ts`。
- [ ] **Step 5: 最终验证** — 全量 `npx tsc --noEmit` + `npm run lint` 通过；`git status` 确认无遗留文件；提交信息风格与仓库一致（如 `feat: implement gamified learning loop (lessons, bounties, achievements)`）。

---

## Open Questions（实现前如需调整可在此标注）

1. 赏金每天展示全部 4 条，还是随机抽 3 条？（当前计划：全部 4 条，简单可预期）
2. 领域解锁用等级门槛（beginner≥1 / intermediate≥3 / advanced≥6）是否符合产品预期？
3. "完成本课"按钮完成后是否需要跳转动画/X 光特效？（当前计划：Alert + 状态切换，不引入新动画库）
