# 新芽绿 Theme 系统与三屏欢迎引导页 · 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地全 App 统一的「新芽绿·温暖教育感」theme token 系统，并实现首次启动展示的三屏欢迎引导页（看过后不再出现）。

**Architecture:** 扩展模板现有的 `Colors/ThemeColor` token 机制（10 个语义色 × light/dark），既有 `ThemedText/ThemedView` 组件自动获得新 token；路由重构为「根 Stack + `(tabs)` 组」，引导页作为 Stack 兄弟路由，用 `Stack.Protected` 按 AsyncStorage 首启标记做门控；引导页为横向分页 ScrollView + reanimated 驱动的进度点。

**Tech Stack:** Expo SDK ~57.0.7、expo-router ~57.0.7（含 NativeTabs、Stack.Protected）、react-native-reanimated 4.5、react-native-safe-area-context、@react-native-async-storage/async-storage（新增）、TypeScript strict。

**Spec:** `docs/superpowers/specs/2026-07-17-theme-welcome-design.md`（色值、文案、决策记录以 spec 为准）

## Global Constraints

- 色值必须与 spec §3.1 表格逐字一致；组件代码中**禁止硬编码 hex**，一律走 `useTheme()` token。仅有例外：`src/constants/theme.ts` 本体、`app.json`、`animated-icon.tsx` 的 splash 覆盖层（splash 阶段无法读 hook）。
- 界面文案逐字使用：`跳过`、`下一步`、`开始使用 →`，三屏标题/副文案见 Task 5 的 `SLIDES` 数组，不得改写。
- 新增依赖仅 `@react-native-async-storage/async-storage`，且必须经 `npx expo install` 安装（保证 SDK 57 兼容版本）。
- 每个任务收尾必跑：`npx tsc --noEmit`（期望无输出）与 `npm run lint`（期望无 error）。
- typed routes 注意：路由结构变化后（Task 2、5、6），先 `npx expo start --web` 让 `.expo/types` 重新生成，再跑 tsc，否则可能报过期路由类型错误。
- splash 背景色为 `#33A06F`（spec §3.4 修订版）：现有 splash 图标是白色的，放在奶油底上不可见，故以主色绿作为启动品牌色，深浅模式共用。
- API 事实（已对照本地 node_modules 核实，docs.expo.dev 当前网络不可达）：`Stack.Protected` props 为 `{ guard: boolean; children }`；reanimated 4.5 提供 `useAnimatedScrollHandler/useAnimatedStyle/useSharedValue/interpolate/interpolateColor/Extrapolation`。
- 验证策略遵循 spec §7：模板无测试基建，本计划用 tsc + lint + 分任务手动验证代替单测；不引入 jest。

---

### Task 1: 主题令牌与全局观感

**Files:**
- Modify: `src/constants/theme.ts`
- Modify: `src/components/themed-text.tsx`
- Modify: `src/components/animated-icon.tsx:136,143`
- Modify: `src/components/app-tabs.tsx:13`
- Modify: `src/components/app-tabs.web.tsx:58`
- Modify: `app.json`

**Interfaces:**
- Produces: `Colors.light/dark` 含 10 个 key：`text, textSecondary, background, backgroundElement, backgroundSelected, primary, onPrimary, primaryContainer, accent, border`（`ThemeColor` 类型自动扩展，后续任务经 `useTheme()` 消费）；`Radius = { sm:12, md:16, lg:24, xl:32, pill:999 }`。

- [ ] **Step 1: 建工作分支**

```bash
git checkout -b feat/theme-welcome-page
```

- [ ] **Step 2: 替换 `src/constants/theme.ts` 的 `Colors`，并在 `Spacing` 之后新增 `Radius`**

`Colors` 整体替换为（文件其余部分 `ThemeColor/Fonts/Spacing/BottomTabInset/MaxContentWidth` 不动）：

```ts
export const Colors = {
  light: {
    text: '#26332B',
    textSecondary: '#6E7A70',
    background: '#FAF7F0',
    backgroundElement: '#FFFDF8',
    backgroundSelected: '#EDE7DA',
    primary: '#33A06F',
    onPrimary: '#FFFFFF',
    primaryContainer: '#DCF2E5',
    accent: '#FFC94D',
    border: '#E6E0D2',
  },
  dark: {
    text: '#E8EFE9',
    textSecondary: '#93A69A',
    background: '#151F19',
    backgroundElement: '#1E2A22',
    backgroundSelected: '#27352C',
    primary: '#4CC38A',
    onPrimary: '#0B140F',
    primaryContainer: '#21382C',
    accent: '#E9BE55',
    border: '#2A362E',
  },
} as const;
```

`Spacing` 定义之后新增：

```ts
export const Radius = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;
```

- [ ] **Step 3: 调整 `src/components/themed-text.tsx`**

三处改动：`title` 改 32/800 + 圆体、`subtitle` 改 20/600、`linkPrimary` 去掉硬编码蓝色改走 `primary` token。整文件替换为：

```tsx
import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && [styles.linkPrimary, { color: theme.primary }],
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  title: {
    fontSize: 32,
    fontWeight: 800,
    lineHeight: 40,
    fontFamily: Fonts.rounded,
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: 600,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
```

- [ ] **Step 4: 换掉 `src/components/animated-icon.tsx` 里的两处模板蓝**

第 136 行（`AnimatedIcon` 的渐变底）：

```ts
// 旧
experimental_backgroundImage: `linear-gradient(180deg, #3C9FFE, #0274DF)`,
// 新
experimental_backgroundImage: `linear-gradient(180deg, #4CC38A, #33A06F)`,
```

第 143 行（splash 覆盖层背景，须与 app.json splash 同色避免闪变）：

```ts
// 旧
backgroundColor: '#208AEF',
// 新
backgroundColor: '#33A06F',
```

- [ ] **Step 5: tab 栏适配新配色**

`src/components/app-tabs.tsx` 第 13 行：新调色板下 `backgroundElement`(#FFFDF8) 与奶油底几乎同色，指示器会隐形，改用选中色：

```tsx
// 旧
indicatorColor={colors.backgroundElement}
// 新
indicatorColor={colors.backgroundSelected}
```

`src/components/app-tabs.web.tsx` 第 58 行，品牌字样去模板化：

```tsx
// 旧
          Expo Starter
// 新
          AI 课程生成
```

- [ ] **Step 6: 更新 `app.json` 启动与图标背景色**

`expo.plugins` 中 expo-splash-screen 配置的 `backgroundColor` 由 `"#208AEF"` 改为 `"#33A06F"`；`expo.android.adaptiveIcon.backgroundColor` 由 `"#E6F4FE"` 改为 `"#DCF2E5"`。其余字段不动。

- [ ] **Step 7: 验证**

```bash
npx tsc --noEmit    # 期望：无输出，退出码 0
npm run lint        # 期望：无 error
```

再 `npx expo start --web` 打开首页：底色应为奶油色 `#FAF7F0`，标题变小变圆润，图标渐变为绿色，启动 splash 覆盖层为绿色。浏览器 devtools 切换 `prefers-color-scheme: dark` 后底色应为墨绿黑 `#151F19`。

- [ ] **Step 8: Commit**

```bash
git add src/constants/theme.ts src/components/themed-text.tsx src/components/animated-icon.tsx src/components/app-tabs.tsx src/components/app-tabs.web.tsx app.json
git commit -m "feat: apply sprout-green theme tokens across app"
```

---

### Task 2: 路由重构——(tabs) 组 + 根 Stack + 导航主题

**Files:**
- Create: `src/app/(tabs)/_layout.tsx`
- Move: `src/app/index.tsx` → `src/app/(tabs)/index.tsx`（git mv，内容不改）
- Move: `src/app/explore.tsx` → `src/app/(tabs)/explore.tsx`（git mv，内容不改）
- Modify: `src/app/_layout.tsx`（整体重写）

**Interfaces:**
- Consumes: Task 1 的 `Colors`。
- Produces: 根导航为 `Stack`（headerShown:false），`(tabs)` 为其子路由；URL `/` 仍解析到 `(tabs)/index`。Task 6 将在此 Stack 上加 `Stack.Protected`。

- [ ] **Step 1: 移动 tab 页面进组**

```bash
mkdir -p "src/app/(tabs)"
git mv src/app/index.tsx "src/app/(tabs)/index.tsx"
git mv src/app/explore.tsx "src/app/(tabs)/explore.tsx"
```

（页面内 import 全部走 `@/` 别名，移动后无需改内容。）

- [ ] **Step 2: 创建 `src/app/(tabs)/_layout.tsx`**

```tsx
export { default } from '@/components/app-tabs';
```

（`app-tabs.tsx`/`app-tabs.web.tsx` 平台变体经该转发继续生效。）

- [ ] **Step 3: 重写 `src/app/_layout.tsx`**

```tsx
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const base = isDark ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.backgroundElement,
          text: colors.text,
          border: colors.border,
        },
      }}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
```

- [ ] **Step 4: 验证**

```bash
npx expo start --web
```

期望：`/` 照常显示首页（Welcome to Expo 模板内容、新绿主题），底部/顶部 tab 切换 Home/Explore 正常，无多余导航头。然后：

```bash
npx tsc --noEmit    # 期望：无输出（typed routes 已随 expo start 重新生成）
npm run lint        # 期望：无 error
```

- [ ] **Step 5: Commit**

```bash
git add -A src/app
git commit -m "refactor: move tabs into (tabs) group under root stack"
```

---

### Task 3: PrimaryButton 通用主按钮

**Files:**
- Create: `src/components/ui/primary-button.tsx`

**Interfaces:**
- Consumes: `useTheme()`（`primary/onPrimary`）、`Radius/Spacing`、`ThemedText`。
- Produces: `PrimaryButton`，props 为 `{ label: string; onPress: () => void; style?: StyleProp<ViewStyle> }`。Task 5 以 `<PrimaryButton label="下一步" onPress={...} />` 使用。

- [ ] **Step 1: 创建 `src/components/ui/primary-button.tsx`**

```tsx
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({ label, onPress, style }: PrimaryButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
        style,
      ]}>
      <ThemedText themeColor="onPrimary" style={styles.label}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Radius.pill,
    paddingVertical: 14,
    paddingHorizontal: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  label: {
    fontSize: 16,
    fontWeight: 700,
  },
});
```

- [ ] **Step 2: 验证 + Commit**

```bash
npx tsc --noEmit && npm run lint
git add src/components/ui/primary-button.tsx
git commit -m "feat: add PrimaryButton ui component"
```

---

### Task 4: 引导页子组件——Slide 与进度点

**Files:**
- Create: `src/components/onboarding/slide.tsx`
- Create: `src/components/onboarding/pagination-dots.tsx`

**Interfaces:**
- Consumes: Task 1 token（`primaryContainer/accent/primary/backgroundSelected`）。
- Produces:
  - `OnboardingSlide`，props `{ width: number; title: string; subtitle: string; emoji?: string; illustration?: ReactNode }`
  - `PaginationDots`，props `{ count: number; scrollX: SharedValue<number>; pageWidth: number }`

- [ ] **Step 1: 创建 `src/components/onboarding/slide.tsx`**

```tsx
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type OnboardingSlideProps = {
  width: number;
  title: string;
  subtitle: string;
  emoji?: string;
  illustration?: ReactNode;
};

export function OnboardingSlide({ width, title, subtitle, emoji, illustration }: OnboardingSlideProps) {
  const theme = useTheme();

  return (
    <View style={[styles.slide, { width }]}>
      <View style={[styles.blob, { backgroundColor: theme.primaryContainer }]}>
        {illustration ?? <ThemedText style={styles.emoji}>{emoji}</ThemedText>}
        <View style={[styles.decorTopRight, { backgroundColor: theme.accent }]} />
        <View style={[styles.decorBottomLeft, { backgroundColor: theme.primary }]} />
      </View>
      <ThemedText type="title" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        {subtitle}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
  },
  blob: {
    width: 240,
    height: 190,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 72,
    lineHeight: 84,
  },
  decorTopRight: {
    position: 'absolute',
    top: -8,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  decorBottomLeft: {
    position: 'absolute',
    bottom: -6,
    left: -10,
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 0.45,
  },
  title: {
    marginTop: Spacing.five,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: Spacing.three,
    textAlign: 'center',
    lineHeight: 24,
  },
});
```

- [ ] **Step 2: 创建 `src/components/onboarding/pagination-dots.tsx`**

激活点宽 6→16 拉伸 + 颜色 `backgroundSelected`→`primary` 过渡，随滚动实时插值：

```tsx
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

export type PaginationDotsProps = {
  count: number;
  scrollX: SharedValue<number>;
  pageWidth: number;
};

export function PaginationDots({ count, scrollX, pageWidth }: PaginationDotsProps) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, index) => (
        <Dot key={index} index={index} scrollX={scrollX} pageWidth={pageWidth} />
      ))}
    </View>
  );
}

type DotProps = {
  index: number;
  scrollX: SharedValue<number>;
  pageWidth: number;
};

function Dot({ index, scrollX, pageWidth }: DotProps) {
  const theme = useTheme();

  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * pageWidth, index * pageWidth, (index + 1) * pageWidth];
    return {
      width: interpolate(scrollX.value, inputRange, [6, 16, 6], Extrapolation.CLAMP),
      backgroundColor: interpolateColor(scrollX.value, inputRange, [
        theme.backgroundSelected,
        theme.primary,
        theme.backgroundSelected,
      ]),
    };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
```

- [ ] **Step 3: 验证 + Commit**

```bash
npx tsc --noEmit && npm run lint
git add src/components/onboarding
git commit -m "feat: add onboarding slide and pagination dots components"
```

---

### Task 5: 欢迎引导页组装

**Files:**
- Create: `src/app/onboarding.tsx`

**Interfaces:**
- Consumes: `OnboardingSlide`、`PaginationDots`、`PrimaryButton`（签名见 Task 3/4）。
- Produces: 路由 `/onboarding`；`finish()` 暂为 `router.replace('/')`，Task 6 会在其中加持久化调用。

- [ ] **Step 1: 创建 `src/app/onboarding.tsx`**

文案逐字来自 spec §5.1，不得改动：

```tsx
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PaginationDots } from '@/components/onboarding/pagination-dots';
import { OnboardingSlide } from '@/components/onboarding/slide';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SLIDES = [
  {
    key: 'idea',
    emoji: '💡',
    title: '输入一个想法',
    subtitle: '想学什么都可以\n「三个月入门日语」，一句话就够',
  },
  {
    key: 'generate',
    card: true,
    title: 'AI 为你定制课程',
    subtitle: '章节、要点、练习\n几十秒生成一套专属学习路径',
  },
  {
    key: 'learn',
    emoji: '🎓',
    title: '按自己的节奏学',
    subtitle: '进度自动保存\n每天一小步，也能学完一门课',
  },
] as const;

export default function OnboardingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<Animated.ScrollView>(null);
  const scrollX = useSharedValue(0);
  const [currentPage, setCurrentPage] = useState(0);
  const isLast = currentPage === SLIDES.length - 1;

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  // 「跳过」在滑向最后一屏的过程中淡出
  const skipStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollX.value,
      [(SLIDES.length - 2) * width, (SLIDES.length - 1) * width],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const finish = () => {
    router.replace('/');
  };

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setCurrentPage(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const handleNext = () => {
    if (isLast) {
      finish();
      return;
    }
    const next = currentPage + 1;
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setCurrentPage(next);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.header, skipStyle]} pointerEvents={isLast ? 'none' : 'auto'}>
          <Pressable onPress={finish} hitSlop={8}>
            <ThemedText type="small" themeColor="textSecondary">
              跳过
            </ThemedText>
          </Pressable>
        </Animated.View>

        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          onMomentumScrollEnd={handleMomentumEnd}
          scrollEventThrottle={16}>
          {SLIDES.map((slide) => (
            <OnboardingSlide
              key={slide.key}
              width={width}
              emoji={'emoji' in slide ? slide.emoji : undefined}
              illustration={'card' in slide ? <GeneratingCard /> : undefined}
              title={slide.title}
              subtitle={slide.subtitle}
            />
          ))}
        </Animated.ScrollView>

        <View style={styles.footer}>
          <PaginationDots count={SLIDES.length} scrollX={scrollX} pageWidth={width} />
          <PrimaryButton label={isLast ? '开始使用 →' : '下一步'} onPress={handleNext} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

/** 第二屏插画：AI 正在生成课程的迷你卡片 */
function GeneratingCard() {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
      <ThemedText style={styles.cardEmoji}>✨</ThemedText>
      <View style={styles.cardLines}>
        <View style={[styles.cardLine, { width: 96, backgroundColor: theme.primary }]} />
        <View style={[styles.cardLine, { width: 68, backgroundColor: theme.primaryContainer }]} />
        <View style={[styles.cardLine, { width: 84, backgroundColor: theme.primaryContainer }]} />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.four,
    alignItems: 'stretch',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  cardEmoji: {
    fontSize: 24,
  },
  cardLines: {
    gap: 6,
  },
  cardLine: {
    height: 8,
    borderRadius: 4,
  },
});
```

- [ ] **Step 2: 手动验证**

```bash
npx expo start --web
```

浏览器直接访问 `http://localhost:8081/onboarding`（端口以 expo 输出为准；门控未接入前该路由可直达）。期望：

1. 三屏可横滑，圆点随滑动实时拉伸/变色
2. 滑到第三屏「跳过」淡出且不可点，按钮文字变「开始使用 →」
3. 点「下一步」逐屏推进；第三屏点「开始使用 →」跳到首页
4. 「跳过」任意前两屏可点，直达首页
5. devtools 切深色模式：墨绿黑底、亮绿主色，布局不变

- [ ] **Step 3: 静态检查 + Commit**

```bash
npx tsc --noEmit && npm run lint
git add src/app/onboarding.tsx
git commit -m "feat: add three-screen onboarding page"
```

---

### Task 6: 首启标记与路由门控

**Files:**
- Create: `src/utils/onboarding-storage.ts`
- Modify: `src/app/_layout.tsx`（加载标记 + Stack.Protected）
- Modify: `src/app/onboarding.tsx`（`finish()` 写入标记）
- Modify: `package.json`（expo install 自动写入）

**Interfaces:**
- Consumes: Task 2 的根 Stack、Task 5 的 `finish()`。
- Produces: `getHasSeenOnboarding(): Promise<boolean>`、`setHasSeenOnboarding(): void`（fire-and-forget）。

- [ ] **Step 1: 安装依赖**

```bash
npx expo install @react-native-async-storage/async-storage
```

期望：package.json 出现该依赖（版本由 expo 选定以匹配 SDK 57）。

- [ ] **Step 2: 创建 `src/utils/onboarding-storage.ts`**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const HAS_SEEN_ONBOARDING_KEY = 'hasSeenOnboarding';

/** 读失败视为未看过：用户多看一次引导，无害。 */
export async function getHasSeenOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(HAS_SEEN_ONBOARDING_KEY)) === '1';
  } catch {
    return false;
  }
}

/** 写失败不阻塞导航：下次启动会再次展示引导，可接受。 */
export function setHasSeenOnboarding(): void {
  AsyncStorage.setItem(HAS_SEEN_ONBOARDING_KEY, '1').catch(() => {});
}
```

- [ ] **Step 3: 根 `_layout` 接入门控，整文件替换为**

```tsx
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/theme';
import { getHasSeenOnboarding } from '@/utils/onboarding-storage';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [hasSeenOnboarding, setHasSeenOnboardingState] = useState<boolean | null>(null);

  useEffect(() => {
    getHasSeenOnboarding().then(setHasSeenOnboardingState);
  }, []);

  if (hasSeenOnboarding === null) {
    // 标记未读完前不渲染任何路由；原生 splash（preventAutoHideAsync）仍覆盖屏幕，无闪屏
    return null;
  }

  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const base = isDark ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.backgroundElement,
          text: colors.text,
          border: colors.border,
        },
      }}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!hasSeenOnboarding}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}
```

行为说明：首启 `guard=true` 时 onboarding 是第一个可用路由 → 成为初始屏；已看过时该路由被移除 → 初始屏为 `(tabs)`，且 `/onboarding` 不可达。`finish()` 里 `router.replace('/')` 不受影响（`(tabs)` 未设防）。写入标记后本组件状态不刷新也无妨——用户已离开引导页，下次冷启动读到新值。

- [ ] **Step 4: `src/app/onboarding.tsx` 的 `finish()` 接入持久化**

新增 import：

```tsx
import { setHasSeenOnboarding } from '@/utils/onboarding-storage';
```

`finish` 改为：

```tsx
const finish = () => {
  setHasSeenOnboarding();
  router.replace('/');
};
```

- [ ] **Step 5: 手动验证（web 全流程）**

```bash
npx expo start --web
```

1. devtools → Application → Local Storage 删除 `hasSeenOnboarding` → 刷新 → 应直接落在引导页
2. 走完三屏点「开始使用 →」→ 进首页；刷新 → 直进首页（不再见引导）
3. 再删标记 → 刷新 → 引导页回来；这次点「跳过」→ 进首页；刷新 → 直进首页
4. 手动访问 `/onboarding`（已看过状态）→ 应被拒之门外（回到 `(tabs)`）

- [ ] **Step 6: 静态检查 + Commit**

```bash
npx tsc --noEmit && npm run lint
git add src/utils/onboarding-storage.ts src/app/_layout.tsx src/app/onboarding.tsx package.json package-lock.json
git commit -m "feat: gate onboarding behind first-launch flag"
```

---

### Task 7: 端到端收尾验证

**Files:** 无新改动（如验证发现问题，修复后以 `fix:` 提交）

- [ ] **Step 1: 静态全量**

```bash
npx tsc --noEmit && npm run lint
```

- [ ] **Step 2: 双路径 × 双模式清单**

web（必做）+ 真机/模拟器（有条件则做，`npx expo start` 扫码）：

- 首启：splash 绿 → 引导三屏完整走通 → 首页（新绿主题）
- 重启：直进首页
- 浅色/深色系统外观各过一遍引导页与首页，检查无刺眼硬编码色残留
- web 端 tab 栏品牌字样为「AI 课程生成」

- [ ] **Step 3: 汇报**

向用户汇报验证结果（含未能覆盖的平台，如无 iOS 真机），由用户决定是否合并回 main（配合 superpowers:finishing-a-development-branch）。
