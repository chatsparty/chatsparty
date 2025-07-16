import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';


export default function TabLayout() {
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#121712',
            borderTopColor: '#2E3829',
            borderTopWidth: 1,
            paddingBottom: 8,
            paddingTop: 8,
            height: 80,
          },
          tabBarActiveTintColor: '#54D12B',
          tabBarInactiveTintColor: '#A6B5A1',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Auctions',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
