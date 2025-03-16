import { Tabs, Stack } from 'expo-router';
import { FontAwesome } from "@expo/vector-icons";

export default function ScreensLayout() {
  return (
    <Stack
      screenOptions={{
        animation: 'fade',
        animationDuration: 300,
        gestureEnabled: false, // Disable gesture navigation to prevent UI issues
        headerShown: false,
        contentStyle: { backgroundColor: '#fff' }
      }}
    >
      {/* Authentication screens */}
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      
      {/* Utility screens */}
      <Stack.Screen name="connection-test" options={{ headerShown: true, title: 'Connection Test' }} />
      
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