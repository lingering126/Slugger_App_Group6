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
            headerShown: false, // Hide the default header for home screen
          }}
        />
        <Tabs.Screen
          name="team"
          options={{
            title: "Team",
            headerStyle: { backgroundColor: "#4A90E2" },
            headerTintColor: "#fff",
            headerTitleAlign: "center",
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            headerStyle: { backgroundColor: "#3A8891" },
            headerTintColor: "#fff",
            headerTitleAlign: "center",
          }}
        />
        <Tabs.Screen
          name="profile/EditProfile"
          options={{
            title: " ",
            headerStyle: { backgroundColor: "#3A8891" },
            headerTintColor: "#fff",
            headerTitleAlign: "center",
          }}
        />
        <Tabs.Screen
          name="analytics"
          options={{
            title: "Analytics",
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: "More",
            headerStyle: { backgroundColor: "#dc3748b9" },
            headerTintColor: "#fff",
            headerTitleAlign: "center",
          }}
        />
      </Tabs>
      
      {/* Custom tab bar at the bottom */}
      <BottomTabBar />
    </View>
  );
} 