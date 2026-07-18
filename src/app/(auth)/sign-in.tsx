import { useAuth, useSignIn } from '@clerk/expo';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextInput } from '@/components/ui/text-input';
import { Spacing } from '@/constants/theme';

export default function SignInScreen() {
  const { isLoaded } = useAuth();
  const { signIn } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!isLoaded || !signIn) return;
    setError('');
    setLoading(true);

    try {
      const result = await signIn.password({ identifier: email, password });

      if (result.error) {
        setError(result.error.message ?? '登录失败，请检查邮箱和密码');
      } else if (signIn.status === 'complete') {
        await signIn.finalize();
        // Auth layout's useAuth() will react and <Redirect> fires automatically
      } else {
        setError('登录状态异常，请重试');
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : '登录失败，请检查邮箱和密码';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.form}
        >
          <ThemedText type="title" style={styles.title}>
            登录
          </ThemedText>

          <TextInput
            placeholder="邮箱"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />

          <TextInput
            placeholder="密码"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
          />

          {error ? (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          ) : null}

          <PrimaryButton
            label={loading ? '登录中...' : '登录'}
            onPress={onSubmit}
          />

          <ThemedText
            type="linkPrimary"
            style={styles.switchLink}
            onPress={() => router.replace('/(auth)/sign-up')}
          >
            没有账号？注册
          </ThemedText>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
  },
  form: {
    gap: Spacing.three,
    alignItems: 'center',
  },
  title: {
    marginBottom: Spacing.two,
  },
  error: {
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  switchLink: {
    marginTop: Spacing.two,
  },
});
