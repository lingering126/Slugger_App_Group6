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

export default function CreateGroupScreen() {
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [targetName, setTargetName] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      if (Platform.OS === 'web') {
        alert('Please enter a group name'); 
      } else {
        Alert.alert('Error', 'Please enter a group name');
      }
      return;
    }

    setLoading(true);

    try {
      // 从 AsyncStorage 获取 token
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // 获取服务器 API URL
      const apiUrl = global.workingApiUrl || 'http://localhost:5001/api';
      
      const response = await fetch(`${apiUrl}/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: groupName,
          description: groupDescription,
          targetName,
          targetValue
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create group');
      }

      setLoading(false);
      if (Platform.OS === 'web') {
        alert(`Group "${groupName}" created successfully!`); 
        router.replace('/screens/(tabs)/home');
      } else {
        Alert.alert(
          'Success',
          `Group "${groupName}" created successfully!`,
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
        alert(error.message || 'Failed to create group. Please try again.'); 
      } else {
        Alert.alert('Error', error.message || 'Failed to create group. Please try again.');
      }
      console.error('Error creating group:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>Create a New Team</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Team Name *</Text>
            <TextInput
              style={styles.input}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Enter a name for your team"
              maxLength={30}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Team Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={groupDescription}
              onChangeText={setGroupDescription}
              placeholder="Describe your team's purpose or goals"
              multiline
              numberOfLines={4}
              maxLength={200}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Initial Target Name</Text>
            <TextInput
              style={styles.input}
              value={targetName}
              onChangeText={setTargetName}
              placeholder="e.g., Weekly Steps, Exercise Minutes"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Initial Target Value</Text>
            <TextInput
              style={styles.input}
              value={targetValue}
              onChangeText={setTargetValue}
              placeholder="e.g., 100,000, 500"
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleCreateGroup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Create Team</Text>
            )}
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#0E5E6F',
  },
  formGroup: {
    marginBottom: 20,
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
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
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