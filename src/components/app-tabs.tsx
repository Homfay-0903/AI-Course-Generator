import { Tabs } from 'expo-router';
import { Tent, Swords, BarChart3, CircleUser } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface TabRoute {
  key: string;
  name: string;
}

interface TabNavigationState {
  index: number;
  routes: TabRoute[];
}

interface TabNavigation {
  emit: (event: { type: string; target: string; canPreventDefault?: boolean }) => {
    defaultPrevented?: boolean;
  };
  navigate: (name: string) => void;
}

const TAB_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  index: Tent,
  missions: Swords,
  stats: BarChart3,
  profile: CircleUser,
};

const TAB_LABELS: Record<string, string> = {
  index: '营地',
  missions: '任务',
  stats: '统计数据',
  profile: '个人资料',
};

const TAB_BAR_HEIGHT = 56;
const ICON_SIZE = 24;

function CustomTabBar({ state, navigation }: { state: TabNavigationState; navigation: TabNavigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPadding =
    Platform.OS === 'web' ? Spacing.three : insets.bottom + Spacing.one;

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: theme.backgroundElement,
          borderTopColor: theme.border,
          paddingBottom: bottomPadding,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const color = isFocused ? theme.primary : theme.textSecondary;
        const IconComponent = TAB_ICONS[route.name];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={({ pressed }) => [
              styles.tabButton,
              pressed && styles.tabPressed,
            ]}
          >
            <View
              style={[
                styles.iconWrapper,
                isFocused && { backgroundColor: theme.primaryContainer },
              ]}
            >
              {IconComponent ? (
                <IconComponent size={ICON_SIZE} color={color} />
              ) : null}
            </View>
            <ThemedText style={[styles.tabLabel, { color }]}>
              {TAB_LABELS[route.name] ?? route.name}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tabs tabBar={(props: any) => <CustomTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ tabBarLabel: '营地' }} />
      <Tabs.Screen name="missions" options={{ tabBarLabel: '任务' }} />
      <Tabs.Screen name="stats" options={{ tabBarLabel: '统计数据' }} />
      <Tabs.Screen name="profile" options={{ tabBarLabel: '个人资料' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: Spacing.half,
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: TAB_BAR_HEIGHT,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.one,
    gap: 2,
  },
  tabPressed: {
    opacity: 0.7,
  },
  iconWrapper: {
    borderRadius: Spacing.two,
    padding: Spacing.one,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
});
