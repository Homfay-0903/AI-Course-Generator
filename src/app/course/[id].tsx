import { useAuth, useUser } from '@clerk/expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, BookOpen, CheckCircle2, ChevronRight, Circle, Loader } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CircularProgress } from '@/components/game/circular-progress';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { PrimaryButton } from '@/components/ui/primary-button';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useCourseGeneration } from '@/hooks/use-course-generation';
import { useTheme } from '@/hooks/use-theme';
import type { RealmDifficulty } from '@/types/game';

interface ChapterWithLessons {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: {
    id: string;
    title: string;
    order: number;
    completed: boolean;
  }[];
}

const DIFFICULTY_LABELS: Record<RealmDifficulty, string> = {
  beginner: '入门',
  intermediate: '进阶',
  advanced: '高级',
};

export default function CourseDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  const [course, setCourse] = useState<{
    id: string;
    title: string;
    description: string;
    icon: string | null;
    difficulty: RealmDifficulty;
    status: 'draft' | 'generating' | 'ready' | 'failed';
  } | null>(null);
  const [chapters, setChapters] = useState<ChapterWithLessons[]>([]);
  const [progress, setProgress] = useState<{ completedLessons: number; totalLessons: number; percent: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const { overlay, runRetry } = useCourseGeneration();

  const userEmail = user?.primaryEmailAddress?.emailAddress ?? null;

  const fetchCourse = async () => {
    if (!userEmail || !id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${id}?email=${encodeURIComponent(userEmail)}`);
      if (!res.ok) {
        const err = await res.json();
        Alert.alert('加载失败', err.error ?? '请稍后重试');
        router.back();
        return;
      }
      const data = await res.json();
      setCourse(data.course);
      setChapters(data.chapters ?? []);
      setProgress(data.progress ?? null);
    } catch {
      Alert.alert('网络错误', '请检查网络连接后重试');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCourse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userEmail]);

  // Auth guard: redirect signed-out users to sign-in.
  useEffect(() => {
    if (authLoaded && !isSignedIn) {
      router.replace('/(auth)/sign-in');
    }
  }, [authLoaded, isSignedIn, router]);

  const handleRetryGenerate = () => {
    if (!userEmail || !id) return;
    runRetry(userEmail, id, {
      onCourseCreated: () => {},
      setCourseStatus: (courseId, status) =>
        setCourse((c) => (c ? { ...c, status } : c)),
      onCourseUpdated: () => {
        void fetchCourse();
      },
      onError: (title, message) => Alert.alert(title, message),
      onDone: () => {},
    });
  };

  const difficultyColor =
    course?.difficulty === 'beginner'
      ? theme.primary
      : course?.difficulty === 'intermediate'
        ? theme.accent
        : theme.textSecondary;
  const totalLessons = progress?.totalLessons ?? 0;
  const completedLessons = progress?.completedLessons ?? 0;
  const percent = progress?.percent ?? 0;
  const isGenerating = course?.status === 'generating';
  const isFailed = course?.status === 'failed';

  return (
    <ThemedView style={styles.container}>
      {course ? (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* ── Header bar ── */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft size={24} color={theme.text} />
          </Pressable>
          <View style={styles.headerTitle}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {course.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {chapters.length} 个章节 · {totalLessons} 节课
            </ThemedText>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
          {/* ── Course hero card ── */}
          <ThemedView type="backgroundElement" style={[styles.heroCard, { borderColor: theme.border }]}>
            <View style={styles.heroRow}>
              <View style={[styles.heroIcon, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText style={styles.heroIconEmoji}>{course.icon ?? '📚'}</ThemedText>
              </View>
              <View style={styles.heroInfo}>
                <ThemedText type="title" style={styles.heroTitle}>
                  {course.title}
                </ThemedText>
                <View style={styles.heroMetaRow}>
                  <View style={[styles.diffBadge, { backgroundColor: difficultyColor + '18' }]}>
                    <ThemedText type="small" style={{ color: difficultyColor, fontSize: 11 }}>
                      {DIFFICULTY_LABELS[course.difficulty]}
                    </ThemedText>
                  </View>
                  {isGenerating && (
                    <View style={[styles.statusBadge, { backgroundColor: theme.accent + '1A' }]}>
                      <Loader size={12} color={theme.accent} />
                      <ThemedText type="small" style={{ color: theme.accent, fontSize: 11 }}>
                        AI 生成中…
                      </ThemedText>
                    </View>
                  )}
                  {isFailed && (
                    <View style={[styles.statusBadge, { backgroundColor: '#E05555' + '1A' }]}>
                      <ThemedText type="small" style={{ color: '#E05555', fontSize: 11 }}>
                        生成失败
                      </ThemedText>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Progress ring */}
            {!isGenerating && !isFailed && (
              <View style={styles.progressRow}>
                <CircularProgress
                  progress={percent}
                  size={72}
                  strokeWidth={6}
                  color={theme.primary}
                  label={null}
                />
                <View style={styles.progressText}>
                  <ThemedText type="subtitle">
                    {percent === 100 ? '课程已学完' : '学习进度'}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    已完成 {completedLessons} / {totalLessons} 节课
                    {percent > 0 && percent < 100 ? '，继续加油！' : ''}
                  </ThemedText>
                </View>
              </View>
            )}

            {isFailed && (
              <PrimaryButton label="重新生成" onPress={handleRetryGenerate} style={styles.retryBtn} />
            )}
          </ThemedView>

          {/* ── Chapters & lessons ── */}
          {chapters.length > 0 && (
            <View style={styles.chaptersSection}>
              {chapters.map((chapter, chapterIndex) => {
                const chapterDone = chapter.lessons.length > 0 && chapter.lessons.every((l) => l.completed);
                return (
                  <ThemedView key={chapter.id} type="backgroundElement" style={[styles.chapterCard, { borderColor: theme.border }]}>
                    {/* Chapter header */}
                    <View style={styles.chapterHeader}>
                      <View style={styles.chapterTitleRow}>
                        <ThemedText type="smallBold" themeColor="primary" style={styles.chapterIndex}>
                          第 {chapterIndex + 1} 章
                        </ThemedText>
                        {chapterDone && <CheckCircle2 size={16} color={theme.primary} />}
                      </View>
                      <ThemedText type="subtitle" style={styles.chapterTitle}>
                        {chapter.title}
                      </ThemedText>
                      {chapter.description ? (
                        <ThemedText type="small" themeColor="textSecondary" style={styles.chapterDesc}>
                          {chapter.description}
                        </ThemedText>
                      ) : null}
                    </View>

                    {/* Lesson rows */}
                    <View style={styles.lessonList}>
                      {chapter.lessons.map((lesson) => (
                        <Pressable
                          key={lesson.id}
                          onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })}
                          style={({ pressed }) => [
                            styles.lessonRow,
                            { borderTopColor: theme.border },
                            pressed && styles.lessonRowPressed,
                          ]}
                        >
                          {lesson.completed ? (
                            <CheckCircle2 size={20} color={theme.primary} />
                          ) : (
                            <Circle size={20} color={theme.textSecondary} />
                          )}
                          <ThemedText
                            style={[
                              styles.lessonTitle,
                              lesson.completed && { color: theme.textSecondary },
                            ]}
                            numberOfLines={2}
                          >
                            {lesson.title}
                          </ThemedText>
                          <ChevronRight size={16} color={theme.textSecondary} />
                        </Pressable>
                      ))}
                    </View>
                  </ThemedView>
                );
              })}
            </View>
          )}

          {!isGenerating && !isFailed && totalLessons === 0 && (
            <ThemedView type="backgroundElement" style={[styles.emptyCard, { borderColor: theme.border }]}>
              <BookOpen size={28} color={theme.textSecondary} />
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                课程内容生成中，请稍后刷新
              </ThemedText>
              <PrimaryButton label="刷新" onPress={fetchCourse} />
            </ThemedView>
          )}
        </ScrollView>
      </SafeAreaView>
      ) : (
        <ThemedView style={styles.center}>
          {!loading && <ThemedText themeColor="textSecondary">课程不存在</ThemedText>}
        </ThemedView>
      )}
      <LoadingOverlay
        visible={loading || overlay.visible}
        message={loading ? '课程加载中…' : overlay.message}
        secondaryText={loading ? '正在加载课程内容…' : undefined}
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
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  heroCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconEmoji: {
    fontSize: 28,
  },
  heroInfo: {
    flex: 1,
    gap: Spacing.one,
  },
  heroTitle: {
    fontSize: 20,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  diffBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  progressText: {
    flex: 1,
    gap: Spacing.one,
  },
  retryBtn: {
    alignSelf: 'flex-start',
  },
  chaptersSection: {
    gap: Spacing.two,
  },
  chapterCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  chapterHeader: {
    padding: Spacing.three,
    gap: Spacing.one,
  },
  chapterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chapterIndex: {
    fontSize: 12,
  },
  chapterTitle: {
    fontSize: 17,
  },
  chapterDesc: {
    lineHeight: 18,
  },
  lessonList: {
    paddingHorizontal: Spacing.three,
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  lessonRowPressed: {
    opacity: 0.7,
  },
  lessonTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },
  emptyCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyText: {
    marginBottom: Spacing.one,
  },
});
