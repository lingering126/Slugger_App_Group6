import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { getApiUrl, checkServerConnection } from '../utils';
import { FontAwesome } from '@expo/vector-icons';

// Get the appropriate API URL based on the environment
const API_URLS = getApiUrl();
let WORKING_URL = null;

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const router = useRouter();

  // Check if the server is reachable
  useEffect(() => {
    const checkServer = async () => {
      try {
        console.log('Checking server connection...');
        
        // Use the utility function to check server connection
        const connectionStatus = await checkServerConnection(API_URLS);
        console.log('Server connection status:', connectionStatus);
        
        if (connectionStatus.status === 'online') {
          setServerStatus('online');
          // If we got a working URL back, use it
          if (connectionStatus.url) {
            console.log('Using working API URL:', connectionStatus.url);
            WORKING_URL = connectionStatus.url;
          }
        } else {
          setServerStatus('offline');
          setError(connectionStatus.message);
        }
      } catch (error) {
        console.error('Server check failed:', error.message);
        setServerStatus('offline');
        setError('Cannot connect to server. Please check your network connection and server status.');
      }
    };
    
    checkServer();
  }, []);

  const handleSignup = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Validate inputs
      if (!email || !password || !confirmPassword) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }
      
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      
      // Simple email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }
      
      // Password strength validation
      if (password.length < 6) {
        setError('Password must be at least 6 characters long');
        setLoading(false);
        return;
      }
      
      // Check if password contains at least one letter (can't be all numbers)
      if (!/[a-zA-Z]/.test(password)) {
        setError('Password must contain at least one letter');
        setLoading(false);
        return;
      }
      
      // Use the working URL if available, otherwise try all URLs
      const apiUrl = WORKING_URL || global.workingApiUrl || API_URLS[0];
      console.log('Attempting signup with:', email);
      console.log('Using API URL:', apiUrl);
      
      // Create an abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('Signup request timed out after 15 seconds');
        setError('Request timed out. Server might be unavailable.');
        setLoading(false);
      }, 15000);
      
      try {
        const response = await fetch(`${apiUrl}/auth/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            password
          }),
          signal: controller.signal
        });
        
        // Clear the timeout since we got a response
        clearTimeout(timeoutId);
        
        console.log('Signup response status:', response.status);
        
        const data = await response.json();
        
        if (!response.ok) {
          console.log('Signup error data:', data);
          setError(data.message || 'Signup failed');
          setLoading(false);
          return;
        }
        
        console.log('Signup successful');
        setVerificationEmail(email);
        setSignupSuccess(true);
        setLoading(false);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.log('Signup error:', error.message);
      setLoading(false);
      
      if (error.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
        setError('Network error. Please check your connection and try again.');
        // Try to find another working URL
        const connectionStatus = await checkServerConnection(API_URLS);
        if (connectionStatus.status === 'online' && connectionStatus.url) {
          WORKING_URL = connectionStatus.url;
          setError('Found a new server connection. Please try again.');
        } else {
          setServerStatus('offline');
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      
      console.log('Error details:', error);
    }
  };

  const navigateToLogin = () => {
    // Use replace instead of push to avoid animation
    router.replace('/screens/login');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // If signup was successful, show verification instructions
  if (signupSuccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Email Verification Required</Text>
          
          <View style={styles.verificationContainer}>
            <Text style={styles.verificationText}>
              Thank you for signing up! We've sent a verification link to:
            </Text>
            
            <Text style={styles.emailText}>{verificationEmail}</Text>
            
            <Text style={styles.verificationText}>
              Please check your inbox and click the verification link to complete the signup process.
            </Text>
            
            <Text style={styles.verificationText}>
              Once verified, you'll be able to log in to your account.
            </Text>
            
            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={navigateToLogin}
            >
              <Text style={styles.loginButtonText}>Go to Login</Text>
            </TouchableOpacity>
          </View>
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
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Create your account</Text>
          
          {serverStatus === 'offline' && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          {error && serverStatus !== 'offline' && (
            <Text style={styles.errorText}>{error}</Text>
          )}
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
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
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={handleSignup}
              disabled={loading || serverStatus === 'offline'}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign up</Text>
              )}
            </TouchableOpacity>
            
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={navigateToLogin}>
                <Text style={styles.loginLink}>Log in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    marginBottom: 40,
    color: '#666',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 30,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 25,
    marginBottom: 15,
    paddingHorizontal: 20,
    fontSize: 16,
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
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#6c63ff',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginText: {
    fontSize: 16,
    color: '#666',
  },
  loginLink: {
    fontSize: 16,
    color: '#6c63ff',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center'
  },
  errorContainer: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#ffebee',
    borderRadius: 5,
  },
  verificationContainer: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  verificationText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  emailText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6c63ff',
    marginBottom: 15,
  },
  loginButton: {
    backgroundColor: '#6c63ff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 