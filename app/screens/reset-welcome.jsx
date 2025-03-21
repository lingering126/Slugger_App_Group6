import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome } from '@expo/vector-icons';

export default function ResetWelcomeScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Function to reset welcome status
  const resetWelcomeStatus = async () => {
    try {
      setLoading(true);
      
      // Remove the welcomeCompleted flag from AsyncStorage
      await AsyncStorage.removeItem('welcomeCompleted');
      
      Alert.alert(
        'Success',
        'Welcome status has been reset. Next time you log in, you will see the welcome page.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Log out the user by removing token and user data
              AsyncStorage.removeItem('token');
              AsyncStorage.removeItem('user');
              
              // Navigate back to login screen
              router.replace('/screens/login');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error resetting welcome status:', error);
      Alert.alert(
        'Error',
        'Failed to reset welcome status. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Function to go back
  const goBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <FontAwesome name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Reset Welcome Page</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.description}>
          This utility allows you to reset the welcome page status for testing purposes.
          After resetting, you will be logged out and the next time you log in, you will see the welcome page again.
        </Text>
        
        <View style={styles.warningContainer}>
          <FontAwesome name="exclamation-triangle" size={24} color="#FFA000" style={styles.warningIcon} />
          <Text style={styles.warningText}>
            This is for testing purposes only. You will be logged out after resetting.
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.resetButton} 
          onPress={resetWelcomeStatus}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <FontAwesome name="refresh" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Reset Welcome Status & Logout</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    padding: 15,
    borderRadius: 10,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#FFECB3',
  },
  warningIcon: {
    marginRight: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#5D4037',
  },
  resetButton: {
    flexDirection: 'row',
    backgroundColor: '#FF5722',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 