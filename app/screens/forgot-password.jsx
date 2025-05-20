import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  KeyboardAvoidingView, 
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Keyboard
} from 'react-native';
import { useRouter } from 'expo-router';
import { getApiUrl } from '../utils';
import CustomTextInput from '../components/CustomTextInput';

// Get the appropriate API URL based on the environment
const API_URLS = getApiUrl();

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();

  // Log the API URL when component mounts
  useEffect(() => {
    console.log('API URLs available:', API_URLS);
    console.log('Current working API URL:', global.workingApiUrl || API_URLS[0]);
  }, []);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Validate email
      if (!email) {
        setError('Please enter your email address');
        setLoading(false);
        return;
      }

      if (!email.includes('@')) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }
      
      // Use the working URL if available, otherwise try all URLs
      const apiUrl = global.workingApiUrl || API_URLS[0];
      console.log('Attempting to use API URL:', apiUrl);
      
      // Create an abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        setError('Request timed out. Server might be unavailable.');
        setLoading(false);
      }, 15000);
      
      let response;
      try {
        response = await fetch(`${apiUrl}/auth/forgot-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
          signal: controller.signal
        });
        
        // Clear the timeout since we got a response
        clearTimeout(timeoutId);
        
        // Debug logging
        console.log('Forgot password response status:', response.status);
        console.log('Content type:', response.headers.get('content-type'));
        
        // Check if response might be HTML instead of JSON
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('text/html')) {
          console.error('Server returned HTML instead of JSON');
          setError('Server error. Please try again later.');
          setLoading(false);
          return;
        }
        
        try {
          const data = await response.json();
          
          if (!response.ok) {
            throw new Error(data.message || 'An error occurred. Please try again.');
          }
          
          // Show success message
          setEmailSent(true);
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
          setError('Error processing server response. Please try again.');
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('Fetch error:', fetchError);
        
        // Try alternative API URLs if available
        if (API_URLS.length > 1) {
          for (let i = 1; i < API_URLS.length; i++) {
            if (API_URLS[i] === apiUrl) continue; // Skip the one we already tried
            
            try {
              console.log('Trying alternative API URL:', API_URLS[i]);
              const altResponse = await fetch(`${API_URLS[i]}/auth/forgot-password`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
              });
              
              if (altResponse.ok) {
                const data = await altResponse.json();
                // Update the working URL for future requests
                global.workingApiUrl = API_URLS[i];
                setEmailSent(true);
                return;
              }
            } catch (altError) {
              console.error('Alternative API URL failed:', altError);
            }
          }
        }
        
        setError('Network error. Please check your connection and try again.');
      }
    } catch (error) {
      console.error('General error:', error);
      setError('An unexpected error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
        <View style={styles.contentContainer} onStartShouldSetResponder={() => false}>
          {!emailSent ? (
            <>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your email address and we'll send you a link to reset your password
              </Text>
              
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              
              <View style={styles.inputContainer}>
                <CustomTextInput
                  style={styles.input}
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={styles.button} 
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Send Reset Link</Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.backButton} 
                  onPress={goBack}
                  disabled={loading}
                >
                  <Text style={styles.backButtonText}>Back to Login</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.successContainer}>
              <Text style={styles.title}>Email Sent</Text>
              <Text style={styles.subtitle}>
                If an account exists with the email {email}, you will receive a password reset link shortly.
              </Text>
              <Text style={styles.instructions}>
                Please check your email and follow the instructions to reset your password.
              </Text>
              
              <TouchableOpacity 
                style={[styles.button, styles.backToLoginButton]} 
                onPress={goBack}
              >
                <Text style={styles.buttonText}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          )}
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
    marginBottom: 20,
    color: '#666',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 30,
    textAlign: 'center',
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
  backButton: {
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  errorText: {
    color: 'red',
    marginBottom: 20,
    textAlign: 'center',
  },
  successContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  instructions: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  backToLoginButton: {
    marginTop: 20,
  },
}); 