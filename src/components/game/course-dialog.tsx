import { Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { TextInput } from '@/components/ui/text-input';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RealmDifficulty } from '@/types/game';

export type CourseDialogData = {
  description: string;
  difficulty: RealmDifficulty;
};

export type CourseDialogProps = {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (data: CourseDialogData) => void;
  loading?: boolean;
};

const DIFFICULTY_OPTIONS: { key: RealmDifficulty; label: string; desc: string }[] = [
  { key: 'beginner', label: '入门', desc: '适合零基础学习者' },
  { key: 'intermediate', label: '进阶', desc: '有一定基础，想深入掌握' },
  { key: 'advanced', label: '高级', desc: '已有扎实基础，追求精通' },
];

/**
 * 创建新课程对话框 — modal with course description input and difficulty selector.
 *
 * The user describes what they want to learn and picks a difficulty level.
 * AI course generation is triggered on submit (future iteration).
 */
export function CourseDialog({
  visible,
  onCancel,
  onSubmit,
  loading = false,
}: CourseDialogProps) {
  const theme = useTheme();
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<RealmDifficulty>('beginner');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    const trimmed = description.trim();
    if (!trimmed) {
      setError('请输入你想学习的内容描述');
      return;
    }

    if (trimmed.length < 4) {
      setError('课程描述太短了，再详细一点吧');
      return;
    }

    setError(null);
    onSubmit({ description: trimmed, difficulty });
  };

  const handleCancel = () => {
    setDescription('');
    setDifficulty('beginner');
    setError(null);
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={handleCancel} />

        <ThemedView
          type="backgroundElement"
          style={[styles.dialog, { borderColor: theme.border }]}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <View
              style={[styles.iconWrap, { backgroundColor: theme.primaryContainer }]}
            >
              <Sparkles size={24} color={theme.primary} />
            </View>
            <ThemedText type="subtitle">创建新课程</ThemedText>
            <ThemedText themeColor="textSecondary" type="small" style={styles.headerDesc}>
              描述你想学的内容，AI 将为你生成专属学习路径
            </ThemedText>
          </View>

          {/* ── Course description ── */}
          <View style={styles.field}>
            <ThemedText type="smallBold" style={styles.label}>
              课程描述
            </ThemedText>
            <TextInput
              placeholder="例如：三个月入门日语，掌握日常对话和基础语法…"
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                if (error) setError(null);
              }}
              multiline
              numberOfLines={4}
              style={styles.textArea}
              editable={!loading}
            />
            {error ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.errorText}>
                {error}
              </ThemedText>
            ) : null}
          </View>

          {/* ── Difficulty selector ── */}
          <View style={styles.field}>
            <ThemedText type="smallBold" style={styles.label}>
              难度选择
            </ThemedText>
            <View style={styles.difficultyRow}>
              {DIFFICULTY_OPTIONS.map((opt) => {
                const isSelected = difficulty === opt.key;
                const accentColor =
                  opt.key === 'beginner'
                    ? theme.primary
                    : opt.key === 'intermediate'
                      ? theme.accent
                      : theme.textSecondary;

                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setDifficulty(opt.key)}
                    disabled={loading}
                    style={[
                      styles.difficultyCard,
                      {
                        borderColor: isSelected ? accentColor : theme.border,
                        backgroundColor: isSelected
                          ? accentColor + '12'
                          : 'transparent',
                      },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{ color: isSelected ? accentColor : theme.textSecondary }}
                    >
                      {opt.label}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      style={[styles.diffDesc, { fontSize: 11 }]}
                      numberOfLines={1}
                    >
                      {opt.desc}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ── Actions ── */}
          <View style={styles.actions}>
            <SecondaryButton
              label="取消"
              onPress={handleCancel}
              style={styles.actionBtn}
            />
            <PrimaryButton
              label={loading ? '生成中…' : '开始生成'}
              onPress={handleSubmit}
              style={styles.actionBtn}
            />
          </View>
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  dialog: {
    width: '100%',
    maxWidth: 440,
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    gap: Spacing.four,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDesc: {
    textAlign: 'center',
    lineHeight: 20,
  },
  field: {
    gap: Spacing.two,
  },
  label: {
    marginBottom: Spacing.half,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: Spacing.three,
  },
  errorText: {
    marginTop: Spacing.half,
  },
  difficultyRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  difficultyCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    alignItems: 'center',
    gap: 2,
  },
  diffDesc: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  actionBtn: {
    flex: 1,
  },
});
