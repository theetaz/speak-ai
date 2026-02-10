import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';
import { COLORS } from '@/utils/constants';

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={[styles.icon, focused && styles.iconFocused]}>{icon}</Text>;
}

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="(history)"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }) => <TabIcon icon="📋" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="(progress)"
        options={{
          title: 'Progress',
          tabBarIcon: ({ focused }) => <TabIcon icon="📈" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    height: 85,
    paddingTop: 8,
  },
  label: { fontSize: 11, fontWeight: '600' },
  icon: { fontSize: 22, opacity: 0.5 },
  iconFocused: { opacity: 1 },
});
