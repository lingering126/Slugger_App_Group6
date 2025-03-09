import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal} from 'react-native';
import { Picker } from '@react-native-picker/picker'; // import picker
import { StatusBar } from 'expo-status-bar';
import { FontAwesome5 } from '@expo/vector-icons';

export default function HomeScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTime, setSelectedTime] = useState('1'); // Default 1 hour
  const [selectedActivity, setSelectedActivity] = useState(null); // the type of choosen sports

  const openModal = (category) => {
    setSelectedCategory(category);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const handleSelectActivity = (activity) => {
    setSelectedActivity(activity);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      {/* Progress Bars */}
      <View style={styles.progressContainer}>
        {/* Individual Progress */}
        <View style={styles.progressRow}>
          <View style={styles.progressBarWrapper}>
            <View style={[styles.progressBar, { width: '68%', backgroundColor: 'green' }]} />
          </View>
          <View style={styles.progressInfo}>
            <FontAwesome5 name="user" size={16} color="black" style={styles.progressIcon} />
            <Text style={styles.progressText}>  68%</Text>
          </View>
        </View>

        {/* Team Progress */}
        <View style={styles.progressRow}>
          <View style={styles.progressBarWrapper}>
            <View style={[styles.progressBar, { width: '61%', backgroundColor: 'orange' }]} />
          </View>
          <View style={styles.progressInfo}>
            <FontAwesome5 name="users" size={16} color="black" style={styles.progressIcon} />
            <Text style={styles.progressText}> 61%</Text>
          </View>
        </View>
      </View>

      {/* Chat Section */}
      <ScrollView style={styles.chatContainer}>
        <View style={styles.chatBubble}>
          <Text style={styles.chatUser}>Jake</Text>
          <Text style={styles.chatMessage}>Who wants to do an Ironman?</Text>
        </View>

        {/* Updated Statistics Section */}
        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <Text style={styles.statTitle}>Tina has earned a mental point</Text>
            <FontAwesome5 name="gem" size={18} color="#6C63FF" />
          </View>

          <View style={styles.statBox}>
            <View style={styles.statColumn}>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={styles.statValue}>46</Text>
              <Text style={styles.statLabel}>Group target</Text>
              <Text style={styles.statValue}>68</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statColumn}>
              <Text style={styles.statLabel}>% of target</Text>
              <Text style={styles.statValue}>68%</Text>
              <Text style={styles.statLabel}>% of time gone</Text>
              <Text style={styles.statValue}>65%</Text>
            </View>
          </View>
        </View>


        <View style={styles.chatBubble}>
          <Text style={styles.chatUser}>Junu</Text>
          <Text style={styles.chatMessage}>Ironman, I'm in!</Text>
        </View>

        <View style={styles.chatBubble}>
          <Text style={styles.chatUser}>Chris</Text>
          <Text style={styles.chatMessage}>Nice Tina!</Text>
        </View>
      </ScrollView>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={() => openModal('Physical Exercise')}>
          <Text style={styles.buttonText}>Log physical</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => openModal('Mental Training')}>
          <Text style={styles.buttonText}>Log mental</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => openModal('Bonus Activity')}>
          <Text style={styles.buttonText}>Log bonus</Text>
        </TouchableOpacity>
      </View>

      {/* Modal for selecting exercise type and time */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select {selectedCategory}</Text>

            {/* Time Picker */}
            <Text style={styles.modalLabel}>Select Duration (Hours)</Text>
            <Picker selectedValue={selectedTime} style={styles.picker} onValueChange={(itemValue) => setSelectedTime(itemValue)}>
              {[...Array(24).keys()].map((num) => (
                <Picker.Item key={num + 1} label={`${num + 1} hour`} value={`${num + 1}`} />
              ))}
            </Picker>

            {/* Activity Options */}
            <View style={styles.optionContainer}>
              <TouchableOpacity 
                style={[styles.optionButton, selectedActivity === 'Running' && styles.selectedButton]} 
                onPress={() => handleSelectActivity('Running')}
              >
                <Text style={[styles.optionText, selectedActivity === 'Running' && styles.selectedText]}>🏃 Running</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.optionButton, selectedActivity === 'Yoga' && styles.selectedButton]} 
                onPress={() => handleSelectActivity('Yoga')}
              >
                <Text style={[styles.optionText, selectedActivity === 'Yoga' && styles.selectedText]}>🧘 Yoga</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.optionButton, selectedActivity === 'Cycling' && styles.selectedButton]} 
                onPress={() => handleSelectActivity('Cycling')}
              >
                <Text style={[styles.optionText, selectedActivity === 'Cycling' && styles.selectedText]}>🚴 Cycling</Text>
              </TouchableOpacity>
            </View>

            {/* Confirm & Close Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.modalButton} onPress={closeModal}>
                <Text style={styles.modalButtonText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.closeButton]} onPress={closeModal}>
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  /** Main Container */
  container: { 
    flex: 1, 
    backgroundColor: '#E8F0F2', 
    paddingTop: 10 
  },

  /** Progress Bar Styles */
  progressContainer: { 
    paddingHorizontal: 15, 
    marginBottom: 20 
  },
  progressRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 5 
  },
  progressBarWrapper: { 
    flex: 1, 
    height: 10, 
    backgroundColor: '#ddd', 
    borderRadius: 5, 
    marginRight: 10 
  },
  progressBar: { 
    height: '100%', 
    borderRadius: 5 
  },
  progressInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'flex-end', 
    width: 70,  
  },
  progressIcon: {
    marginRight: 5,
  },
  progressText: {
    fontWeight: 'bold',
  },

  /** Chat Section */
  chatContainer: { 
    flex: 1, 
    paddingHorizontal: 10 
  },
  chatBubble: { 
    backgroundColor: '#fff', 
    padding: 10, 
    marginVertical: 5, 
    borderRadius: 10 
  },
  chatUser: {
    fontWeight: 'bold',
    marginBottom: 3,
    color: '#2C3E50',
  },
  chatMessage: {
    color: '#34495E',
  },

  /** Stats Card (Updated) */
  statsCard: {
    backgroundColor: '#DFF6FF', 
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#A8DADC',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  statBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#BEE1E6',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  statColumn: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#34495E',
    marginBottom: 3,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 5,
  },
  divider: {
    width: 1,
    height: '80%',
    backgroundColor: '#A8DADC',
  },

  /** Button Styles */
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  button: {
    backgroundColor: '#4A90E2',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  /** Modal Styles */
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#2C3E50',
  },
  modalLabel: {
    alignSelf: 'flex-start',
    marginBottom: 5,
    color: '#34495E',
  },
  picker: {
    width: '100%',
    marginBottom: 15,
  },
  optionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  optionButton: {
    width: '48%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 10,
    alignItems: 'center',
  },
  selectedButton: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  optionText: {
    color: '#34495E',
  },
  selectedText: {
    color: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    width: '48%',
    alignItems: 'center',
  },
  closeButton: {
    backgroundColor: '#E74C3C',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
}); 