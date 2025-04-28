import React, { useState, useEffect } from 'react';
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
import { Dropdown } from 'react-native-element-dropdown';

export default function CreateGroupScreen() {
  // State variables to store user input and app state
  const [groupName, setGroupName] = useState(''); // Group name entered by the user
  const [groupDescription, setGroupDescription] = useState(''); // Group description entered by the user
  const [targetName, setTargetName] = useState(''); // Selected target category
  const [targetMentalValue, setTargetMentalValue] = useState(0); // Mental target value
  const [targetPhysicalValue, setTargetPhysicalValue] = useState(0); // Physical target value
  const [targetValue, setTargetValue] = useState(0); // Total target value (mental + physical)
  const [dailyLimitPhysical, setDailyLimitPhysical] = useState(7); // Daily physical limit
  const [dailyLimitMental, setDailyLimitMental] = useState(7); // Daily mental limit
  const [loading, setLoading] = useState(false); // Loading state for the "Create Team" button
  const router = useRouter(); // Router for navigation

  // 定义下拉菜单数据
  const targetData = [
    { label: 'Select a category', value: '' },
    { label: 'Target 1', value: 'Target 1' },
    { label: 'Target 2', value: 'Target 2' },
    { label: 'Target 3', value: 'Target 3' },
    { label: 'Target 4', value: 'Target 4' },
    { label: 'Target 5', value: 'Target 5' },
    { label: 'Target 6', value: 'Target 6' },
    { label: 'Target 7', value: 'Target 7' },
    { label: 'Target 8', value: 'Target 8' },
    { label: 'Target 9', value: 'Target 9' },
    { label: 'Target 10', value: 'Target 10' },
  ];

  const limitData = [
    { label: '0', value: 0 },
    { label: '1', value: 1 },
    { label: '2', value: 2 },
    { label: '3', value: 3 },
    { label: '4', value: 4 },
    { label: '5', value: 5 },
    { label: '6', value: 6 },
    { label: '7', value: 7 },
  ];

  // Automatically calculate the total target value whenever mental or physical values change
  useEffect(() => {
    const mental = parseInt(targetMentalValue, 10) || 0;
    const physical = parseInt(targetPhysicalValue, 10) || 0;
    setTargetValue(mental + physical);
  }, [targetMentalValue, targetPhysicalValue]);

  // Function to handle the creation of a new group
  const handleCreateGroup = async () => {
    // Validate that the group name is not empty
    if (!groupName.trim()) {
      if (Platform.OS === 'web') {
        alert('Please enter a group name');
      } else {
        Alert.alert('Error', 'Please enter a group name');
      }
      return;
    }

    // Validate that a target category is selected
    if (!targetName) {
      if (Platform.OS === 'web') {
        alert('Please select a target category');
      } else {
        Alert.alert('Error', 'Please select a target category');
      }
      return;
    }

    setLoading(true); // Show loading indicator while the group is being created

    try {
      // Retrieve the authentication token from local storage
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Define the API endpoint
      const apiUrl = global.workingApiUrl || 'http://localhost:5001/api';

      // Send a POST request to create the group
      const response = await fetch(`${apiUrl}/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: groupName,
          description: groupDescription,
          targetName,
          targetMentalValue: parseInt(targetMentalValue, 10),
          targetPhysicalValue: parseInt(targetPhysicalValue, 10),
          dailyLimitPhysical,
          dailyLimitMental,
        }),
      });

      const data = await response.json();

      // Check if the response is successful
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create group');
      }

      setLoading(false); // Hide loading indicator
      if (Platform.OS === 'web') {
        alert(`Group "${groupName}" created successfully!`);
        router.replace('/screens/(tabs)/home'); // Navigate to the home screen
      } else {
        Alert.alert('Success', `Group "${groupName}" created successfully!`, [
          {
            text: 'OK',
            onPress: () => router.replace('/screens/(tabs)/home'),
          },
        ]);
      }
    } catch (error) {
      setLoading(false); // Hide loading indicator
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

          {/* Input for the group name */}
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

          {/* Input for the group description */}
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

          {/* Dropdown for selecting the target category */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Target Name</Text>
            <Dropdown
              style={styles.dropdown}
              data={targetData}
              labelField="label"
              valueField="value"
              placeholder="Select a category"
              value={targetName}
              onChange={(item) => setTargetName(item.value)}
            />
          </View>

          {/* Input for mental target value and daily mental limit */}
          <View style={[styles.formGroup, styles.row]}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Mental Target Value</Text>
              <TextInput
                style={styles.input}
                value={targetMentalValue.toString()}
                onChangeText={(text) => {
                  const intValue = text.replace(/[^0-9]/g, '');
                  setTargetMentalValue(intValue);
                }}
                placeholder="e.g., 50, 100"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.halfWidth}>
              <Text style={styles.label}>Daily Mental Limit</Text>
              <Dropdown
                style={styles.dropdown}
                data={limitData}
                labelField="label"
                valueField="value"
                placeholder="Select limit"
                value={dailyLimitMental}
                onChange={(item) => setDailyLimitMental(item.value)}
              />
            </View>
          </View>

          {/* Input for physical target value and daily physical limit */}
          <View style={[styles.formGroup, styles.row]}>
            <View style={styles.halfWidth}>
              <Text style={styles.label}>Physical Target Value</Text>
              <TextInput
                style={styles.input}
                value={targetPhysicalValue.toString()}
                onChangeText={(text) => {
                  const intValue = text.replace(/[^0-9]/g, '');
                  setTargetPhysicalValue(intValue);
                }}
                placeholder="e.g., 200, 300"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.halfWidth}>
              <Text style={styles.label}>Daily Physical Limit</Text>
              <Dropdown
                style={styles.dropdown}
                data={limitData}
                labelField="label"
                valueField="value"
                placeholder="Select limit"
                value={dailyLimitPhysical}
                onChange={(item) => setDailyLimitPhysical(item.value)}
              />
            </View>
          </View>

          {/* Display the total target value */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Total Target Value</Text>
            <Text style={styles.totalValue}>{targetValue}</Text>
          </View>

          {/* Button to create the group */}
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

          {/* Button to cancel and go back */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.replace('/screens/welcome?initialIndex=5')}
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
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0E5E6F',
    marginTop: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  halfWidth: {
    flex: 1,
    marginHorizontal: 5,
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
});