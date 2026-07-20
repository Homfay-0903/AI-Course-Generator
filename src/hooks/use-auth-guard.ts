import { useAuth } from '@clerk/expo';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

/**
 * Returns a `guardAction` function that wraps a callback with an auth check.
 * If auth is still loading, the action is deferred (no-op).
 * If the user is signed in, the callback runs normally.
 * If not, an alert prompts them to log in, and on confirmation navigates to sign-in.
 */
export function useAuthGuard() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  const guardAction = (action: () => void) => {
    // Auth hasn't finished loading — don't do anything yet
    if (!isLoaded) return;

    if (isSignedIn) {
      action();
      return;
    }

    Alert.alert('需要登录', '登录后才能使用此功能，保存你的学习进度与成就。', [
      { text: '稍后再说', style: 'cancel' },
      {
        text: '去登录',
        onPress: () => router.push('/(auth)/sign-in'),
      },
    ]);
  };

  return guardAction;
}
