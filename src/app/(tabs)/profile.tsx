import { useAuth, useUser } from '@clerk/expo';
import { router } from 'expo-router';
import { CircleUser } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function ProfileScreen() {
  const theme = useTheme();
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { user } = useUser();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <CircleUser size={48} color={theme.primary} />
          <ThemedText type="title">个人资料</ThemedText>
        </ThemedView>

        {!isLoaded ? (
          <ActivityIndicator size="large" color={theme.primary} />
        ) : isSignedIn && user ? (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedView style={styles.avatar}>
              <CircleUser size={40} color={theme.textSecondary} />
            </ThemedView>
            <ThemedText type="subtitle">
              {user.fullName ?? '学习者'}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.email}>
              {user.primaryEmailAddress?.emailAddress}
            </ThemedText>
            <PrimaryButton
              label="退出登录"
              onPress={() => signOut()}
            />
          </ThemedView>
        ) : (
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="subtitle" style={styles.cardTitle}>
              登录以保存学习进度
            </ThemedText>
            <PrimaryButton
              label="登录"
              onPress={() => router.push('/(auth)/sign-in')}
            />
            <ThemedText
              type="linkPrimary"
              style={styles.registerLink}
              onPress={() => router.push('/(auth)/sign-up')}
            >
              还没有账号？立即注册
            </ThemedText>
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
  avatar: {
    width: 72,
    height: 72,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    gap: Spacing.three,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  cardTitle: {
    textAlign: 'center',
  },
  email: {
    textAlign: 'center',
  },
  registerLink: {
    marginTop: Spacing.one,
    textAlign: 'center',
  },
});
