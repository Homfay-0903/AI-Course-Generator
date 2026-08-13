import { useAuth, useUser } from '@clerk/expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, BookOpenCheck, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MarkdownContent } from '@/components/markdown-content';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface LessonPayload {
  courseId: string;
  courseTitle: string;
  chapterTitle: string;
  lesson: { id: string; title: string; content: string };
  completed: boolean;
  prevLessonId: string | null;
  nextLessonId: string | null;
}

export default function LessonReaderScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  const [data, setData] = useState<LessonPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const userEmail = user?.primaryEmailAddress?.emailAddress ?? null;

  const fetchLesson = async () => {
    if (!userEmail || !id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/lessons/${id}?email=${encodeURIComponent(userEmail)}`);
      if (!res.ok) {
        const err = await res.json();
        Alert.alert('加载失败', err.error ?? '请稍后重试');
        router.back();
        return;
      }
      const payload = (await res.json()) as LessonPayload;
      setData(payload);
      setCompleted(payload.completed);
    } catch {
      Alert.alert('网络错误', '请检查网络连接后重试');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLesson();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userEmail]);

  // Auth guard: redirect signed-out users to sign-in.
  useEffect(() => {
    if (authLoaded && !isSignedIn) {
      router.replace('/(auth)/sign-in');
    }
  }, [authLoaded, isSignedIn, router]);

  const handleComplete = async () => {
    if (!userEmail || !id || completing) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/lessons/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });
      if (!res.ok) {
        const err = await res.json();
        Alert.alert('完成失败', err.error ?? '请稍后重试');
        return;
      }
      const result = await res.json();
      setCompleted(true);

      const parts: string[] = [];
      if (result.xpEarned > 0) {
        parts.push(`+${result.xpEarned} XP`);
        if (result.coinsEarned > 0) parts.push(`+${result.coinsEarned} 金币`);
      }
      let message = '这节课已标记为完成！';
      if (parts.length > 0) {
        message = `奖励 ${parts.join(' · ')}`;
      }
      if (result.leveledUp) {
        message += `\n🎉 恭喜升级到 Lv.${result.level}！`;
      }
      if (result.unlockedAchievements?.length > 0) {
        message += `\n🏆 解锁成就：「${result.unlockedAchievements.map((a: { title: string }) => a.title).join('」「')}」`;
      }
      Alert.alert('完成！', message);
    } catch {
      Alert.alert('网络错误', '请检查网络连接后重试');
    } finally {
      setCompleting(false);
    }
  };

  const goTo = (lessonId: string) => {
    if (!lessonId) return;
    router.push({ pathname: '/lesson/[id]', params: { id: lessonId } });
  };

  return (
    <ThemedView style={styles.container}>
      {data ? (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* ── Header bar ── */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft size={24} color={theme.text} />
          </Pressable>
          <View style={styles.headerTitle}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {data.courseTitle}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {data.chapterTitle}
            </ThemedText>
          </View>
          {completed && <CheckCircle2 size={20} color={theme.primary} />}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
          {/* ── Lesson title ── */}
          <View style={styles.titleBlock}>
            <ThemedText type="title" style={styles.lessonTitle}>
              {data.lesson.title}
            </ThemedText>
            <View style={styles.completeHintRow}>
              <BookOpenCheck size={14} color={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary">
                完成本课可获得 50 XP 与 10 金币
              </ThemedText>
            </View>
          </View>

          {/* ── Markdown content ── */}
          <MarkdownContent>{data.lesson.content}</MarkdownContent>
        </ScrollView>

        {/* ── Bottom action bar ── */}
        <View style={[styles.actionBar, { borderTopColor: theme.border }]}>
          {data.prevLessonId ? (
            <Pressable onPress={() => goTo(data.prevLessonId!)} style={styles.navBtn} hitSlop={8}>
              <ChevronLeft size={18} color={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.navBtnText}>
                上一课
              </ThemedText>
            </Pressable>
          ) : (
            <View style={styles.navBtnSpacer} />
          )}

          <View style={styles.completeBtnWrap}>
            {completed ? (
              <SecondaryButton label="已完成本课" onPress={() => {}} />
            ) : (
              <PrimaryButton
                label="完成本课"
                loading={completing}
                loadingLabel="完成中…"
                onPress={handleComplete}
              />
            )}
          </View>

          {data.nextLessonId ? (
            <Pressable onPress={() => goTo(data.nextLessonId!)} style={styles.navBtn} hitSlop={8}>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.navBtnText}>
                下一课
              </ThemedText>
              <ChevronRight size={18} color={theme.textSecondary} />
            </Pressable>
          ) : (
            <View style={styles.navBtnSpacer} />
          )}
        </View>
      </SafeAreaView>
      ) : (
        <ThemedView style={styles.center}>
          {!loading && <ThemedText themeColor="textSecondary">课时不存在</ThemedText>}
        </ThemedView>
      )}
      <LoadingOverlay
        visible={loading}
        message="课时加载中…"
        secondaryText="正在加载课程内容…"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    gap: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    paddingTop: Spacing.two,
  },
  titleBlock: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  lessonTitle: {
    fontSize: 22,
    lineHeight: 30,
  },
  completeHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  navBtnText: {
    flex: 1,
    fontSize: 12,
  },
  navBtnSpacer: {
    flex: 1,
  },
  completeBtnWrap: {
    flex: 2.2,
  },
});
