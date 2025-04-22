import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function JoinGroupScreen() {
  // State to store the group code entered by the user
  const [groupCode, setGroupCode] = useState('');
  // State to manage the loading indicator
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Function to handle joining a group
  const handleJoinGroup = async () => {
    // Validate that the group code is not empty
    if (!groupCode.trim()) {
      if (Platform.OS === 'web') {
        alert('Please enter a group code');
      } else {
        Alert.alert('Error', 'Please enter a group code');
      }
      return;
    }

    setLoading(true);

    try {
      // Retrieve the authentication token from local storage
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Define the API endpoint
      const apiUrl = global.workingApiUrl || 'http://localhost:5001/api';
      
      // Send a POST request to join the group
      const response = await fetch(`${apiUrl}/groups/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          groupId: groupCode
        })
      });

      const data = await response.json();
      
      // Check if the response is successful
      if (!response.ok) {
        throw new Error(data.message || 'Failed to join group');
      }

      setLoading(false);
      if (Platform.OS === 'web') {
        alert(`Successfully joined group "${data.name}"!`);
        router.replace('/screens/(tabs)/home'); // Navigate to the home screen
      } else {
        Alert.alert(
          'Success',
          `Successfully joined group "${data.name}"!`,
          [
            {
              text: 'OK',
              onPress: () => router.replace('/screens/(tabs)/home'),
            },
          ]
        );
      }
    } catch (error) {
      setLoading(false);
      if (Platform.OS === 'web') {
        alert(error.message || 'Failed to join group. Please try again.');
      } else {
        Alert.alert('Error', error.message || 'Failed to join group. Please try again.');
      }
      console.error('Error joining group:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>Join a Group</Text>

          {/* Input field for the group code */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Group Code *</Text>
            <TextInput
              style={styles.input}
              value={groupCode}
              onChangeText={setGroupCode}
              placeholder="Enter the group code"
              maxLength={10}
            />
          </View>

          {/* Button to join the group */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleJoinGroup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Join Group</Text>
            )}
          </TouchableOpacity>

          {/* Button to cancel and go back */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.replace('/screens/welcome')}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F8',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#0E5E6F',
  },
  formGroup: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
    color: '#0E5E6F',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    textAlign: 'center',
    letterSpacing: 2,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#F5F5F8',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#0E5E6F',
  },
  cancelButtonText: {
    color: '#0E5E6F',
    fontSize: 16,
    fontWeight: 'bold',
  },
});