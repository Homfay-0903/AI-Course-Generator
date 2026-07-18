import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/theme';
import { getHasSeenOnboarding } from '@/utils/onboarding-storage';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [hasSeenOnboarding, setHasSeenOnboardingState] = useState<boolean | null>(null);

  useEffect(() => {
    getHasSeenOnboarding().then(setHasSeenOnboardingState);
  }, []);

  if (hasSeenOnboarding === null) {
    // 标记未读完前不渲染任何路由；原生 splash（preventAutoHideAsync）仍覆盖屏幕，无闪屏
    return null;
  }

  const isDark = colorScheme === 'dark';
  const colors = Colors[isDark ? 'dark' : 'light'];
  const base = isDark ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...base,
        colors: {
          ...base.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.backgroundElement,
          text: colors.text,
          border: colors.border,
        },
      }}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!hasSeenOnboarding}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}
