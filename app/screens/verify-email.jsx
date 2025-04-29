// VerifyEmail.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import axios from 'axios';

// TODO: Update API_URL to use dynamic retrieval like other screens (e.g., getApiUrl utility)
const API_URL = 'http://your-backend-url.com/api';

/**
 * Verify Email Screen Component
 * 
 * Handles the email verification process triggered by a link.
 * Uses route parameters to get the verification token.
 */
export default function VerifyEmail({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  
  const route = useRoute();
  const { token } = route.params || {};
  
  // Effect hook to run email verification on component mount if token exists
  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setError('Invalid verification link. Token missing.');
        setLoading(false);
        return;
      }
      
      try {
        // Make API call to the backend verification endpoint
        await axios.get(`${API_URL}/auth/verify-email?token=${token}`);
        setVerified(true);
        setLoading(false);
        
        // Navigate to Login screen after successful verification
        setTimeout(() => {
          // Consider using router.replace('/screens/login') if using expo-router
          navigation.navigate('Login', { verified: 'true' }); 
        }, 3000);
      } catch (error) {
        // Handle verification errors (invalid token, expired token, server issues)
        setLoading(false);
        if (error.response && error.response.data && error.response.data.message) {
          setError(error.response.data.message);
        } else {
          setError('Verification failed. Please try again or request a new link.');
        }
        console.error('Email verification error:', error);
      }
    };
    
    verifyEmail();
  }, [token, navigation]);
  
  // Render UI based on verification state (loading, success, error)
  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#6A4BFF" />
      ) : verified ? (
        // Success message
        <View style={styles.messageContainer}>
          <Text style={styles.title}>Email Verified!</Text>
          <Text style={styles.message}>Your email has been successfully verified. Redirecting to login...</Text>
        </View>
      ) : (
        // Error message
        <View style={styles.messageContainer}>
          <Text style={styles.title}>Verification Failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          {/* Consider adding a button to retry or navigate back */}
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