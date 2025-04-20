import { Tabs, Stack } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { useState, useEffect } from "react";

const RootLayout = () => {
  // We'll handle authentication in the login/signup screens directly
  // This simplifies the navigation structure
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        animation: 'fade', // Use fade animation instead of none
        animationDuration: 200 // Smooth transition duration
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="screens" />
    </Stack>
  );
};

export default RootLayout;
