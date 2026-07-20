import { AlertCircle, BookOpen, ChevronRight, Clock, Loader, Sparkles } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RealmDifficulty } from '@/types/game';

export type ActiveCourse = {
  id: string;
  title: string;
  description: string;
  icon?: string | null;
  difficulty: RealmDifficulty;
  status: 'draft' | 'generating' | 'ready' | 'failed';
  createdAt: string;
};

export type ActiveCoursesProps = {
  courses: ActiveCourse[];
  onCoursePress?: (course: ActiveCourse) => void;
  onCreateNew?: () => void;
};

const DIFFICULTY_LABELS: Record<RealmDifficulty, string> = {
  beginner: '入门',
  intermediate: '进阶',
  advanced: '高级',
};

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ size: number; color: string }> }
> = {
  draft: { label: '待生成', icon: Clock },
  generating: { label: 'AI 生成中…', icon: Loader },
  ready: { label: '可学习', icon: BookOpen },
  failed: { label: '生成失败', icon: AlertCircle },
};

function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHr < 24) return `${diffHr} 小时前`;
  if (diffDay < 7) return `${diffDay} 天前`;
  return new Date(isoString).toLocaleDateString('zh-CN');
}

/**
 * 进行中的课程 — list of user's courses with status badges and interactive rows.
 *
 * Empty state shows a prompt to create the first course.
 */
export function ActiveCourses({
  courses,
  onCoursePress,
  onCreateNew,
}: ActiveCoursesProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.section}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BookOpen size={20} color={theme.primary} />
          <ThemedText type="subtitle">我的课程</ThemedText>
        </View>
        {courses.length > 0 && (
          <Pressable onPress={onCreateNew} style={styles.addBtn}>
            <ThemedText type="smallBold" themeColor="primary">
              + 新建
            </ThemedText>
          </Pressable>
        )}
      </View>

      {/* Course list */}
      {courses.length > 0 ? (
        <View style={styles.list}>
          {courses.map((course, index) => {
            const statusCfg = STATUS_CONFIG[course.status] ?? STATUS_CONFIG.draft;
            const StatusIcon = statusCfg.icon;
            const isGenerating = course.status === 'generating';
            const isFailed = course.status === 'failed';
            const difficultyColor =
              course.difficulty === 'beginner'
                ? theme.primary
                : course.difficulty === 'intermediate'
                  ? theme.accent
                  : theme.textSecondary;
            const statusColor = isGenerating
              ? theme.accent
              : isFailed
                ? '#E05555'
                : theme.textSecondary;

            return (
              <Pressable
                key={course.id}
                onPress={() => !isGenerating && onCoursePress?.(course)}
                style={({ pressed }) => [
                  styles.courseRow,
                  {
                    borderBottomColor: theme.border,
                  },
                  pressed && !isGenerating && styles.courseRowPressed,
                  index === courses.length - 1 && styles.lastRow,
                ]}
              >
                {/* Icon */}
                <View style={[styles.courseIcon, { backgroundColor: theme.backgroundSelected }]}>
                  {isGenerating ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    <ThemedText style={styles.iconEmoji}>
                      {course.icon ?? '📚'}
                    </ThemedText>
                  )}
                </View>

                {/* Middle: course info */}
                <View style={styles.courseInfo}>
                  <View style={styles.titleRow}>
                    <ThemedText type="smallBold" numberOfLines={1} style={styles.courseTitle}>
                      {course.title}
                    </ThemedText>
                    <View
                      style={[
                        styles.diffBadge,
                        { backgroundColor: difficultyColor + '18' },
                      ]}
                    >
                      <ThemedText
                        type="small"
                        style={{ color: difficultyColor, fontSize: 11 }}
                      >
                        {DIFFICULTY_LABELS[course.difficulty]}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    numberOfLines={1}
                    style={styles.courseDesc}
                  >
                    {course.description}
                  </ThemedText>
                  <View style={styles.statusRow}>
                    {isGenerating ? (
                      <ActivityIndicator size={10} color={statusColor} />
                    ) : (
                      <StatusIcon size={12} color={statusColor} />
                    )}
                    <ThemedText type="small" style={{ color: statusColor, fontSize: 12 }}>
                      {statusCfg.label}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.statusText}>
                      · {formatRelativeTime(course.createdAt)}
                    </ThemedText>
                  </View>
                </View>

                {/* Right: chevron */}
                <ChevronRight
                  size={18}
                  color={isGenerating ? theme.border : theme.textSecondary}
                />
              </Pressable>
            );
          })}
        </View>
      ) : (
        /* Empty state */
        <Pressable onPress={onCreateNew}>
          <ThemedView
            type="backgroundSelected"
            style={[styles.emptyCard, { borderColor: theme.border }]}
          >
            <View style={[styles.emptyIconWrap, { backgroundColor: theme.primaryContainer }]}>
              <Sparkles size={28} color={theme.primary} />
            </View>
            <ThemedText type="subtitle">开始你的第一门课程</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyDesc}>
              描述你想学习的内容，AI 将为你量身定制学习路径
            </ThemedText>
            <View
              style={[
                styles.createBtn,
                { backgroundColor: theme.primary },
              ]}
            >
              <Sparkles size={16} color={theme.onPrimary} />
              <ThemedText themeColor="onPrimary" type="smallBold">
                创建新课程
              </ThemedText>
            </View>
          </ThemedView>
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  addBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  list: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  courseRowPressed: {
    opacity: 0.7,
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  courseIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconEmoji: {
    fontSize: 20,
  },
  courseInfo: {
    flex: 1,
    gap: Spacing.one,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  courseTitle: {
    flex: 1,
    fontSize: 15,
  },
  courseDesc: {
    fontSize: 13,
  },
  diffBadge: {
    paddingHorizontal: Spacing.one + 2,
    paddingVertical: 1,
    borderRadius: Radius.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
  },
  emptyCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  emptyDesc: {
    textAlign: 'center',
    lineHeight: 20,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    marginTop: Spacing.one,
  },
});
