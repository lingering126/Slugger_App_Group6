import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { getApiUrl, checkServerConnection } from '../utils';
import { FontAwesome } from '@expo/vector-icons';
import platformHelpers from '../utils/platformHelpers';

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

  // Web-specific fixes for input focus and cursor issues
  useEffect(() => {
    if (platformHelpers.isWeb) {
      // Create a style element to add CSS rules for proper cursor behavior
      const style = document.createElement('style');
      style.textContent = `
        /* Global reset for inputs */
        input, textarea {
          box-sizing: border-box !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        /* Make single inputs look good */
        .form-input {
          display: block !important;
          width: 100% !important;
          height: 50px !important; 
          padding: 0 20px !important;
          margin-bottom: 15px !important;
          border: 1px solid #ddd !important;
          border-radius: 25px !important;
          font-size: 16px !important;
          color: #000 !important;
          background-color: #fff !important;
          box-shadow: none !important;
          cursor: text !important;
          outline: none !important;
        }
        
        /* Fix password container */
        .password-container {
          display: flex !important;
          align-items: center !important;
          width: 100% !important;
          height: 50px !important;
          margin-bottom: 15px !important;
          padding: 0 !important;
          border: 1px solid #ddd !important;
          border-radius: 25px !important;
          background-color: #fff !important;
          position: relative !important;
        }
        
        /* Password input inside container */
        .password-input {
          flex: 1 !important;
          height: 100% !important;
          padding: 0 50px 0 20px !important;
          border: none !important;
          background: transparent !important;
          font-size: 16px !important;
          color: #000 !important;
          outline: none !important;
        }
        
        /* Eye icon - IMPORTANT STYLES */
        .eye-icon {
          position: absolute !important;
          right: 0 !important;
          top: 0 !important;
          width: 50px !important;
          height: 50px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: transparent !important;
          border: none !important;
          cursor: pointer !important;
          z-index: 10 !important;
          pointer-events: auto !important;
        }
        
        /* More direct eye icon target */
        .password-container > [role="button"],
        .passwordContainer > [role="button"] {
          position: absolute !important;
          right: 0 !important;
          top: 0 !important;
          width: 50px !important;
          height: 50px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: transparent !important;
          z-index: 10 !important;
        }
        
        /* Fix placeholder color */
        ::placeholder {
          color: #bbbbbb !important;
          opacity: 1 !important;
        }

        /* Fix for double inputs in React Native Web */
        input[type="email"], input[type="text"], input[type="password"] {
          display: block !important;
          opacity: 1 !important;
          position: static !important;
        }

        /* Even more specific eye icon targeting */
        [data-testid="password-toggle-button"],
        button svg,
        div[role="button"] svg,
        .eye-icon svg,
        .eye-icon-btn svg,
        svg[class*="FontAwesome"],
        .passwordContainer svg {
          position: absolute !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          color: #666 !important;
          z-index: 20 !important;
          pointer-events: none !important;
          width: 20px !important;
          height: 20px !important;
        }
      `;
      document.head.appendChild(style);
      
      // Function to apply our custom styling
      const applyCustomStyling = () => {
        // Clean up any mess that might have been caused by multiple renders
        document.querySelectorAll('input').forEach(input => {
          // Make sure siblings are properly stacked
          const parent = input.parentElement;
          if (parent) {
            Array.from(parent.children).forEach(child => {
              if (child !== input && child.tagName === 'INPUT') {
                child.style.display = 'none';
              }
            });
          }
        });
        
        // Single inputs (like email)
        const singleInputs = document.querySelectorAll('input[type="email"], input[type="text"]');
        singleInputs.forEach(input => {
          input.classList.add('form-input');
        });
        
        // Password containers - more forceful approach
        const passwordContainers = document.querySelectorAll('.passwordContainer');
        passwordContainers.forEach(container => {
          container.classList.add('password-container');
          
          // Find password input inside container
          const input = container.querySelector('input');
          if (input) {
            input.classList.add('password-input');
            input.style.paddingRight = '50px';
          }
          
          // Direct eye icon handling - MORE RELIABLE APPROACH
          const eyeIconElements = container.querySelectorAll('[role="button"], div[role="button"], button');
          eyeIconElements.forEach(icon => {
            icon.className = 'eye-icon'; // Replace any classes
            icon.style.position = 'absolute';
            icon.style.right = '0';
            icon.style.top = '0';
            icon.style.width = '50px';
            icon.style.height = '50px';
            icon.style.display = 'flex';
            icon.style.alignItems = 'center';
            icon.style.justifyContent = 'center';
            icon.style.background = 'transparent';
            icon.style.zIndex = '10'; 
            icon.style.cursor = 'pointer';
            icon.style.border = 'none';
          });
        });
      };
      
      // Apply initially with a delay to ensure DOM is ready
      setTimeout(applyCustomStyling, 100);
      
      // And set up a bigger delay for any race conditions
      setTimeout(applyCustomStyling, 500);
      
      // Run it on resize/orientation change
      window.addEventListener('resize', applyCustomStyling);
      
      // Apply on window load as well
      window.addEventListener('load', applyCustomStyling);
      
      // Clean up
      return () => {
        window.removeEventListener('load', applyCustomStyling);
        window.removeEventListener('resize', applyCustomStyling);
      };
    }
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
    // Prevent multiple rapid taps
    if (loading) return;
    
    setLoading(true);
    
    // Dismiss keyboard first to prevent UI issues
    Keyboard.dismiss();
    
    // Add a delay after keyboard dismissal to ensure UI stability
    setTimeout(() => {
      // Use push with fade animation
      router.push('/screens/login');
      
      // Reset loading state after navigation completes
      setTimeout(() => {
        setLoading(false);
      }, 300);
    }, 300);
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
        <TouchableOpacity 
          activeOpacity={1} 
          style={styles.contentContainer} 
          onPress={Keyboard.dismiss}
        >
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
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <TouchableOpacity 
          activeOpacity={1} 
          style={styles.contentContainer} 
          onPress={Keyboard.dismiss}
        >
          <Text style={[styles.title, { className: 'formTitle' }]}>Create your account</Text>
          
          {serverStatus === 'offline' && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
          
          {error && serverStatus !== 'offline' && (
            <Text style={styles.errorText}>{error}</Text>
          )}
          
          <View style={[styles.inputContainer, { className: 'formContainer' }]}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              {...platformHelpers.isWeb && { type: "email" }}
              {...platformHelpers.getInputProps()}
            />
            
            <View style={[styles.passwordContainer, { className: 'passwordContainer' }]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                {...platformHelpers.isWeb && { type: showPassword ? "text" : "password" }}
                {...platformHelpers.getInputProps()}
              />
              <TouchableOpacity 
                style={styles.eyeIcon}
                onPress={togglePasswordVisibility}
                {...platformHelpers.getTouchableProps()}
                {...platformHelpers.isWeb && { 
                  role: "button", 
                  ariaLabel: "Toggle password visibility",
                  className: "eye-icon-btn"
                }}
              >
                <FontAwesome 
                  name={showPassword ? 'eye' : 'eye-slash'} 
                  size={20} 
                  color="#666"
                  style={platformHelpers.isWeb ? {
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                  } : undefined}
                />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.passwordContainer, { className: 'passwordContainer' }]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                {...platformHelpers.isWeb && { type: showConfirmPassword ? "text" : "password" }}
                {...platformHelpers.getInputProps()}
              />
              <TouchableOpacity 
                style={styles.eyeIcon}
                onPress={toggleConfirmPasswordVisibility}
                {...platformHelpers.getTouchableProps()}
                {...platformHelpers.isWeb && { 
                  role: "button", 
                  ariaLabel: "Toggle password visibility",
                  className: "eye-icon-btn"
                }}
              >
                <FontAwesome 
                  name={showConfirmPassword ? 'eye' : 'eye-slash'} 
                  size={20} 
                  color="#666"
                  style={platformHelpers.isWeb ? {
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                  } : undefined}
                />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.buttonContainer}>
            {platformHelpers.isWeb ? (
              <button 
                onClick={handleSignup}
                disabled={loading || serverStatus === 'offline'}
                className="signup-button"
                style={{
                  width: '100%',
                  height: 50,
                  backgroundColor: '#6c63ff',
                  borderRadius: 25,
                  border: 'none',
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: 18,
                  fontWeight: 600,
                  marginBottom: 20,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  outline: 'none',
                  position: 'relative',
                  zIndex: 1
                }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  "Sign up"
                )}
              </button>
            ) : (
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
            )}
            
            <View style={[styles.loginContainer, { className: 'linkContainer' }]}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={navigateToLogin}>
                <Text style={styles.loginLink}>Log in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    ...(platformHelpers.isWeb && {
      maxWidth: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    }),
  },
  keyboardAvoidingView: {
    flex: 1,
    ...(platformHelpers.isWeb && {
      maxWidth: 450,
      width: '100%',
    }),
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    ...(platformHelpers.isWeb && {
      width: '100%',
      maxWidth: 450,
      padding: 40,
      boxShadow: 'none',
      borderRadius: 0,
      backgroundColor: '#fff',
    }),
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    marginBottom: 40,
    color: '#666',
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 30,
    ...(platformHelpers.isWeb && {
      maxWidth: 400,
    }),
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
    backgroundColor: '#fff',
    ...(platformHelpers.isWeb && {
      display: 'block',
      position: 'static',
      zIndex: 'auto'
    })
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
    ...(platformHelpers.isWeb && {
      display: 'flex',
      position: 'relative',
      zIndex: 'auto',
      overflow: 'visible'
    })
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 20,
    fontSize: 16,
    ...(platformHelpers.isWeb && {
      display: 'block',
      position: 'static',
      zIndex: 'auto',
      backgroundColor: 'transparent',
      border: 'none'
    })
  },
  eyeIcon: {
    padding: 10,
    marginRight: 5,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    ...(platformHelpers.isWeb && {
      maxWidth: 400,
    }),
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