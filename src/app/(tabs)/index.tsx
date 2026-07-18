import { useAuth, useUser } from '@clerk/expo';
import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedIcon } from '@/components/animated-icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <AnimatedIcon />
          <ThemedText type="title" style={styles.title}>
            AI 课程生成器
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            输入一个想法，AI 为你生成专属学习课程
          </ThemedText>
        </ThemedView>

        {!isLoaded ? (
          <ActivityIndicator size="large" />
        ) : isSignedIn && user ? (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="subtitle">
              欢迎回来
              {user.fullName ? `，${user.fullName}` : ''}
            </ThemedText>
            <ThemedText style={styles.email}>
              {user.primaryEmailAddress?.emailAddress}
            </ThemedText>
            <PrimaryButton label="开始学习" onPress={() => {}} />
            <ThemedText
              type="link"
              style={styles.signOutLink}
              onPress={() => signOut()}
            >
              退出登录
            </ThemedText>
          </ThemedView>
        ) : (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="subtitle" style={styles.cardTitle}>
              登录以保存你的学习进度
            </ThemedText>
            <PrimaryButton
              label="登录"
              onPress={() => router.push('/(auth)/sign-in')}
            />
            <SecondaryButton
              label="注册"
              onPress={() => router.push('/(auth)/sign-up')}
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
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
  },
  card: {
    gap: Spacing.three,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    borderRadius: Spacing.four,
    alignItems: 'center',
  },
  cardTitle: {
    textAlign: 'center',
  },
  email: {
    textAlign: 'center',
  },
  signOutLink: {
    marginTop: Spacing.one,
  },
});
