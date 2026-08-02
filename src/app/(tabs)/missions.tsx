import { useAuth, useUser } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Sparkles, Swords, Target, TrendingUp } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActiveCourses, type ActiveCourse } from '@/components/game/active-courses';
import { CourseDialog, type CourseDialogData } from '@/components/game/course-dialog';
import { DailyBounties } from '@/components/game/daily-bounties';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useGameState } from '@/hooks/use-game-state';
import { useTheme } from '@/hooks/use-theme';
import { createCourseAndGenerate, retryCourseGeneration } from '@/lib/create-course';

export default function MissionsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { user } = useUser();
  const guardAction = useAuthGuard();
  const { state: gameState, claimBounty } = useGameState();

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
      const userRes = await fetch(`/api/user?email=${encodeURIComponent(userEmail)}`);
      if (!userRes.ok) return;

      const { user: dbUser } = await userRes.json();
      if (!dbUser?.id) return;

      const coursesRes = await fetch(`/api/courses?userId=${encodeURIComponent(dbUser.id)}`);
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

  // ── Course creation + AI generation ────────────────────
  const handleCreateCourse = (data: CourseDialogData) => {
    if (!isSignedIn || !userEmail) {
      guardAction(() => {});
      return;
    }

    setSubmitting(true);
    setDialogOpen(false);

    createCourseAndGenerate(userEmail, data, {
      onCourseCreated: (course) => {
        setCourses((prev) => [course, ...prev]);
      },
      setCourseStatus: (id, status) => {
        setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
      },
      onCourseUpdated: (course) => {
        setCourses((prev) => prev.map((c) => (c.id === course.id ? course : c)));
      },
      onError: (title, message) => Alert.alert(title, message),
      onDone: () => setSubmitting(false),
    });
  };

  // ── Course press: ready → detail, failed → retry, else no-op ──
  const handleCoursePress = (course: ActiveCourse) => {
    if (!isSignedIn) {
      guardAction(() => {});
      return;
    }

    if (course.status === 'ready') {
      router.push({ pathname: '/course/[id]', params: { id: course.id } });
      return;
    }

    if (course.status === 'failed') {
      if (!userEmail) return;
      Alert.alert('生成失败', '课程内容生成失败，是否重新生成？', [
        { text: '取消', style: 'cancel' },
        {
          text: '重新生成',
          onPress: () => {
            retryCourseGeneration(userEmail, course.id, {
              onCourseCreated: () => {},
              setCourseStatus: (id, status) => {
                setCourses((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
              },
              onCourseUpdated: (updated) => {
                setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
              },
              onError: (title, message) => Alert.alert(title, message),
              onDone: () => {},
            });
          },
        },
      ]);
    }
  };

  // ── Daily bounty claim (same flow as Home) ─────────────
  const handleBountyToggle = async (id: string) => {
    if (!isSignedIn || !gameState) {
      guardAction(() => {});
      return;
    }
    const bounty = gameState.bounties.find((b) => b.id === id);
    if (!bounty || bounty.completed) return;

    const result = await claimBounty(id);
    Alert.alert(result.title, result.message);
  };

  // ── Quick stats (real data when signed in, 0 otherwise) ─
  const stats = gameState?.stats;
  const quickStats = [
    {
      icon: Target,
      label: '已创建',
      value: `${stats?.createdCourses ?? 0} 门`,
      color: theme.primary,
    },
    {
      icon: TrendingUp,
      label: '连续学习',
      value: `${stats?.streakDays ?? 0} 天`,
      color: theme.accent,
    },
    {
      icon: Sparkles,
      label: '总经验',
      value: `${gameState?.player.totalXP ?? 0} XP`,
      color: '#7C5CFC',
    },
  ];

  const bounties = isSignedIn && gameState ? gameState.bounties : [];

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
                onPress={() => setDialogOpen(true)}
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
              onCreateNew={() => setDialogOpen(true)}
              onCoursePress={handleCoursePress}
            />
          )}

          {/* ── Daily bounties ── */}
          <DailyBounties bounties={bounties} onToggle={handleBountyToggle} />

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
