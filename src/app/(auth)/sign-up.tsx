import { useAuth, useSignUp } from '@clerk/expo';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextInput } from '@/components/ui/text-input';
import { Spacing } from '@/constants/theme';

export default function SignUpScreen() {
  const { isLoaded } = useAuth();
  const { signUp } = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);

  const onSubmit = async () => {
    if (!isLoaded || !signUp) return;
    setError('');
    setLoading(true);

    try {
      const result = await signUp.password({
        emailAddress: email,
        password,
        firstName: name || undefined,
      });

      if (result.error) {
        setError(result.error.message ?? '注册失败，请稍后重试');
      } else if (signUp.status === 'complete') {
        await signUp.finalize();
        // Auth layout's useAuth() will react and <Redirect> fires automatically
      } else {
        // Email verification required — show pending state
        setPendingVerification(true);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : '注册失败，请稍后重试';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="title" style={styles.title}>
            验证邮箱
          </ThemedText>
          <ThemedText type="subtitle" style={styles.subtitle}>
            我们已向 {email} 发送了一封验证邮件，请点击邮件中的链接完成注册。
          </ThemedText>
          <PrimaryButton
            label="返回登录"
            onPress={() => router.replace('/(auth)/sign-in')}
          />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.form}
        >
          <ThemedText type="title" style={styles.title}>
            注册
          </ThemedText>

          <TextInput
            placeholder="昵称（选填）"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            textContentType="name"
          />

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
            autoComplete="new-password"
            textContentType="newPassword"
          />

          {error ? (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          ) : null}

          <PrimaryButton
            label={loading ? '注册中...' : '注册'}
            onPress={onSubmit}
          />

          <ThemedText
            type="linkPrimary"
            style={styles.switchLink}
            onPress={() => router.replace('/(auth)/sign-in')}
          >
            已有账号？登录
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
  subtitle: {
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  error: {
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  switchLink: {
    marginTop: Spacing.two,
  },
});
