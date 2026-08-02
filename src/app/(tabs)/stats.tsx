import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { BarChart3, BookOpen, CalendarDays, Flame, Sparkles } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useGameState } from '@/hooks/use-game-state';
import { useTheme } from '@/hooks/use-theme';

export default function StatsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { state: gameState, loading } = useGameState();

  const stats = gameState?.stats;
  const statCards = [
    { icon: CalendarDays, label: '学习天数', value: `${stats?.studyDays ?? 0}` },
    { icon: BookOpen, label: '完成课程', value: `${stats?.completedCourses ?? 0}` },
    { icon: Flame, label: '连续打卡', value: `${stats?.streakDays ?? 0} 天` },
    { icon: Sparkles, label: '总经验', value: `${gameState?.player.totalXP ?? 0} XP` },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <BarChart3 size={48} color={theme.primary} />
          <ThemedText type="title">学习统计</ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.subtitle}>
            追踪你的学习进度和成就
          </ThemedText>
        </ThemedView>

        {!authLoaded || loading ? (
          <ActivityIndicator size="small" style={styles.loader} />
        ) : isSignedIn ? (
          <View style={styles.statsGrid}>
            {statCards.map((stat) => (
              <ThemedView
                key={stat.label}
                type="backgroundElement"
                style={styles.statCard}
              >
                <stat.icon size={24} color={theme.accent} />
                <ThemedText type="title" style={styles.statValue}>
                  {stat.value}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {stat.label}
                </ThemedText>
              </ThemedView>
            ))}
          </View>
        ) : (
          <ThemedView
            type="backgroundElement"
            style={[styles.signInCard, { borderColor: theme.border }]}
          >
            <ThemedText type="subtitle">登录后查看学习统计</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.signInDesc}>
              登录即可记录学习天数、连续打卡和总经验
            </ThemedText>
            <PrimaryButton
              label="去登录"
              onPress={() => router.push('/(auth)/sign-in')}
              style={styles.signInBtn}
            />
          </ThemedView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    gap: Spacing.two,
  },
  subtitle: {
    textAlign: 'center',
  },
  loader: {
    paddingVertical: Spacing.four,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignSelf: 'stretch',
    gap: Spacing.three,
  },
  statCard: {
    flexBasis: '46%',
    flexGrow: 1,
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.lg,
  },
  statValue: {
    fontSize: 22,
  },
  signInCard: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  signInDesc: {
    textAlign: 'center',
  },
  signInBtn: {
    marginTop: Spacing.two,
    alignSelf: 'stretch',
  },
});
