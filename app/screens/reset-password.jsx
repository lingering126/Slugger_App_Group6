import React, { useState, useEffect } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import axios from 'axios';
import API_CONFIG from '../config/api';
import { getApiUrl } from '../_utils';

// Get the appropriate API URL based on the environment
const API_URLS = getApiUrl();
let WORKING_URL = null; // Cache for the first successfully connected URL

export default function ResetPasswordScreen() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const router = useRouter();
  const params = useLocalSearchParams();
  const { token, email } = params;
  
  useEffect(() => {
    if (!token || !email) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [token, email]);

  const handleResetPassword = async () => {
    // Reset any previous errors
    setError('');
    
    // Validate password
    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    Keyboard.dismiss();

    try {
      // Use the working URL if available, otherwise try the first API URL
      const apiUrl = WORKING_URL || global.workingApiUrl || API_URLS[0];
      
      const response = await axios.post(
        `${apiUrl}${API_CONFIG.ENDPOINTS.AUTH.RESET_PASSWORD}`,
        { 
          token,
          newPassword
        },
        { timeout: 10000 } // 10 second timeout
      );

      setSuccess(true);
    } catch (error) {
      console.log('Error resetting password:', error);
      
      // Check for specific error types
      if (error.code === 'ECONNABORTED') {
        setError('Request timed out. Server might be unavailable.');
      } else if (error.response) {
        // The server responded with a status code outside the 2xx range
        if (error.response.status === 400) {
          setError('Invalid or expired reset token. Please request a new password reset.');
        } else {
          setError(error.response.data.message || 'Failed to reset password. Please try again.');
        }
      } else if (error.request) {
        // No response received
        setError('No response from server. Please check your connection.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const navigateToLogin = () => {
    router.push('/screens/login');
  };
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.contentContainer}>
          <MaterialIcons name="check-circle" size={60} color="#4CAF50" />
          
          <Text style={styles.title}>Password Reset Successful</Text>
          
          <Text style={styles.instructionText}>
            Your password has been successfully reset. You can now log in with your new password.
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
          
          <Text style={styles.title}>Reset Password</Text>
          
          <Text style={styles.instructionText}>
            Enter your new password below. 
            Make sure it's at least 8 characters long and contains letters and numbers.
          </Text>
          
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          
          <View style={styles.inputContainer}>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={togglePasswordVisibility}
              >
                <FontAwesome 
                  name={showPassword ? 'eye' : 'eye-slash'} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={toggleConfirmPasswordVisibility}
              >
                <FontAwesome 
                  name={showConfirmPassword ? 'eye' : 'eye-slash'} 
                  size={20} 
                  color="#666" 
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleResetPassword}
            disabled={loading || !token || !email}
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
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 25,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 20,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 10,
    marginRight: 5,
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
}); 