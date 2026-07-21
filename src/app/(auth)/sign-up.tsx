import { useSignUp } from '@clerk/expo';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/primary-button';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { TextInput } from '@/components/ui/text-input';
import { Spacing } from '@/constants/theme';

export default function SignUpScreen() {
  const { signUp, fetchStatus } = useSignUp();

  const [step, setStep] = useState<'form' | 'code'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [serverError, setServerError] = useState('');

  const isLoading = fetchStatus === 'fetching';

  // ── Step 1: Create sign-up + send email verification code ─
  const onSubmitForm = async () => {
    if (!signUp) return;
    setServerError('');

    try {
      await signUp.create({
        emailAddress: email,
        password,
        firstName: name || undefined,
      });

      // If no verification needed, finalize directly
      if (signUp.status === 'complete') {
        await signUp.finalize();
        return;
      }

      // Send email code
      await signUp.verifications.sendEmailCode();
      setStep('code');
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : '注册失败，请稍后重试');
    }
  };

  // ── Step 2: Verify code + finalize ────────────────────
  const onSubmitCode = async () => {
    if (!signUp) return;
    if (!code.trim()) {
      setServerError('请输入验证码');
      return;
    }
    setServerError('');

    try {
      const result = await signUp.verifications.verifyEmailCode({ code: code.trim() });
      if (result.error) {
        setServerError(result.error.message ?? '验证码错误');
        return;
      }

      if (signUp.status === 'complete') {
        await signUp.finalize();
      } else {
        setServerError(`状态异常 (${signUp.status})，缺少: ${signUp.missingFields?.join(', ') ?? '—'}`);
      }
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : '验证失败');
    }
  };

  const onResend = async () => {
    if (!signUp) return;
    try { await signUp.verifications.sendEmailCode(); setCode(''); } catch { /* ignore */ }
  };

  // ── Code input UI ──────────────────────────────────────
  if (step === 'code') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.form}>
            <ThemedText type="title" style={styles.title}>验证邮箱</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              我们已向 {email} 发送了 6 位验证码
            </ThemedText>

            <TextInput
              placeholder="输入 6 位验证码"
              value={code}
              onChangeText={(t) => { setCode(t); if (serverError) setServerError(''); }}
              keyboardType="number-pad" maxLength={6}
              autoComplete="one-time-code" textContentType="oneTimeCode"
              style={styles.codeInput}
            />

            {serverError ? <ThemedText type="small" style={styles.error}>{serverError}</ThemedText> : null}

            <PrimaryButton label={isLoading ? '验证中…' : '验证并完成注册'} onPress={onSubmitCode} />

            <View style={styles.resendRow}>
              <ThemedText type="small" themeColor="textSecondary">没有收到验证码？</ThemedText>
              <ThemedText type="linkPrimary" style={styles.resendLink} onPress={isLoading ? undefined : onResend}>重新发送</ThemedText>
            </View>

            <SecondaryButton label="返回修改信息" onPress={() => { setStep('form'); setCode(''); setServerError(''); }} />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  // ── Registration form ──────────────────────────────────
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.form}>
          <ThemedText type="title" style={styles.title}>注册</ThemedText>

          <TextInput placeholder="昵称（选填）" value={name} onChangeText={setName} autoCapitalize="words" textContentType="name" />
          <TextInput placeholder="邮箱" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
          <TextInput placeholder="密码" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" />

          {serverError ? <ThemedText type="small" style={styles.error}>{serverError}</ThemedText> : null}

          <PrimaryButton label={isLoading ? '发送验证码…' : '注册'} onPress={onSubmitForm} />
          <ThemedText type="linkPrimary" style={styles.switchLink} onPress={() => router.replace('/(auth)/sign-in')}>已有账号？登录</ThemedText>

          <View nativeID="clerk-captcha" />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four, justifyContent: 'center' },
  form: { gap: Spacing.three, alignItems: 'center' },
  title: { marginBottom: Spacing.two },
  subtitle: { textAlign: 'center', marginBottom: Spacing.one },
  error: { textAlign: 'center', alignSelf: 'stretch' },
  switchLink: { marginTop: Spacing.two },
  codeInput: { fontSize: 24, textAlign: 'center', letterSpacing: 8, fontWeight: 700 },
  resendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  resendLink: { fontSize: 14, lineHeight: 20 },
});
