import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function icon(focused: boolean, name: IconName, outlineName: IconName) {
  return <Ionicons name={focused ? name : outlineName} size={24} color={focused ? '#e94560' : '#888'} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1a2e' },
        headerTintColor: '#fff',
        tabBarStyle: { backgroundColor: '#16213e', borderTopColor: '#0f3460' },
        tabBarActiveTintColor: '#e94560',
        tabBarInactiveTintColor: '#888',
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Dashboard', tabBarIcon: ({ focused }) => icon(focused, 'home', 'home-outline') }}
      />
      <Tabs.Screen
        name="tags"
        options={{ title: 'Tags', tabBarIcon: ({ focused }) => icon(focused, 'pricetag', 'pricetag-outline') }}
      />
      <Tabs.Screen
        name="lists"
        options={{ title: 'Lists', tabBarIcon: ({ focused }) => icon(focused, 'list', 'list-outline') }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'History', tabBarIcon: ({ focused }) => icon(focused, 'time', 'time-outline') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ focused }) => icon(focused, 'settings', 'settings-outline') }}
      />
    </Tabs>
  );
}
