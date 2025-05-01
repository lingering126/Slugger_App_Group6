// VerifyEmail.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Button, Alert, TouchableOpacity, Linking } from 'react-native';
import { useRoute } from '@react-navigation/native';
import axios from 'axios';
import { API_URL } from '../config'; // Import the deployed API URL

export default function VerifyEmail({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  
  const route = useRoute();
  const { token, email, status } = route.params || {};
  
  // Function to manually open the verification link in browser
  const openInBrowser = async () => {
    if (!token || !email) {
      Alert.alert('Error', 'Missing verification information');
      return;
    }
    
    const url = `https://slugger-app-group6.onrender.com/api/auth/verify-email?token=${token}&email=${email}`;
    console.log('Opening verification link in browser:', url);
    
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open the verification link in a browser');
      }
    } catch (err) {
      console.error('Error opening URL:', err);
      Alert.alert('Error', 'Failed to open the link: ' + err.message);
    }
  };
  
  // Function to go back to login
  const goToLogin = () => {
    navigation.navigate('Login');
  };
  
  useEffect(() => {
    console.log('VerifyEmail screen params:', route.params);
    
    // If we don't have necessary parameters, show error
    if (!token && !email && !status) {
      setLoading(false);
      setError('Missing verification information. Please use the link from your email.');
      return;
    }
    
    // If the status is already provided (from the redirect), use it
    if (status) {
      console.log('Verification status from redirect:', status);
      if (status === 'success') {
        setVerified(true);
        setLoading(false);
        
        // Automatically navigate to login after 3 seconds
        setTimeout(() => {
          navigation.navigate('Login', { verified: 'true' });
        }, 3000);
        return;
      } else if (status === 'failed' || status === 'error') {
        setError(route.params.message || 'Verification failed. The link may be invalid or expired.');
        setLoading(false);
        return;
      }
    }
    
    // If no status provided, verify directly
    const verifyEmail = async () => {
      try {
        console.log('Verifying email with token:', token);
        
        // Use the deployed URL from config.js
        console.log('Using API URL for verification:', API_URL);
        
        const response = await axios.get(`${API_URL}/auth/verify-email`, {
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
    
    if (token && email) {
      verifyEmail();
    } else {
      setLoading(false);
      setError('Missing verification information. Please check your email link.');
    }
  }, [token, email, navigation, status, route.params]);
  
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
          <TouchableOpacity style={styles.button} onPress={goToLogin}>
            <Text style={styles.buttonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.messageContainer}>
          <Text style={styles.title}>Verification Failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          
          {token && email && (
            <TouchableOpacity style={styles.button} onPress={openInBrowser}>
              <Text style={styles.buttonText}>Try in Browser</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={goToLogin}>
            <Text style={styles.buttonText}>Back to Login</Text>
          </TouchableOpacity>
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
    width: '100%',
    maxWidth: 400,
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
    marginBottom: 20,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    color: 'red',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#6A4BFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 5,
    marginVertical: 10,
    width: '80%',
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#8F8F8F',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});