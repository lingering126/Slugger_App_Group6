// VerifyEmail.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import axios from 'axios';
import { getApiUrl } from '../utils';

// Use the deployed Render URL
const API_URL = 'https://slugger-app-group6.onrender.com/api';

export default function VerifyEmail({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  
  const route = useRoute();
  const { token } = route.params;
  
  useEffect(() => {
    const verifyEmail = async () => {
      try {
        await axios.get(`${API_URL}/auth/verify-email?token=${token}`);
        setVerified(true);
        setLoading(false);
        
        // Automatically navigate to login after 3 seconds
        setTimeout(() => {
          navigation.navigate('Login');
        }, 3000);
      } catch (error) {
        setLoading(false);
        if (error.response) {
          setError(error.response.data.message);
        } else {
          setError('Verification failed. Please try again.');
        }
      }
    };
    
    verifyEmail();
  }, [token, navigation]);
  
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