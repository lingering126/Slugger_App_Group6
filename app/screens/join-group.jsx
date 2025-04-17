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
  const [groupCode, setGroupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleJoinGroup = async () => {
    if (!groupCode.trim()) {
      Alert.alert('Error', 'Please enter a group code');
      return;
    }

    setLoading(true);

    try {
      // In a real app, we would make an API call to validate the group code
      // For now, just simulate a delay and navigate to home
      setTimeout(() => {
        setLoading(false);
        
        // For testing, let's accept any 6-character code
        if (groupCode.length >= 6) {
          Alert.alert(
            'Success', 
            `You have joined the group successfully!`,
            [
              { 
                text: 'OK', 
                onPress: () => router.replace('/screens/(tabs)/home') 
              }
            ]
          );
        } else {
          Alert.alert('Error', 'Invalid group code. Please try again.');
        }
      }, 1500);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to join group. Please try again.');
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
          <Text style={styles.title}>Join an Existing Team</Text>
          
          <Text style={styles.description}>
            Enter the team code provided by the team administrator to join their Slugger team.
          </Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Team Code *</Text>
            <TextInput
              style={styles.input}
              value={groupCode}
              onChangeText={setGroupCode}
              placeholder="Enter 6-digit team code"
              maxLength={10}
              autoCapitalize="characters"
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleJoinGroup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Join Team</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createGroupButton}
            onPress={() => router.replace('/screens/create-group')}
          >
            <Text style={styles.createGroupButtonText}>Create a New Team Instead</Text>
          </TouchableOpacity>

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
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
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
  createGroupButton: {
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  createGroupButtonText: {
    color: '#0E5E6F',
    fontSize: 16,
    textDecorationLine: 'underline',
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