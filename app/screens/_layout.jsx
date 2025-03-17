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
      <Stack.Screen name="verify-email" options={{ headerShown: false }} />
      
      {/* Onboarding screens */}
      <Stack.Screen name="welcome" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="join-group" options={{ headerShown: false }} />
      <Stack.Screen name="create-group" options={{ headerShown: false }} />
      
      {/* Testing utilities */}
      <Stack.Screen name="reset-welcome" options={{ headerShown: true, title: 'Reset Welcome Page' }} />
      
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