// VerifyEmail.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useLocalSearchParams } from 'expo-router'; // Use expo-router instead of @react-navigation/native
import axios from 'axios';
import { getApiUrl, checkServerConnection } from '../utils'; // Import utilities

// Get the appropriate API URL based on the environment
const API_URLS = getApiUrl();
let WORKING_URL = global.workingApiUrl || null; // Use globally stored working URL if available

export default function VerifyEmail() {
  const navigation = useNavigation(); // Hook for navigation
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [serverStatus, setServerStatus] = useState(WORKING_URL ? 'online' : 'checking');
  
  // Get token from params
  const params = useLocalSearchParams();
  const tokenFromParams = params.token;

  useEffect(() => {
    const initialize = async () => {
      if (!WORKING_URL) {
        console.log('VerifyEmail: Checking server connection...');
        try {
          const connectionStatus = await checkServerConnection(API_URLS);
          if (connectionStatus.status === 'online' && connectionStatus.url) {
            WORKING_URL = connectionStatus.url;
            global.workingApiUrl = connectionStatus.url; // Store globally
            setServerStatus('online');
            console.log('VerifyEmail: Using working API URL:', WORKING_URL);
          } else {
            setServerStatus('offline');
            setError(connectionStatus.message || 'Cannot connect to server.');
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('VerifyEmail: Server check failed:', err.message);
          setServerStatus('offline');
          setError('Server check failed. Please try again.');
          setLoading(false);
          return;
        }
      } else {
        setServerStatus('online');
      }

      if (!tokenFromParams) {
        setError('Verification token is missing. Please click the link from your email again.');
        setLoading(false);
        return;
      }
      
      verifyUserEmail(tokenFromParams);
    };

    const verifyUserEmail = async (token) => {
      if (!WORKING_URL) {
        setError('Server URL not available. Cannot verify email.');
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Note: The backend route is /api/auth/verify-email
        // The frontend URL is /verify-email which triggers this screen.
        // This screen then calls the backend API.
        console.log(`VerifyEmail: Attempting to verify token with ${WORKING_URL}/auth/verify-email`);
        await axios.get(`${WORKING_URL}/auth/verify-email?token=${token}`);
        setVerified(true);
        setLoading(false);
        setError(''); // Clear any previous errors
        
        Alert.alert(
          "Email Verified!",
          "Your email has been successfully verified. You will be redirected to login.",
          [{ text: "OK", onPress: () => navigation.push('/screens/login') }]
        );
      } catch (err) {
        setLoading(false);
        if (err.response) {
          console.error('VerifyEmail: API Error response:', err.response.data);
          setError(err.response.data.message || 'Verification failed via API.');
        } else if (err.request) {
          console.error('VerifyEmail: Network Error / No response:', err.request);
          setError('Network error or no response from server. Please try again.');
        } else {
          console.error('VerifyEmail: Error setting up request:', err.message);
          setError('Verification failed. An unexpected error occurred.');
        }
      }
    };
    
    initialize();
  }, [tokenFromParams]); // Only re-run if tokenFromParams changes
  
  if (serverStatus === 'checking' && loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6A4BFF" />
        <Text style={styles.message}>Checking server connection...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#6A4BFF" />
      ) : verified ? (
        <View style={styles.messageContainer}>
          <Text style={styles.title}>Email Verified!</Text>
          <Text style={styles.message}>Your email has been successfully verified. Redirecting to login...</Text>
        </View>
      ) : (
        <View style={styles.messageContainer}>
          <Text style={styles.title}>Verification Failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  messageContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    color: 'red',
  },
});
