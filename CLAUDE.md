# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## App overview

AI 课程生成器 — a React Native app where users input a prompt and AI generates structured learning courses. Currently at the **theme + onboarding** phase (no AI backend yet).

## Before writing any code

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ — Expo SDK ~57.0.7, React Native 0.86, expo-router ~57.0.7.

## Commands

```bash
npm install                   # install dependencies
npx expo start                # start dev server (scan QR for native, press w for web)
npx tsc --noEmit              # TypeScript type-check (must pass before commits)
npm run lint                  # ESLint via expo lint (must pass before commits)
npx expo install <package>    # add a dependency with SDK-version-compatible resolution
```

There is no test suite — `tsc --noEmit` + `npm run lint` is the verification gate.

## Architecture

### Route structure

```
src/app/
├── _layout.tsx          → Root Stack (headerShown:false) + ThemeProvider + first-launch gate
├── index.tsx            → Conditional <Redirect>: /onboarding if unseen, else /(tabs)
├── onboarding.tsx       → Three-screen onboarding carousel (first launch only)
└── (tabs)/
    ├── _layout.tsx      → Re-exports AppTabs (native: NativeTabs, web: custom tab bar)
    ├── index.tsx        → Home page
    └── explore.tsx      → Explore page
```

- **First-launch gating:** `RootLayout` reads AsyncStorage key `hasSeenOnboarding`. While loading, returns `null` (native splash remains). `Stack.Protected guard={!hasSeenOnboarding}` makes onboarding unreachable once seen. `index.tsx` provides the root-level conditional redirect.
- **AppTabs** has platform variants: `app-tabs.tsx` (native NativeTabs) and `app-tabs.web.tsx` (expo-router/ui Tabs).

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

### Onboarding flow

Three screens in a horizontal paged `Animated.ScrollView`:
1. 💡 `输入一个想法` — "想学什么都可以，「三个月入门日语」，一句话就够"
2. ✨ `AI 为你定制课程` — "章节、要点、练习，几十秒生成一套专属学习路径" (uses `GeneratingCard` illustration)
3. 🎓 `按自己的节奏学` — "进度自动保存，每天一小步，也能学完一门课"

"跳过" button fades out on the last screen; third-screen button reads `开始使用 →`. Both call `setHasSeenOnboarding()` + `router.replace('/')`. The flag storage (`src/utils/onboarding-storage.ts`) is fire-and-forget — write failures mean the user sees onboarding again next launch, which is harmless.

### UI copy convention

All user-facing text is in **Chinese** (Simplified). Copy was finalized during design and should not be rewritten without explicit request.

## Design docs

- Spec: `docs/superpowers/specs/2026-07-17-theme-welcome-design.md` — theme decisions, color table, UX rationale, copy text
- Plan: `docs/superpowers/plans/2026-07-17-theme-welcome-page.md` — implementation task breakdown

## Key design decisions

- **Theme direction:** "Sprout Green" warm educational aesthetic (light cream background `#FAF7F0`, green primary `#33A06F`, large border radii). Chosen via visual mockup comparison against violet and coral alternatives.
- **Splash color `#33A06F`:** The existing splash icon asset is white — it would be invisible on the cream background, so the primary green serves as the launch brand color.
- **Dark mode:** Fully supported via dual token sets in `Colors`. All themed components automatically respond to system color scheme.
- **No hex hardcoding:** Except for the four files listed above. Any new component should follow the `useTheme()` pattern.
