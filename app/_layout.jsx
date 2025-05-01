import { Tabs, Stack } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RootLayout = () => {
  useEffect(() => {
    // Handle deep links
    const handleDeepLink = async (event) => {
      const url = event.url;
      console.log('Deep link received:', url);
      
      try {
        // Parse the URL
        const { hostname, queryParams } = Linking.parse(url);
        
        if (hostname === 'login' && queryParams?.verified === 'true') {
          // Store the verification status in AsyncStorage
          await AsyncStorage.setItem('verified_from_deeplink', 'true');
          console.log('Stored deep link verification status');
        }
      } catch (error) {
        console.error('Error handling deep link:', error);
      }
    };
    
    // Add event listener for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Check for initial URL that may have launched the app
    const getInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('App opened from deep link:', initialUrl);
        handleDeepLink({ url: initialUrl });
      }
    };
    
    getInitialURL();
    
    // Clean up
    return () => {
      subscription.remove();
    };
  }, []);

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
      <Stack.Screen 
        name="team-stats" 
        options={{
          title: "Team Statistics",
          headerShown: true,
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTintColor: '#333',
        }}
      />
    </Stack>
  );
};

export default RootLayout;
