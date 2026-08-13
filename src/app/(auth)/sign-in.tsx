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

type SecondFactorStrategy = 'email_code' | 'phone_code' | 'totp' | 'backup_code';

const SECOND_FACTOR_LABELS: Record<SecondFactorStrategy, string> = {
  email_code: '邮箱验证码',
  phone_code: '短信验证码',
  totp: '身份验证器动态码',
  backup_code: '备用验证码',
};

const SECOND_FACTOR_HINTS: Record<SecondFactorStrategy, string> = {
  email_code: '为保护账号安全，已向你的邮箱发送验证码，请输入：',
  phone_code: '为保护账号安全，已向你的手机发送验证码，请输入：',
  totp: '为保护账号安全，请在身份验证器应用中查看动态码并输入：',
  backup_code: '为保护账号安全，请输入你的备用验证码：',
};

export default function SignInScreen() {
  const { signIn, fetchStatus } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [secondFactorStrategy, setSecondFactorStrategy] =
    useState<SecondFactorStrategy | null>(null);
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isLoading = fetchStatus === 'fetching';

  const pickSecondFactor = (): SecondFactorStrategy | null => {
    const factors = signIn?.supportedSecondFactors ?? [];
    const preferred: SecondFactorStrategy[] = [
      'email_code',
      'phone_code',
      'totp',
      'backup_code',
    ];
    return preferred.find((s) => factors.some((f) => f.strategy === s)) ?? null;
  };

  const sendCode = async () => {
    if (!signIn) return;
    const strategy = pickSecondFactor();
    if (!strategy) {
      setServerError('当前账号需要额外验证，但没有可用的验证方式，请稍后重试');
      return;
    }

    // TOTP / backup codes don't need to be sent — go straight to code entry.
    if (strategy === 'totp' || strategy === 'backup_code') {
      setSecondFactorStrategy(strategy);
      setCode('');
      return;
    }

    const result =
      strategy === 'email_code'
        ? await signIn.mfa.sendEmailCode()
        : await signIn.mfa.sendPhoneCode();
    if (result.error) {
      setServerError(result.error.message ?? '验证码发送失败，请重试');
      return;
    }
    setSecondFactorStrategy(strategy);
    setCode('');
  };

  const onSubmit = async () => {
    if (!signIn) return;
    setServerError('');
    setSubmitting(true);

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
        return;
      }

      if (
        signIn.status === 'needs_client_trust' ||
        signIn.status === 'needs_second_factor'
      ) {
        await sendCode();
        return;
      }

      setServerError(`登录状态异常 (${signIn.status})`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : '登录失败，请检查邮箱和密码';
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const verifyCode = async () => {
    if (!signIn || !secondFactorStrategy) return;
    setServerError('');
    setSubmitting(true);

    try {
      const mfa = signIn.mfa;
      let result: { error: unknown } = { error: null };
      switch (secondFactorStrategy) {
        case 'email_code':
          result = await mfa.verifyEmailCode({ code });
          break;
        case 'phone_code':
          result = await mfa.verifyPhoneCode({ code });
          break;
        case 'totp':
          result = await mfa.verifyTOTP({ code });
          break;
        case 'backup_code':
          result = await mfa.verifyBackupCode({ code });
          break;
      }

      if (result.error) {
        setServerError(
          (result.error as { message?: string }).message ?? '验证码错误，请重试'
        );
        return;
      }

      if (signIn.status === 'complete') {
        await signIn.finalize();
        // Auth layout's useAuth() reacts and <Redirect> fires
      } else {
        setServerError(`登录状态异常 (${signIn.status})`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '验证失败，请重试';
      setServerError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    if (!signIn || !secondFactorStrategy) return;
    setServerError('');
    setSubmitting(true);

    try {
      if (secondFactorStrategy === 'email_code') {
        const result = await signIn.mfa.sendEmailCode();
        if (result.error) {
          setServerError(result.error.message ?? '验证码发送失败，请重试');
          return;
        }
      } else if (secondFactorStrategy === 'phone_code') {
        const result = await signIn.mfa.sendPhoneCode();
        if (result.error) {
          setServerError(result.error.message ?? '验证码发送失败，请重试');
          return;
        }
      }
      setCode('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '验证码发送失败，请重试';
      setServerError(message);
    } finally {
      setSubmitting(false);
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
            {secondFactorStrategy ? '设备验证' : '登录'}
          </ThemedText>

          {secondFactorStrategy ? (
            <>
              <ThemedText type="default" style={styles.hint}>
                {SECOND_FACTOR_HINTS[secondFactorStrategy]}
              </ThemedText>

              <TextInput
                placeholder={SECOND_FACTOR_LABELS[secondFactorStrategy]}
                value={code}
                onChangeText={setCode}
                autoCapitalize="none"
              />

              {serverError ? (
                <ThemedText type="small" style={styles.error}>
                  {serverError}
                </ThemedText>
              ) : null}

              <PrimaryButton
                label="验证并登录"
                loading={submitting}
                loadingLabel="验证中…"
                onPress={verifyCode}
              />

              <ThemedText
                type="linkPrimary"
                style={styles.switchLink}
                onPress={resendCode}
              >
                重新发送验证码
              </ThemedText>

              <ThemedText
                type="linkPrimary"
                style={styles.switchLink}
                onPress={() => {
                  setSecondFactorStrategy(null);
                  setServerError('');
                }}
              >
                返回重新输入密码
              </ThemedText>
            </>
          ) : (
            <>
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
                label="登录"
                loading={submitting || isLoading}
                loadingLabel="登录中…"
                onPress={onSubmit}
              />

              <ThemedText
                type="linkPrimary"
                style={styles.switchLink}
                onPress={() => router.replace('/(auth)/sign-up')}
              >
                没有账号？注册
              </ThemedText>
            </>
          )}

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
  hint: {
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  error: {
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  switchLink: {
    marginTop: Spacing.two,
  },
});
