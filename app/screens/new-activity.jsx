import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function NewActivityScreen() {
  const router = useRouter();
  const [activityType, setActivityType] = useState('Physical');
  const [name, setName] = useState('');
  // Description is not part of the backend Activity model, removing.
  // const [description, setDescription] = useState(''); 
  const [duration, setDuration] = useState('');
  const [currentTeamId, setCurrentTeamId] = useState(null);
  const [userToken, setUserToken] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        setUserToken(token);
        const teamDataString = await AsyncStorage.getItem('userTeam');
        if (teamDataString) {
          const teamData = JSON.parse(teamDataString);
          // Assuming teamData has an 'id' or '_id' field. Backend returns 'id' in response for team creation.
          // And teamService.getTeamById likely returns an object with 'id' or '_id'.
          // The createActivity on backend expects teamId as ObjectId string.
          setCurrentTeamId(teamData.id || teamData._id); 
        }
      } catch (e) {
        console.error("Failed to load data from storage", e);
        Alert.alert("Error", "Could not load necessary data. Please try logging in again.");
        router.replace('/screens/login');
      }
    };
    loadData();
  }, []);

  const handleSubmit = async () => {
    if (!name || !duration) { // Removed description from check
      Alert.alert('Error', 'Please fill in activity name and duration');
      return;
    }
    if (!userToken) {
      Alert.alert('Error', 'Authentication token not found. Please log in.');
      return;
    }

    const apiUrl = global.workingApiUrl || 'http://localhost:5001/api';
    const activityPayload = {
      type: activityType,
      name,
      duration: parseInt(duration),
    };

    if ((activityType === 'Physical' || activityType === 'Mental') && currentTeamId) {
      activityPayload.teamId = currentTeamId;
    } else if ((activityType === 'Physical' || activityType === 'Mental') && !currentTeamId) {
      // Optional: Alert user or prevent submission if teamId is crucial for these types
      console.warn("Attempting to log Physical/Mental activity without a teamId. Weekly limits might not apply correctly.");
      // Alert.alert("Info", "Physical or Mental activities are best logged when associated with a team for weekly tracking.");
    }

    try {
      const response = await fetch(`${apiUrl}/homepage/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify(activityPayload)
      });

      const responseData = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Activity created successfully!');
        router.back();
      } else {
        // Specific handling for 403 (limit reached) or other errors
        Alert.alert('Error', responseData.message || 'Failed to create activity');
      }
    } catch (error) {
      console.error('Error creating activity:', error);
      Alert.alert('Error', 'An unexpected error occurred. Failed to create activity.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>New Activity</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Activity Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={activityType}
              onValueChange={(value) => setActivityType(value)}
              style={styles.picker}
            >
              <Picker.Item label="Physical" value="Physical" />
              <Picker.Item label="Mental" value="Mental" />
              <Picker.Item label="Bonus" value="Bonus" />
            </Picker>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter activity name"
            placeholderTextColor="#999"
          />
        </View>

        {/* Description field removed as it's not in the backend model */}
        {/* 
        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter activity description"
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View> 
        */}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Duration (minutes)</Text>
          <TextInput
            style={styles.input}
            value={duration}
            onChangeText={setDuration}
            placeholder="Enter duration in minutes"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Create Activity</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  picker: {
    height: 50,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
