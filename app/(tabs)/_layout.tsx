import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/src/hooks/useTheme';
import { FontSize } from '@/src/constants/theme';

type IconName = keyof typeof MaterialIcons.glyphMap;

const TAB_ICONS: Record<string, { default: IconName; focused: IconName }> = {
  index: { default: 'menu-book', focused: 'menu-book' },
  collections: { default: 'folder-open', focused: 'folder' },
  'prep-lists': { default: 'assignment', focused: 'assignment' },
  settings: { default: 'settings', focused: 'settings' },
};

function TabIcon({ routeName, color, focused }: { routeName: string; color: string; focused: boolean }) {
  const { colors } = useTheme();
  const icons = TAB_ICONS[routeName] ?? { default: 'help', focused: 'help' };

  return (
    <View style={styles.iconContainer}>
      <MaterialIcons name={focused ? icons.focused : icons.default} size={24} color={color} />
      {focused && <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />}
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        tabBarStyle: [styles.tabBar, { backgroundColor: colors.background, borderTopColor: colors.borderSubtle }],
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Recipes',
          tabBarIcon: ({ color, focused }) => <TabIcon routeName="index" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="collections"
        options={{
          title: 'Collections',
          tabBarIcon: ({ color, focused }) => <TabIcon routeName="collections" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="prep-lists"
        options={{
          title: 'Prep Lists',
          tabBarIcon: ({ color, focused }) => <TabIcon routeName="prep-lists" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => <TabIcon routeName="settings" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    height: 85,
    paddingTop: 8,
    paddingBottom: 28,
  },
  tabLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: FontSize.xs,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
});
