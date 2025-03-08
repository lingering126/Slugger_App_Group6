import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { usePathname } from 'expo-router';
import BottomTabBar from '../components/BottomTabBar';

export default function TabsLayout() {
  const pathname = usePathname();
  
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: "#4A90E2" },
          headerTintColor: "#fff",
          headerTitleAlign: "center",
          tabBarStyle: { display: 'none' }, // Hide the default tab bar
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
          }}
        />
        <Tabs.Screen
          name="team"
          options={{
            title: "Team",
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: "Analytics",
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: "More",
          }}
        />
      </Tabs>
      
      {/* Custom tab bar at the bottom */}
      <BottomTabBar />
    </View>
  );
} 