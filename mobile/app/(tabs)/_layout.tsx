import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ focused, name, outline }: { focused: boolean; name: IconName; outline: IconName }) {
  return <Ionicons name={focused ? name : outline} size={23} color={focused ? '#e94560' : '#6e7681'} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#0d1117', shadowColor: 'transparent', elevation: 0 },
        headerTintColor: '#e6edf3',
        headerTitleStyle: { fontWeight: '800', fontSize: 18 },
        tabBarStyle: {
          backgroundColor: '#161b22',
          borderTopColor: '#21262d',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#e94560',
        tabBarInactiveTintColor: '#6e7681',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="home" outline="home-outline" />,
        }}
      />
      <Tabs.Screen
        name="tags"
        options={{
          title: 'Tags',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="pricetag" outline="pricetag-outline" />,
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          title: 'Lists',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="albums" outline="albums-outline" />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="time" outline="time-outline" />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="settings" outline="settings-outline" />,
        }}
      />
    </Tabs>
  );
}
