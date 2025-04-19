/**
 * App Initialization Service
 * This module handles initial setup tasks when the app first loads
 */

import Utils from '../utils';
import { Platform, Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import IPConfig from '../config/ipConfig';

// Initialize app-wide settings and services
const initializeApp = async () => {
  try {
    console.log('Initializing app...');
    
    // Initialize platform-specific settings
    initPlatformSettings();
    
    // Store network info for later use
    try {
      const netInfo = await NetInfo.fetch();
      global.lastNetworkInfo = netInfo;
      console.log('Network info stored:', netInfo.type, netInfo.isConnected);
    } catch (e) {
      console.error('Failed to get network info:', e);
    }
    
    // Initialize server connection
    await initServerConnection();
    
    console.log('App initialization complete');
  } catch (error) {
    console.error('Error initializing app:', error);
  }
};

// Configure platform-specific settings
const initPlatformSettings = () => {
  if (Platform.OS === 'android') {
    console.log('Running on android platform');
    console.log('Configuring Android-specific settings');
    
    // On Android, we need to adjust some network settings
    // to avoid timeouts in certain cases
    global.XMLHttpRequest = global.originalXMLHttpRequest || global.XMLHttpRequest;
    
    // Set longer timeouts for Android fetch operations
    const originalFetch = global.fetch;
    global.fetch = async (...args) => {
      // If there's no timeout signal, add a default longer timeout
      if (args[1] && !args[1].signal) {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 15000); // 15-second timeout by default
        args[1] = { ...args[1], signal: controller.signal };
      }
      return originalFetch(...args);
    };
  } else if (Platform.OS === 'ios') {
    console.log('Running on iOS platform');
    // iOS-specific code here if needed
  }
};

// Initialize and test server connection
const initServerConnection = async () => {
  console.log('Initializing server connection...');
  
  try {
    // Check if we're in development mode
    if (__DEV__) {
      console.log('Running in development mode, will try local connections');
      
      // First try to use expo-constants to get server IP
      const pingUrl = IPConfig.getPingUrl();
      if (pingUrl) {
        console.log(`Trying ping using Expo Constants: ${pingUrl}`);
        let isConnected = false;
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          
          const response = await fetch(pingUrl, {
            method: 'GET',
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok && await response.text() === 'PONG') {
            console.log('Ping successful using Expo Constants!');
            global.workingApiUrl = IPConfig.getServerUrl();
            Utils.recordSuccessfulConnection(global.workingApiUrl);
            return; // Connection successful, return directly
          }
        } catch (error) {
          console.log(`Ping failed using Expo Constants: ${error.message}`);
        }
      }
      
      // If Expo Constants method fails, try scanning the network
      console.log('Scanning network for server...');
      const scanResult = await Utils.scanNetworkForServer();
      
      if (scanResult.status === 'online') {
        console.log('Server found via network scan:', scanResult.ip);
        return; // We're already connected, no need to continue
      }
    } else {
      console.log('Running in production mode, using deployed URL');
      // Set the working API URL to the deployed Render URL
      global.workingApiUrl = 'https://slugger-app-group6.onrender.com/api';
      
      // Try a ping to check if it's reachable
      const pingResult = await Utils.pingServer(global.workingApiUrl);
      if (pingResult) {
        console.log('Ping successful to deployed URL!');
        Utils.recordSuccessfulConnection(global.workingApiUrl);
        return; // Connection successful, return directly
      }
    }
    
    // If both methods fail, try a full connection check
    console.log('Initial ping failed, trying full connection check...');
    
    // Find the best server URL
    const result = await Utils.findBestServerUrl();
    
    if (result.status === 'online') {
      console.log('Server connection established to:', result.url);
    } else {
      console.warn('Server connection failed:', result.message);
    }
  } catch (error) {
    console.error('Error initializing server connection:', error);
  }
};

// Run the initialization
initializeApp().catch(error => {
  console.error('Unhandled error during app initialization:', error);
});

// Component wrapper to satisfy expo-router's default export requirement
const InitService = () => {
  // This is a null component that doesn't render anything
  // It's just used to satisfy the default export requirement
  return null;
};

export { initializeApp, initServerConnection };
export default InitService; 