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
      
      {/* Team screens */}
      <Stack.Screen name="team-details" options={{ headerShown: true, title: 'Team Details' }} />
      <Stack.Screen name="create-group" options={{ headerShown: true, title: 'Create Team' }} />
      <Stack.Screen name="join-group" options={{ headerShown: true, title: 'Join Team' }} />
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="new-activity" options={{ headerShown: true, title: 'New Activity' }} />
      <Stack.Screen name="server-settings" options={{ headerShown: true, title: 'Server Settings' }} />
      <Stack.Screen name="verify-email" options={{ headerShown: false }} />
      
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