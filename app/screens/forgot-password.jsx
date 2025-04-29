import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import API_CONFIG from '../config/api';
import { getApiUrl, checkServerConnection } from '../_utils';

// Get the appropriate API URL based on the environment
const API_URLS = getApiUrl();
let WORKING_URL = null; // Cache for the first successfully connected URL

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [serverStatus, setServerStatus] = useState('online');
  const router = useRouter();

  const handleRequestReset = async () => {
    // Reset any previous errors
    setError('');
    
    // Validate email
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    Keyboard.dismiss();

    try {
      // Use the working URL if available, otherwise try the first API URL
      const apiUrl = WORKING_URL || global.workingApiUrl || API_URLS[0];
      
      const response = await axios.post(
        `${apiUrl}${API_CONFIG.ENDPOINTS.AUTH.FORGOT_PASSWORD}`,
        { email },
        { timeout: 10000 } // 10 second timeout
      );

      setSuccess(true);
    } catch (error) {
      console.log('Error requesting password reset:', error);
      
      // Check for specific error types
      if (error.code === 'ECONNABORTED') {
        setError('Request timed out. Server might be unavailable.');
        setServerStatus('offline');
      } else if (error.response) {
        // The server responded with a status code outside the 2xx range
        if (error.response.status === 404) {
          // Still show success screen for security (don't reveal if email exists)
          setSuccess(true);
        } else if (error.response.status === 429) {
          setError('Too many requests. Please try again later.');
        } else {
          setError('Failed to send reset email. Please try again later.');
        }
      } else if (error.request) {
        // No response received
        setError('No response from server. Please check your connection.');
        setServerStatus('offline');
        
        // Try to find a new server connection
        try {
          const connectionStatus = await checkServerConnection(API_URLS);
          if (connectionStatus.status === 'online' && connectionStatus.url) {
            WORKING_URL = connectionStatus.url;
            setServerStatus('online');
            setError('Found a new server connection. Please try again.');
          }
        } catch (e) {
          console.log('Error checking server connection:', e);
        }
      } else {
        // For security reasons, don't show specifics about what went wrong
        setSuccess(true); // Show success even on error for security purposes
      }
    } finally {
      setLoading(false);
    }
  };

  const navigateToLogin = () => {
    router.push('/screens/login');
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.contentContainer}>
          <MaterialIcons name="email" size={60} color="#6c63ff" />
          
          <Text style={styles.title}>Check Your Email</Text>
          
          <Text style={styles.instructionText}>
            If an account exists with the email {email}, we've sent instructions to reset your password.
          </Text>
          
          <Text style={styles.noteText}>
            Please check your inbox and spam folders. The reset link will expire in 1 hour.
          </Text>
          
          <TouchableOpacity style={styles.button} onPress={navigateToLogin}>
            <Text style={styles.buttonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          style={styles.contentContainer} 
          onPress={Keyboard.dismiss}
        >
          <TouchableOpacity style={styles.backButton} onPress={navigateToLogin}>
            <MaterialIcons name="arrow-back" size={24} color="#6c63ff" />
          </TouchableOpacity>
          
          <Text style={styles.title}>Forgot Password</Text>
          
          <Text style={styles.instructionText}>
            Enter your email address and we'll send you instructions to reset your password.
          </Text>
          
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          
          {serverStatus === 'offline' && (
            <TouchableOpacity 
              style={styles.testButton} 
              onPress={() => router.push('/screens/connection-test')}
            >
              <Text style={styles.testButtonText}>Run Connection Test</Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCompleteType="email"
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.button, serverStatus === 'offline' ? styles.disabledButton : null]} 
            onPress={handleRequestReset}
            disabled={loading || serverStatus === 'offline'}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Reset Password</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity onPress={navigateToLogin}>
            <Text style={styles.loginLink}>Back to Login</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  noteText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    width: '100%',
  },
  button: {
    backgroundColor: '#6c63ff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  disabledButton: {
    backgroundColor: '#b5b1e5',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginLink: {
    color: '#6c63ff',
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    width: '100%',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
  },
  testButton: {
    backgroundColor: '#6c63ff',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 