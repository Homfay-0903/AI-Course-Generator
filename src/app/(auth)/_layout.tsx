import { useAuth } from '@clerk/expo';
import { Redirect, Stack } from 'expo-router';

/**
 * Auth group layout.
 *
 * Signed-in users who land on auth pages are redirected back to the
 * main app.  This keeps /sign-in and /sign-up reachable only when the
 * user genuinely needs to authenticate.
 */
export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return null;
  }

  if (isSignedIn) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
