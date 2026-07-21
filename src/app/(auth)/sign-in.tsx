import { useSignIn } from '@clerk/expo';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextInput } from '@/components/ui/text-input';
import { Spacing } from '@/constants/theme';

export default function SignInScreen() {
  const { signIn, fetchStatus } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [serverError, setServerError] = useState('');

  const isLoading = fetchStatus === 'fetching';

  const onSubmit = async () => {
    if (!signIn) return;
    setServerError('');

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.error) {
        setServerError(result.error.message ?? '登录失败，请检查邮箱和密码');
        return;
      }

      if (signIn.status === 'complete') {
        await signIn.finalize();
        // Auth layout's useAuth() reacts and <Redirect> fires
      } else {
        setServerError(`登录状态异常 (${signIn.status})`);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : '登录失败，请检查邮箱和密码';
      setServerError(message);
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

          {serverError ? (
            <ThemedText type="small" style={styles.error}>
              {serverError}
            </ThemedText>
          ) : null}

          <PrimaryButton
            label={isLoading ? '登录中…' : '登录'}
            onPress={onSubmit}
          />

          <ThemedText
            type="linkPrimary"
            style={styles.switchLink}
            onPress={() => router.replace('/(auth)/sign-up')}
          >
            没有账号？注册
          </ThemedText>

          {/* Required by Clerk for bot protection (CAPTCHA) */}
          <View nativeID="clerk-captcha" />
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
