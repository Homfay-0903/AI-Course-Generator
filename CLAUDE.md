# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## App overview

AI 课程生成器 — a React Native app where users input a prompt and AI generates structured learning courses. Features onboarding, Clerk authentication, a themed UI system, a gamified learning experience (XP, coins, levels, daily bounties, achievements), and a NeonDB-backed API layer with 智谱 GLM AI integration via Expo API Routes.

## Before writing any code

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ — Expo SDK ~57.0.7, React Native 0.86, expo-router ~57.0.7.

## Commands

```bash
npm install                   # install dependencies
npx expo start                # start dev server (scan QR for native, press w for web)
npx tsc --noEmit              # TypeScript type-check (must pass before commits)
npm run lint                  # ESLint via expo lint (must pass before commits)
npx expo install <package>    # add a dependency with SDK-version-compatible resolution
npm run db:generate           # generate Drizzle migration SQL from schema changes
npm run db:migrate            # apply pending migrations to NeonDB
npm run db:push               # push schema directly to DB (skip migration files)
npm run db:studio             # open Drizzle Studio web UI
```

There is no test suite — `tsc --noEmit` + `npm run lint` is the verification gate.

## Architecture

### Route structure

```
src/app/
├── _layout.tsx          → ClerkProvider + ThemeProvider + Stack (root)
├── index.tsx            → Conditional <Redirect>: /onboarding if unseen, else /(tabs)
├── onboarding.tsx       → Three-screen onboarding carousel (first launch only)
├── (auth)/
│   ├── _layout.tsx      → Redirects signed-in users to /(tabs)
│   ├── sign-in.tsx      → 登录 page (email + password, useSignIn)
│   └── sign-up.tsx      → 注册 page (name + email + password, useSignUp + email verification)
├── (tabs)/
│   ├── _layout.tsx      → Re-exports AppTabs (expo-router <Tabs> + custom tabBar)
│   ├── index.tsx        → 营地 tab — player card, current mission, daily bounties, realms, achievements
│   ├── missions.tsx     → 任务 tab — course creation, active courses, daily bounties, quick stats
│   ├── stats.tsx        → 统计数据 tab — real learning stats (study days, streak, XP)
│   └── profile.tsx      → 个人资料 tab — signed-in: user info + logout; signed-out: login prompt
├── course/
│   └── [id].tsx         → 课程详情 — hero card with progress ring + chapter/lesson list (registered in root Stack)
├── lesson/
│   └── [id].tsx         → 课时阅读 — Markdown lesson reader with complete-lesson button, prev/next nav
└── api/
    ├── user+api.ts      → GET /api/user (list / by ?email=) + POST /api/user (create) + PUT (sync from Clerk)
    ├── courses+api.ts   → GET /api/courses (?userId=) + POST /api/courses (create course)
    ├── game-state+api.ts → GET /api/game-state?email= (player + mission + bounties + achievements + stats)
    ├── bounties+api.ts  → POST /api/bounties (claim daily bounty: 200 ok / 400 unmet / 409 already claimed)
    ├── lessons/
    │   └── [id]+api.ts  → GET /api/lessons/:id?email= (lesson + prev/next) + POST (complete lesson, grants rewards, idempotent)
    └── courses/
        ├── [id]+api.ts          → GET /api/courses/:id (course + nested chapters + lessons, ?email= adds completed + progress)
        └── [id]/generate+api.ts → POST /api/courses/:id/generate (trigger GLM AI generation)
```

- **First-launch gating:** `RootLayout` reads AsyncStorage key `hasSeenOnboarding`. While loading, returns `null` (native splash remains). `Stack.Protected guard={!hasSeenOnboarding}` makes onboarding unreachable once seen. `index.tsx` provides the root-level conditional redirect.
- **Auth gating:** `(auth)/_layout.tsx` uses `useAuth().isSignedIn` to redirect authenticated users away from sign-in/sign-up. The Welcome page uses `useAuth().isSignedIn` + `useUser()` to show auth buttons or a personalized greeting.
- **AppTabs** uses `expo-router` `<Tabs>` with a custom `tabBar` component that renders Lucide icons (`lucide-react-native`). Four gamified tabs: 营地 (`Tent`), 任务 (`Swords`), 统计数据 (`BarChart3`), 个人资料 (`CircleUser`). Tab bar uses `useTheme()` for all colors (no hex), `useSafeAreaInsets()` for bottom padding on native.

### Database layer (`src/db/`)

- **`schema.ts`** — Drizzle ORM table definitions. Four tables:

  **`users`** — Clerk-authenticated users with gamification stats:
  - `id`: `varchar(36)` PK, UUID v4 via `$defaultFn(() => crypto.randomUUID())`
  - `email`: `varchar(255)` NOT NULL UNIQUE
  - `name`: `varchar(255)` nullable
  - `avatarUrl`: `text` nullable
  - `xp`: `integer` DEFAULT 0 NOT NULL
  - `coins`: `integer` DEFAULT 0 NOT NULL
  - `level`: `integer` DEFAULT 1 NOT NULL
  - `createdAt` / `updatedAt`: `timestamp` with `defaultNow()`

  **`courses`** — AI-generated learning courses:
  - `id`: `varchar(36)` PK UUID, `userId` FK→users, `title`, `description` (raw user input), `icon` (emoji), `difficulty` ('beginner'|'intermediate'|'advanced'), `status` ('draft'→'generating'→'ready'|'failed'), `createdAt`/`updatedAt`

  **`chapters`** — Belongs to a course, ordered:
  - `id`: `varchar(36)` PK UUID, `courseId` FK→courses, `title`, `description`, `order` (integer), `createdAt`/`updatedAt`

  **`lessons`** — Belongs to a chapter, Markdown content:
  - `id`: `varchar(36)` PK UUID, `chapterId` FK→chapters, `title`, `content` (Markdown text), `order` (integer), `createdAt`/`updatedAt`

  **`lesson_completions`** — lesson completion records (reward grants, one row per user+lesson):
  - `id` PK UUID, `userId` FK→users, `lessonId` FK→lessons, `xpEarned`, `coinsEarned`, `createdAt`. UNIQUE `(userId, lessonId)` — the idempotency guard for rewards.

  **`bounty_completions`** — daily bounty claim records (one row per user+bounty+day):
  - `id` PK UUID, `userId` FK→users, `bountyKey`, `day` ('YYYY-MM-DD'), `createdAt`. UNIQUE `(userId, bountyKey, day)` — each bounty claimable once per day.

  **`user_achievements`** — unlocked achievement records:
  - `id` PK UUID, `userId` FK→users, `achievementKey`, `createdAt`. UNIQUE `(userId, achievementKey)`.

  Exports inferred types: `User`, `NewUser`, `Course`, `NewCourse`, `Chapter`, `NewChapter`, `Lesson`, `NewLesson`, plus the completion/achievement tables above.

- **`index.ts`** — Lazy-initialized Drizzle client singleton using `drizzle-orm/neon-http` + `@neondatabase/serverless`. Uses a Proxy so the connection is only created on first query.
- **Migrations** live in `src/db/migrations/` — generated by `drizzle-kit generate`.

**Hard rule:** Database code must never be imported from client-side components. `src/db/` imports `@neondatabase/serverless` and accesses `process.env.DATABASE_URL`, neither of which exist in the React Native runtime. Only `src/app/api/+api.ts` files may import from `@/db`.

### Expo API Routes (BFF pattern)

API routes are `+api.ts` files in `src/app/api/`. They use standard Web `Request`/`Response` APIs and run server-side. `web.output` is set to `"server"` in `app.json` — the app requires a Node.js host (Vercel, Railway, etc.), not a static CDN.

**Course generation flow:**
1. Client calls `POST /api/courses` → creates course with `status: 'draft'`
2. Client calls `POST /api/courses/:id/generate` → sets status `'generating'`, calls GLM AI, writes chapters+lessons to DB, sets status `'ready'`
3. `GET /api/courses/:id` returns the course with nested `chapters[]` → `lessons[]`
4. On GLM failure, status is set to `'failed'` so the user can retry

**Game loop (client flow):**
1. `GET /api/game-state?email=` — aggregated player/mission/bounties/achievements/stats for the home screen
2. Completing a lesson: `POST /api/lessons/:id` → grants lesson XP/coins + chapter/course bonuses + unlocks achievements (idempotent via unique index)
3. Claiming a bounty: `POST /api/bounties` → grants reward, records claim for today (409 on duplicate)
4. Client state: `useGameState()` hook; course creation/retry flows live in `src/lib/create-course.ts`

### AI Course Generation (`src/lib/glm.ts`)

Wrapper for 智谱 GLM API (`glm-4-flash` model) using the OpenAI-compatible v4 chat/completions endpoint.

- **API Key:** `GLM_API_KEY` env var (server-side only, no `EXPO_PUBLIC_` prefix)
- **Timeout:** 90 seconds, 1 retry on network errors (not on parse/auth errors)
- **Function:** `generateCourseContent(description: string, difficulty: string) → Promise<GeneratedCourse>`
  - Returns `{ icon: string, chapters: [{ title, description, lessons: [{ title, content }] }] }`
  - Content is generated in Chinese with Markdown formatting
  - JSON extraction handles code-block-wrapped responses

**Hard rule:** `GLM_API_KEY` must never be prefixed with `EXPO_PUBLIC_` — it is server-side only. Importing `@/lib/glm` from a client component would leak the key.

### Authentication (Clerk)

- **Provider:** `ClerkProvider` wraps the root layout with `publishableKey` from `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and `tokenCache` from `@clerk/expo/token-cache`.
- **Hooks used:** `useAuth()` (session state), `useUser()` (user profile), `useSignIn()` (login flow), `useSignUp()` (registration flow).
- **Sign-in API:** `signIn.password({ identifier, password })` → check `result.error` → on success `signIn.status === 'complete'` → `signIn.finalize()`.
- **Sign-up API:** `signUp.password({ emailAddress, password, firstName, ... })` → check `result.error` → on success check `signUp.status === 'complete'` → `signIn.finalize()`, otherwise show pending verification UI.
- **No `isLoaded` on signIn/signUp:** The Clerk v3 hooks (`SignInSignalValue`, `SignUpSignalValue`) do NOT return `isLoaded`. Use `useAuth().isLoaded` for the loading guard.
- **Token storage:** `expo-secure-store` via `tokenCache` (iOS Keychain / Android EncryptedSharedPreferences).
- **Config plugins:** `@clerk/expo` and `expo-secure-store` are registered in `app.json`.

### Theme system

All styling flows through `src/constants/theme.ts`:

- **`Colors.light/dark`** — 10 semantic color tokens: `text`, `textSecondary`, `background`, `backgroundElement`, `backgroundSelected`, `primary`, `onPrimary`, `primaryContainer`, `accent`, `border`. Use `useTheme()` to access them.
- **`Radius`** — `{ sm:12, md:16, lg:24, xl:32, pill:999 }`
- **`Spacing`** — `{ half:2, one:4, two:8, three:16, four:24, five:32, six:64 }`
- **`Fonts`** — Platform-selected system fonts; `rounded` family used for titles

**Hard rule:** Component code must never hardcode hex color values. Always consume colors via `useTheme()` (function components) or `Colors[scheme]` (module scope). The only exceptions are `src/constants/theme.ts` itself, `app.json`, and `animated-icon.tsx` (splash layer runs before hooks are available).

**Pre-built themed primitives:**
- `<ThemedText type="title" | "subtitle" | "default" | "small" | "smallBold" | "link" | "linkPrimary" | "code" themeColor={optional}>`
- `<ThemedView type="backgroundElement" | "backgroundSelected" | ...>` — the `type` prop sets backgroundColor to the named token
- `<PrimaryButton label="..." onPress={...} />` — pill-shaped filled button using `primary`/`onPrimary` tokens
- `<SecondaryButton label="..." onPress={...} />` — pill-shaped outlined button with `primary` border + text, transparent background
- `<TextInput placeholder="..." value={...} onChangeText={...} />` — themed input with `backgroundElement` fill, `border` outline, `text` color, `textSecondary` placeholder

### Game system

The app uses a gamified learning metaphor inspired by RPG/adventure games:

**Server-side game core (`src/lib/game.ts`):**
- `REWARDS` — lesson 50 XP/10 coins, chapter bonus 100 XP/30 coins, course bonus 200 XP/100 coins
- Level curve: `splitLevel(totalXP)` with `maxLevel = 10`; `levelThreshold` (level 1 → 3 → 6 realm unlocks)
- `BOUNTY_DEFS` (4 daily bounties) + `ACHIEVEMENT_DEFS` (5 achievements, conditions evaluated server-side)
- `findUserByEmail`, `getCompletionSet`, `getCourseProgress`, `computeUserStats` (study days/streak), `findCurrentMission`, `evaluateBounty`, `evaluateAchievements`, `buildPlayerPayload`, `buildBountiesPayload`
- **Hard rule:** `src/lib/game.ts` is server-side only (imports `@/db`) — referenced exclusively by `src/app/api/*+api.ts` routes

**Types (`src/types/game.ts`):**
- `PlayerStats`, `Mission` (courseId), `Bounty`, `Realm`, `Achievement`, `LEVEL_TITLES` (知识学徒 → 全知传说)

**Client data layer:**
- `src/data/game-defs.ts` — `ACHIEVEMENT_ICONS` (key → badge image) + `REALM_DEFS` (6 realm cards with `minLevel` 1/3/6) + `isRealmLocked()`
- `src/data/game-data.ts` — `MOCK_GAME_STATE` for signed-out preview ONLY (home screen fallback)
- `src/hooks/use-game-state.ts` — `useGameState()` returns `{ state, loading, error, refresh, claimBounty }`; `claimBounty(key)` posts the claim and refreshes state
- `src/lib/create-course.ts` — `createCourseAndGenerate(userEmail, data, cb)` + `retryCourseGeneration(userEmail, courseId, cb)`; module-scope functions keep timers/purity intact

**Game UI components (`src/components/game/`):**
- `player-info-card` — shows player level, XP bar, stats
- `current-mission` — progress card for the active course (press → course detail)
- `daily-bounties` — checklist of daily tasks with rewards (toggle claims a bounty)
- `course-dialog` — modal form for creating a new AI course (description + difficulty, supports `initialDescription` preset)
- `active-courses` — horizontal scrollable list of user's courses with status badges
- `unlockable-realms` — grid of course domains (locked/unlocked; press opens creation dialog)
- `honor-showcase` — achievement badges row
- `circular-progress` — circular SVG progress indicator
- `src/components/markdown-content.tsx` — themed Markdown renderer (`react-native-markdown-display`) for lesson content

**Hooks:**
- `useGameState()` (`src/hooks/use-game-state.ts`) — fetches aggregated game state from `/api/game-state`, returns real data for signed-in users, `null` otherwise
- `useAuthGuard()` (`src/hooks/use-auth-guard.ts`) — wraps an action with an auth check; shows alert prompting login if signed out

### Onboarding flow

Three screens in a horizontal paged `Animated.ScrollView`:
1. 💡 `输入一个想法` — "想学什么都可以，"三个月入门日语"，一句话就够"
2. ✨ `AI 为你定制课程` — "章节、要点、练习，几十秒生成一套专属学习路径" (uses `GeneratingCard` illustration)
3. 🎓 `按自己的节奏学` — "进度自动保存，每天一小步，也能学完一门课"

"跳过" button fades out on the last screen; third-screen button reads `开始使用 →`. Both call `setHasSeenOnboarding()` + `router.replace('/')`. The flag storage (`src/utils/onboarding-storage.ts`) is fire-and-forget — write failures mean the user sees onboarding again next launch, which is harmless.

### UI copy convention

All user-facing text is in **Chinese** (Simplified). Copy was finalized during design and should not be rewritten without explicit request.

## Design docs

- Spec: `docs/superpowers/specs/2026-07-17-theme-welcome-design.md` — theme decisions, color table, UX rationale, copy text
- Plan: `docs/superpowers/plans/2026-07-17-theme-welcome-page.md` — implementation task breakdown
- Plan: `docs/superpowers/plans/2026-08-02-implement-gamified-learning.md` — gamified learning loop (rewards, bounties, achievements, lesson reader)

## Key design decisions

- **Theme direction:** "Sprout Green" warm educational aesthetic (light cream background `#FAF7F0`, green primary `#33A06F`, large border radii). Chosen via visual mockup comparison against violet and coral alternatives.
- **Splash color `#33A06F`:** The existing splash icon asset is white — it would be invisible on the cream background, so the primary green serves as the launch brand color.
- **Dark mode:** Fully supported via dual token sets in `Colors`. All themed components automatically respond to system color scheme.
- **No hex hardcoding:** Except for the four files listed above. Any new component should follow the `useTheme()` pattern.
- **Tab icons:** `lucide-react-native` (peer dep `react-native-svg`). Icons are React components — use `<Tent size={24} color={...} />`, not image assets. Tab bar uses `expo-router` `<Tabs>` with the `tabBar` prop for a fully custom bottom bar.
- **Database architecture:** Expo API Routes as BFF backed by NeonDB + Drizzle ORM. The `neon-http` driver is used (not WebSocket) because API routes are stateless and serverless-compatible. `web.output: "server"` is required.
- **Auth flow:** Users land on the Welcome page regardless of auth state. Signed-out users see 登录/注册 buttons; signed-in users see a greeting. Auth pages are behind a route group that redirects signed-in users away.
- **AI generation:** 智谱 GLM (`glm-4-flash`) via OpenAI-compatible API. Course creation is two-step: create draft → trigger generation. Status lifecycle: `draft` → `generating` → `ready` / `failed`. API key must be server-side only.
- **Gamification:** Users earn XP/coins/levels via lesson completion, chapter/course bonuses, and daily bounties. Rewards are granted server-side in `src/lib/game.ts` and are idempotent (unique-index guarded, no transactions — the `neon-http` driver does not support them; the insert-first → update-user → best-effort rollback pattern is used).
