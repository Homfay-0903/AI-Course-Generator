import { useAuth, useUser } from '@clerk/expo';
import { Sparkles, Swords, Target, TrendingUp } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActiveCourses, type ActiveCourse } from '@/components/game/active-courses';
import {
  CourseDialog,
  type CourseDialogData,
} from '@/components/game/course-dialog';
import { DailyBounties } from '@/components/game/daily-bounties';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { MOCK_GAME_STATE } from '@/data/game-data';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useTheme } from '@/hooks/use-theme';

export default function MissionsScreen() {
  const theme = useTheme();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { user } = useUser();
  const guardAction = useAuthGuard();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [courses, setCourses] = useState<ActiveCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

  const userEmail = user?.primaryEmailAddress?.emailAddress ?? null;

  // ── Fetch user courses from API ────────────────────────
  const fetchCourses = async () => {
    if (!isSignedIn || !userEmail) return;

    setCoursesLoading(true);
    try {
      const userRes = await fetch(
        `/api/user?email=${encodeURIComponent(userEmail)}`,
      );
      if (!userRes.ok) return;

      const { user: dbUser } = await userRes.json();
      if (!dbUser?.id) return;

      const coursesRes = await fetch(
        `/api/courses?userId=${encodeURIComponent(dbUser.id)}`,
      );
      if (!coursesRes.ok) return;

      const { courses: dbCourses } = await coursesRes.json();
      setCourses(dbCourses ?? []);
    } catch {
      // Silently fail — the user can still create courses
    } finally {
      setCoursesLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, userEmail]);

  // ── Handle course creation + AI generation ─────────────
  const handleCreateCourse = async (data: CourseDialogData) => {
    if (!isSignedIn || !userEmail) {
      guardAction(() => {});
      return;
    }

    setSubmitting(true);
    setDialogOpen(false);

    // Step 1: Create the course (status: 'draft')
    let course: ActiveCourse;
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail,
          title: data.description.slice(0, 50),
          description: data.description,
          difficulty: data.difficulty,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        Alert.alert('创建失败', err.error ?? '请稍后重试');
        setSubmitting(false);
        return;
      }

      const result = await res.json();
      course = result.course;
    } catch {
      Alert.alert('网络错误', '请检查网络连接后重试');
      setSubmitting(false);
      return;
    }

    // Add course to list immediately (status: 'draft')
    setCourses((prev) => [course, ...prev]);

    // Step 2: Trigger AI generation
    setCourseGenerating(course.id, true);
    try {
      const genRes = await fetch(`/api/courses/${course.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail }),
      });

      if (!genRes.ok) {
        const err = await genRes.json();
        setCourseFailed(course.id);
        Alert.alert('生成失败', err.error ?? 'AI 生成课程内容失败，请稍后重试');
        return;
      }

      const { course: updatedCourse } = await genRes.json();
      setCourseUpdated(course.id, updatedCourse);
      Alert.alert('课程生成成功', `"${updatedCourse.title}" 已准备就绪，开始学习吧！`);
    } catch {
      setCourseFailed(course.id);
      Alert.alert('网络错误', 'AI 生成超时，请检查网络后重试');
    } finally {
      setCourseGenerating(course.id, false);
      setSubmitting(false);
    }
  };

  /** Update a course in the list with new data (e.g. after generation). */
  const setCourseUpdated = (id: string, updated: ActiveCourse) => {
    setCourses((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  /** Mark a course as 'generating'. */
  const setCourseGenerating = (id: string, active: boolean) => {
    setCourses((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status: active ? ('generating' as const) : c.status }
          : c,
      ),
    );
  };

  /** Mark a course as 'failed'. */
  const setCourseFailed = (id: string) => {
    setCourses((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: 'failed' as const } : c,
      ),
    );
  };

  /** Open the create dialog — no auth required to browse the form. */
  const handleCreatePress = () => {
    setDialogOpen(true);
  };

  // ── Mock bounties ──────────────────────────────────────
  const { dailyBounties } = MOCK_GAME_STATE;

  // ── Quick stats (mock) ─────────────────────────────────
  const quickStats = [
    { icon: Target, label: '已创建', value: `${courses.length} 门`, color: theme.primary },
    { icon: TrendingUp, label: '连续学习', value: '3 天', color: theme.accent },
    { icon: Sparkles, label: '总经验', value: '720 XP', color: '#7C5CFC' },
  ];

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* ── Hero section with title + create button ── */}
          <ThemedView style={styles.heroSection}>
            <Swords size={48} color={theme.primary} />
            <ThemedText type="title">冒险任务</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              完成每日任务，用 AI 创建专属课程
            </ThemedText>
          </ThemedView>

          {/* ── Quick stats row ── */}
          <View style={styles.statsRow}>
            {quickStats.map((stat, i) => (
              <ThemedView
                key={i}
                type="backgroundElement"
                style={[styles.statCard, { borderColor: theme.border }]}
              >
                <stat.icon size={18} color={stat.color} />
                <ThemedText type="smallBold">{stat.value}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.statLabel}>
                  {stat.label}
                </ThemedText>
              </ThemedView>
            ))}
          </View>

          {/* ── Create course CTA card ── */}
          <ThemedView
            type="backgroundElement"
            style={[
              styles.createCard,
              {
                borderColor: theme.primary + '30',
              },
            ]}
          >
            {/* Glow accent */}
            <View
              style={[styles.createCardGlow, { backgroundColor: theme.primary + '0A' }]}
              pointerEvents="none"
            />

            <View style={styles.createCardContent}>
              <View style={styles.createCardText}>
                <View style={styles.createTitleRow}>
                  <Sparkles size={22} color={theme.primary} />
                  <ThemedText type="subtitle">创建新课程</ThemedText>
                </View>
                <ThemedText themeColor="textSecondary" style={styles.createDesc}>
                  用 AI 生成你的专属学习路径，从入门到精通
                </ThemedText>
              </View>

              <PrimaryButton
                label="开始创建"
                onPress={handleCreatePress}
                style={styles.createBtn}
              />
            </View>
          </ThemedView>

          {/* ── Active courses ── */}
          {!authLoaded || coursesLoading ? (
            <ActivityIndicator size="small" style={styles.loader} />
          ) : (
            <ActiveCourses
              courses={courses}
              onCreateNew={handleCreatePress}
              onCoursePress={(course) => {
                guardAction(() => {
                  Alert.alert(course.title, '课程学习功能即将上线！');
                });
              }}
            />
          )}

          {/* ── Daily bounties ── */}
          <DailyBounties
            bounties={dailyBounties}
            onToggle={() =>
              guardAction(() => {
                Alert.alert('任务完成', '每日赏金功能即将上线！');
              })
            }
          />

          {/* Bottom safe spacer */}
          <View style={{ height: BottomTabInset }} />
        </SafeAreaView>
      </ScrollView>

      {/* ── Course creation dialog ── */}
      <CourseDialog
        visible={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        onSubmit={handleCreateCourse}
        loading={submitting}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: BottomTabInset + Spacing.six,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  subtitle: {
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statCard: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    gap: 2,
  },
  statLabel: {
    fontSize: 11,
  },
  createCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  createCardGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  createCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  createCardText: {
    flex: 1,
    gap: Spacing.one,
  },
  createTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  createDesc: {
    lineHeight: 20,
  },
  createBtn: {
    alignSelf: 'center',
  },
  loader: {
    paddingVertical: Spacing.four,
  },
});
