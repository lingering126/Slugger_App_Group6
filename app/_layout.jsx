import { Tabs } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";

const RootLayout = () => {
  return (
    <Tabs screenOptions={{
      tabBarStyle: { backgroundColor: "#4A90E2" }, 
      tabBarActiveTintColor: "#fff"
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <FontAwesome name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <FontAwesome name="user" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="team"
        options={{
          title: "Team",
          tabBarIcon: ({ color, size }) => <FontAwesome name="users" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color, size }) => <FontAwesome name="bar-chart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => <FontAwesome name="ellipsis-h" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
};

export default RootLayout;
