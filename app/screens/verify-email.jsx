// VerifyEmail.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRoute } from '@react-navigation/native';
import axios from 'axios';
import { API_URL } from '@/config';
import Colors from '@/constants/Colors';
import { FontAwesome } from '@expo/vector-icons';

export default function VerifyEmail({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  
  const route = useRoute();
  const { token } = route.params;
  
  useEffect(() => {
    const verifyEmail = async () => {
      try {
        console.log(`Verifying email with token: ${token.substring(0, 10)}...`);
        await axios.get(`${API_URL}/auth/verify-email?token=${token}`);
        setVerified(true);
        setLoading(false);
        
        // Add a longer delay before redirecting to ensure users see the success message
        setTimeout(() => {
          navigation.navigate('Login', { verified: 'true' });
        }, 5000); // Increased from 3 to 5 seconds
      } catch (error) {
        setLoading(false);
        console.error('Verification error:', error.response?.data || error.message);
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
        <ActivityIndicator size="large" color={Colors.primary} />
      ) : verified ? (
        <View style={styles.successContainer}>
          <FontAwesome name="check-circle" size={80} color={Colors.success} style={styles.successIcon} />
          <Text style={styles.title}>Email Verified!</Text>
          <Text style={styles.message}>Your email has been successfully verified. Redirecting to login in 5 seconds...</Text>
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
    backgroundColor: Colors.background,
  },
  messageContainer: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 10,
    backgroundColor: Colors.card,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: Colors.text,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    color: Colors.lightText,
    lineHeight: 22,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    color: Colors.error,
    lineHeight: 22,
  },
  successContainer: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 10,
    backgroundColor: Colors.card,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  successIcon: {
    marginBottom: 20,
  },
});