# AI 课程生成 App · Theme 系统与欢迎页设计

**日期**：2026-07-17
**状态**：已获用户批准（视觉方向经浏览器 mockup 对比确认）

## 1. 背景与目标

App 定位：用户输入一个 prompt/想法，AI 为其生成结构化学习课程。当前代码库是全新的 Expo SDK 57 模板（expo-router + NativeTabs + 基础 themed 组件）。

本设计解决两件事：

1. 敲定全 App 统一的 theme 风格，落成可复用的 token 系统
2. 设计首次启动的欢迎引导页

## 2. 已确认的产品决策

| 问题 | 决策 |
|---|---|
| 欢迎页角色 | 首次启动引导页（看过后不再出现） |
| 风格气质 | 温暖教育感（奶油浅底、大圆角、柔和点缀，参考 Duolingo/Headspace 的亲切感） |
| 配色方向 | **新芽绿**（三方案可视化对比后用户选定；备选为香芋紫、暖阳橘） |
| 深色模式 | 支持，双套 token，跟随系统 |
| 引导结构 | 三屏横向轮播 + 圆点指示器 + 跳过/开始使用 |
| 文案语言 | 中文 |

## 3. Theme Token 系统

改动文件：`src/constants/theme.ts`（扩展）、`src/components/themed-text.tsx`（字号与颜色调整）、`app.json`（splash/图标背景色）、`src/app/_layout.tsx`（导航主题）。

### 3.1 色彩 Token（light / dark 双套，沿用现有 `ThemeColor` 类型机制）

| Token | Light | Dark | 用途 |
|---|---|---|---|
| `background` | `#FAF7F0` | `#151F19` | 页面底色（奶油 / 墨绿黑） |
| `backgroundElement` | `#FFFDF8` | `#1E2A22` | 卡片、浮起表面 |
| `backgroundSelected` | `#EDE7DA` | `#27352C` | 选中态、非激活圆点 |
| `text` | `#26332B` | `#E8EFE9` | 主文字 |
| `textSecondary` | `#6E7A70` | `#93A69A` | 副文字 |
| `primary` | `#33A06F` | `#4CC38A` | 主色：按钮、激活态、链接 |
| `onPrimary` | `#FFFFFF` | `#0B140F` | 主色之上的文字 |
| `primaryContainer` | `#DCF2E5` | `#21382C` | 品牌色容器（插画底、高亮区块） |
| `accent` | `#FFC94D` | `#E9BE55` | 蜜黄点缀（装饰、徽章） |
| `border` | `#E6E0D2` | `#2A362E` | 描边、分割线 |

原模板 5 个 token（text/background/backgroundElement/backgroundSelected/textSecondary）全部保留同名替换值，既有组件无需改 API。

### 3.2 圆角 Token（新增）

```ts
export const Radius = { sm: 12, md: 16, lg: 24, xl: 32, pill: 999 } as const;
```

大圆角是「温暖教育感」的骨架：卡片用 `lg/xl`，按钮用 `pill`，小控件用 `sm/md`。

### 3.3 字体与字号

- 标题类使用现有 `Fonts.rounded`（iOS = ui-rounded 圆体；Android/Web 回退系统无衬线，属预期降级）
- `ThemedText` 调整：`title` 48/600 → **32/800（rounded）**；`subtitle` 32/600 → **20/600**；`linkPrimary` 硬编码 `#3c87f7` → 走 `primary` token
- 其余 `default/small/smallBold/code` 保持不变
- 影响说明：模板自带的 index/explore 页会随之改观，这正是「全 App 统一 theme」的预期效果

### 3.4 全局观感统一

- `app.json`：splash 背景 `#208AEF` → `#33A06F`（主色绿，深浅模式共用；不用奶油底是因为现有 splash 图标为白色，奶油底上不可见）；Android adaptiveIcon 背景 `#E6F4FE` → `#DCF2E5`
- `src/app/_layout.tsx`：导航主题不再用 expo-router 的 `DefaultTheme/DarkTheme` 原值，而是以其为基底覆盖 `colors.background/card/text/primary/border` 为上表 token，使系统导航区域（含 NativeTabs 背景）与主题一致
- `Spacing`、`BottomTabInset`、`MaxContentWidth` 维持现状

## 4. 路由结构与首启逻辑

### 4.1 目录重构（模板标准做法）

```
src/app/
├── _layout.tsx          → 根 Stack（headerShown:false）+ 首启判断，保留 AnimatedSplashOverlay
├── onboarding.tsx       → 欢迎引导页（新增）
└── (tabs)/
    ├── _layout.tsx      → AppTabs（NativeTabs 从 components 原样迁入）
    ├── index.tsx        → 主页（原 src/app/index.tsx 平移）
    └── explore.tsx      → 原 src/app/explore.tsx 平移
```

### 4.2 首启标记

- 存储：`@react-native-async-storage/async-storage`（经 `npx expo install` 安装以匹配 SDK 57；iOS/Android/Web 三端可用），key = `hasSeenOnboarding`，值 `'1'`
- 启动流程：根 `_layout` 异步读标记，读取完成前返回 null——此时原生 splash（`SplashScreen.preventAutoHideAsync` + `AnimatedSplashOverlay`）仍覆盖屏幕，无闪屏
- 未看过 → 展示 `/onboarding`；看过 → 直接进 `(tabs)`。具体用 `Stack.Protected` guard 还是 `<Redirect>`，实现前按 AGENTS.md 要求查阅 v57 文档后择一（两者皆可满足本设计）
- 「跳过」与「开始使用」行为一致：写入标记 → `router.replace` 进主页

### 4.3 容错

- 读取失败 → 视为未看过（用户多看一次引导，无害）
- 写入失败 → 不阻塞进入主页（下次启动会再见到引导，可接受）

## 5. 欢迎引导页

### 5.1 三屏内容（文案已确认）

| 屏 | 插画 | 标题 | 副文案 |
|---|---|---|---|
| ① | 💡 于 `primaryContainer` 大圆角色块中 | 输入一个想法 | 想学什么都可以，「三个月入门日语」，一句话就够 |
| ② | 迷你课程卡拼贴（`backgroundElement` 白卡 + ✨ + 绿色条形骨架） | AI 为你定制课程 | 章节、要点、练习，几十秒生成一套专属学习路径 |
| ③ | 🎓 于 `primaryContainer` 色块中 | 按自己的节奏学 | 进度自动保存，每天一小步，也能学完一门课 |

各屏插画色块四周点缀 2-3 个 `accent`/`primary` 小圆点（位置按已确认 mockup 硬编码于 slide 内）。

### 5.2 组件结构

```
src/app/onboarding.tsx               → 页面：横向分页 Animated.ScrollView，数据驱动 3 屏
src/components/onboarding/
    slide.tsx                        → 单屏布局；插画默认渲染 emoji，支持传入自定义节点（第②屏用）
    pagination-dots.tsx              → 进度点；reanimated 随滚动偏移驱动，激活点宽度 6→16 过渡
src/components/ui/primary-button.tsx → 通用胶囊主按钮（primary 底 + onPrimary 字），全 App 复用的设计系统第一块砖
```

### 5.3 交互

- 横滑或点「下一步」翻屏；进度点随滚动实时过渡
- 「跳过」位于右上角（SafeArea 内），滑至第三屏随滚动淡出
- 第三屏按钮文案变为「开始使用 →」
- 全部颜色走 token，零硬编码色值，深浅模式自动生效

## 6. 范围外（本次不做）

- i18n 国际化（文案直接中文字面量）
- 定制插画素材（emoji + 色块方案已确认，后续可无痛替换）
- 主页/探索页的功能重设计（仅被动继承新 theme）
- 账号体系、课程生成功能本体

## 7. 实现前置与验证

- **前置**：写代码前阅读 https://docs.expo.dev/versions/v57.0.0/ 相关章节（AGENTS.md 硬性要求），确认 `Stack.Protected`/`Redirect`、NativeTabs 置于 `(tabs)` 组、async-storage 安装方式
- **验证**：`npx tsc --noEmit`、`npm run lint` 通过；实机/浏览器手动跑通两条路径——首启完整走三屏引导进主页、重启后直进主页；深浅两种系统外观下检查引导页与主页观感
