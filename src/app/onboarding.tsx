import { useRouter } from 'expo-router';

import { setHasSeenOnboarding } from '@/utils/onboarding-storage';
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

  const finish = async () => {
    await setHasSeenOnboarding();
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
