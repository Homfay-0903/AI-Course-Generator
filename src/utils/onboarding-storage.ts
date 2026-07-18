import AsyncStorage from '@react-native-async-storage/async-storage';

const HAS_SEEN_ONBOARDING_KEY = 'hasSeenOnboarding';

/** 读失败视为未看过：用户多看一次引导，无害。 */
export async function getHasSeenOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(HAS_SEEN_ONBOARDING_KEY)) === '1';
  } catch {
    return false;
  }
}

/** 写失败不阻塞导航：下次启动会再次展示引导，可接受。 */
export function setHasSeenOnboarding(): void {
  AsyncStorage.setItem(HAS_SEEN_ONBOARDING_KEY, '1').catch(() => {});
}
