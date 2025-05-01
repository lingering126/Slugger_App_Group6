// VerifyEmail.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import axios from 'axios';
import { API_URL } from '../config'; // Import the deployed API URL

export default function VerifyEmail({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  
  const route = useRoute();
  const { token, email } = route.params;
  
  useEffect(() => {
    const verifyEmail = async () => {
      try {
        console.log('Verifying email with token:', token);
        
        // Use the deployed URL, not the localhost URL
        const deployedUrl = "https://slugger-app-group6.onrender.com/api";
        
        console.log('Using API URL for verification:', deployedUrl);
        
        const response = await axios.get(`${deployedUrl}/auth/verify-email`, {
          params: { 
            token,
            email 
          }
        });
        
        console.log('Verification response:', response.data);
        setVerified(true);
        setLoading(false);
        
        // Automatically navigate to login after 3 seconds
        setTimeout(() => {
          navigation.navigate('Login', { verified: 'true' });
        }, 3000);
      } catch (error) {
        console.error('Verification error:', error);
        setLoading(false);
        if (error.response) {
          setError(error.response.data.message || 'Verification failed');
          console.error('Error response data:', error.response.data);
        } else if (error.request) {
          setError('No response received from server. Please check your internet connection.');
          console.error('Error request:', error.request);
        } else {
          setError('Verification failed. Please try again.');
          console.error('Error message:', error.message);
        }
      }
    };
    
    verifyEmail();
  }, [token, email, navigation]);
  
  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6A4BFF" />
          <Text style={styles.loadingText}>Verifying your email...</Text>
        </View>
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
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
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