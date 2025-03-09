import { Tabs, Stack } from 'expo-router';
import { FontAwesome } from "@expo/vector-icons";

export default function ScreensLayout() {
  return (
    <Stack
      screenOptions={{
        animation: 'none', // Disable animations for auth screens
      }}
    >
      {/* Authentication screens */}
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      
      {/* Main app screens - using nested tabs */}
      <Stack.Screen 
        name="(tabs)" 
        options={{ 
          headerShown: false,
        }} 
      />
    </Stack>
  );
} 