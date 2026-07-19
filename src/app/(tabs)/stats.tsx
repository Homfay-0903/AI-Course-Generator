import { BarChart3, Flame, BookOpen, CalendarDays } from 'lucide-react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const STAT_CARDS = [
  { icon: CalendarDays, label: '学习天数', value: '0' },
  { icon: BookOpen, label: '完成课程', value: '0' },
  { icon: Flame, label: '连续打卡', value: '0 天' },
] as const;

export default function StatsScreen() {
  const theme = useTheme();

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

        <ThemedView style={styles.statsGrid}>
          {STAT_CARDS.map((stat) => (
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
        </ThemedView>
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
  statsGrid: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: Spacing.three,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.lg,
  },
  statValue: {
    fontSize: 22,
  },
});
