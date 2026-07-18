import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { getHasSeenOnboarding } from '@/utils/onboarding-storage';

export default function Index() {
  const [hasSeen, setHasSeen] = useState<boolean | null>(null);

  useEffect(() => {
    getHasSeenOnboarding().then(setHasSeen);
  }, []);

  if (hasSeen === null) {
    return null;
  }

  if (!hasSeen) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
