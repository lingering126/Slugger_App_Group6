import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal, FlatList } from 'react-native'
import React, { useState } from 'react'
import { useRouter } from 'expo-router'

// Mock data (would normally come from a database)
const mockUserData = {
  name: "Huixian",
  status: "Active",
  joinDate: "March 2025"
}

// Physical activities library
const physicalActivities = [
  { id: 1, name: 'Cricket', icon: '🏏' },
  { id: 2, name: 'Soccer', icon: '⚽' },
  { id: 3, name: 'Run', icon: '🏃' },
  { id: 4, name: 'Walk', icon: '🚶' },
  { id: 5, name: 'HIIT', icon: '🔥' },
  { id: 6, name: 'Gym Workout', icon: '💪' },
  { id: 7, name: 'Cycle', icon: '🚴' },
  { id: 8, name: 'Swim', icon: '🏊' },
  { id: 9, name: 'Home Workout', icon: '🏠' },
  { id: 10, name: 'Physio', icon: '🧑‍⚕️' },
  { id: 11, name: 'Yoga', icon: '🧘' },
  { id: 12, name: 'Squash', icon: '🎾' },
  { id: 13, name: 'Rugby', icon: '🏉' },
  { id: 14, name: 'Touch Rugby', icon: '👐' },
  { id: 15, name: 'Steps goal', icon: '👣' },
  { id: 16, name: 'DIY', icon: '🔨' },
  { id: 17, name: 'Gardening', icon: '🌱' },
  { id: 18, name: 'Physical other', icon: '❓' }
]

// Mental activities library
const mentalActivities = [
  { id: 1, name: 'Meditation', icon: '🧘' },
  { id: 2, name: 'Reading', icon: '📚' },
  { id: 3, name: 'Writing', icon: '✍️' },
  { id: 4, name: 'Music Practice', icon: '🎵' },
  { id: 5, name: 'Mental Gym', icon: '🧠' },
  { id: 6, name: 'Duolingo', icon: '🦉' },
  { id: 7, name: 'Language Training', icon: '🗣️' },
  { id: 8, name: 'Cold shower', icon: '🚿' },
  { id: 9, name: 'Mental other', icon: '❓' },
  { id: 10, name: 'Journal', icon: '📓' },
  { id: 11, name: 'Breathing exercise', icon: '💨' }
]

// Bonus activities library
const bonusActivities = [
  { id: 1, name: 'Community Service', icon: '🤝' },
  { id: 2, name: 'Family', icon: '👨‍👩‍👧‍👦' },
  { id: 3, name: 'Personal Best', icon: '🏆' },
  { id: 4, name: 'Personal Goal', icon: '🎯' },
  { id: 5, name: 'Bonus other', icon: '✨' }
]

const Profile = () => {
  const router = useRouter()
  const [selectedPhysicalActivities, setSelectedPhysicalActivities] = useState([])
  const [physicalModalVisible, setPhysicalModalVisible] = useState(false)
  const [selectedMentalActivities, setSelectedMentalActivities] = useState([])
  const [mentalModalVisible, setMentalModalVisible] = useState(false)
  const [selectedBonusActivities, setSelectedBonusActivities] = useState([])
  const [bonusModalVisible, setBonusModalVisible] = useState(false)
  
  return (
    <View style={styles.container}>
      {/* Header/Top Information Area */}
      <View style={styles.headerContainer}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{mockUserData.name.substring(0, 2).toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.userInfoContainer}>
            <Text style={styles.userName}>{mockUserData.name}</Text>
            <Text style={styles.userStatus}>Status: {mockUserData.status}</Text>
            <Text style={styles.userJoinDate}>Member since: {mockUserData.joinDate}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Rest of the profile content */}
      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>My Groups</Text>
        {/* Group list would go here */}
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>No groups joined yet</Text>
        </View>
        
        <Text style={styles.sectionTitle}>Group Members</Text>
        {/* Group members would go here */}
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Join a group to see members</Text>
        </View>
        
        <Text style={styles.sectionTitle}>Activity Settings</Text>
        
        {/* Physical Activities Section */}
        <View style={styles.activitySection}>
          <Text style={styles.activityTitle}>Physical Activities</Text>
          <Text style={styles.activityDescription}>Select the physical activities you want to track</Text>
          
          <TouchableOpacity 
            style={styles.activitySelector} 
            onPress={() => setPhysicalModalVisible(true)}
          >
            <Text style={styles.activitySelectorText}>
              {selectedPhysicalActivities.length 
                ? `${selectedPhysicalActivities.length} activities selected` 
                : 'Select activities'}
            </Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>
          
          {selectedPhysicalActivities.length > 0 && (
            <View style={styles.selectedActivitiesContainer}>
              {selectedPhysicalActivities.map(activity => (
                <View key={activity.id} style={styles.activityChip}>
                  <Text style={styles.activityChipIcon}>{activity.icon}</Text>
                  <Text style={styles.activityChipText}>{activity.name}</Text>
                  <TouchableOpacity 
                    onPress={() => {
                      setSelectedPhysicalActivities(
                        selectedPhysicalActivities.filter(item => item.id !== activity.id)
                      )
                    }}
                    style={styles.activityChipRemove}
                  >
                    <Text style={styles.activityChipRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Mental Activities Section */}
        <View style={styles.activitySection}>
          <Text style={styles.activityTitle}>Mental Activities</Text>
          <Text style={styles.activityDescription}>Select the mental activities you want to track</Text>
          
          <TouchableOpacity 
            style={styles.activitySelector} 
            onPress={() => setMentalModalVisible(true)}
          >
            <Text style={styles.activitySelectorText}>
              {selectedMentalActivities.length 
                ? `${selectedMentalActivities.length} activities selected` 
                : 'Select activities'}
            </Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>
          
          {selectedMentalActivities.length > 0 && (
            <View style={styles.selectedActivitiesContainer}>
              {selectedMentalActivities.map(activity => (
                <View key={activity.id} style={[styles.activityChip, { backgroundColor: '#0E5E6F' }]}>
                  <Text style={styles.activityChipIcon}>{activity.icon}</Text>
                  <Text style={styles.activityChipText}>{activity.name}</Text>
                  <TouchableOpacity 
                    onPress={() => {
                      setSelectedMentalActivities(
                        selectedMentalActivities.filter(item => item.id !== activity.id)
                      )
                    }}
                    style={styles.activityChipRemove}
                  >
                    <Text style={styles.activityChipRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Bonus Activities Section */}
        <View style={styles.activitySection}>
          <Text style={styles.activityTitle}>Bonus Activities</Text>
          <Text style={styles.activityDescription}>Select bonus activities to earn extra points</Text>
          
          <TouchableOpacity 
            style={styles.activitySelector} 
            onPress={() => setBonusModalVisible(true)}
          >
            <Text style={styles.activitySelectorText}>
              {selectedBonusActivities.length 
                ? `${selectedBonusActivities.length} activities selected` 
                : 'Select activities'}
            </Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>
          
          {selectedBonusActivities.length > 0 && (
            <View style={styles.selectedActivitiesContainer}>
              {selectedBonusActivities.map(activity => (
                <View key={activity.id} style={[styles.activityChip, { backgroundColor: '#4A9D63' }]}>
                  <Text style={styles.activityChipIcon}>{activity.icon}</Text>
                  <Text style={styles.activityChipText}>{activity.name}</Text>
                  <TouchableOpacity 
                    onPress={() => {
                      setSelectedBonusActivities(
                        selectedBonusActivities.filter(item => item.id !== activity.id)
                      )
                    }}
                    style={styles.activityChipRemove}
                  >
                    <Text style={styles.activityChipRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>
      </ScrollView>
      
      {/* Developer Tools Section */}
      <View style={styles.developerSection}>
        <Text style={styles.developerTitle}>Developer Tools</Text>
        <TouchableOpacity 
          style={styles.developerButton}
          onPress={() => router.push('/screens/reset-welcome')}
        >
          <Text style={styles.developerButtonText}>Reset Welcome Page</Text>
        </TouchableOpacity>
      </View>

      {/* Modal for selecting physical activities */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={physicalModalVisible}
        onRequestClose={() => setPhysicalModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Physical Activities</Text>
              <TouchableOpacity 
                onPress={() => setPhysicalModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={physicalActivities}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.activityItem}
                  onPress={() => {
                    const isSelected = selectedPhysicalActivities.some(
                      activity => activity.id === item.id
                    )
                    
                    if (isSelected) {
                      setSelectedPhysicalActivities(
                        selectedPhysicalActivities.filter(activity => activity.id !== item.id)
                      )
                    } else {
                      setSelectedPhysicalActivities([...selectedPhysicalActivities, item])
                    }
                  }}
                >
                  <Text style={styles.activityItemIcon}>{item.icon}</Text>
                  <Text style={styles.activityItemText}>{item.name}</Text>
                  {selectedPhysicalActivities.some(activity => activity.id === item.id) && (
                    <Text style={styles.activityItemSelected}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
            
            <TouchableOpacity 
              style={styles.modalDoneButton}
              onPress={() => setPhysicalModalVisible(false)}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal for selecting mental activities */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={mentalModalVisible}
        onRequestClose={() => setMentalModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Mental Activities</Text>
              <TouchableOpacity 
                onPress={() => setMentalModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={mentalActivities}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.activityItem}
                  onPress={() => {
                    const isSelected = selectedMentalActivities.some(
                      activity => activity.id === item.id
                    )
                    
                    if (isSelected) {
                      setSelectedMentalActivities(
                        selectedMentalActivities.filter(activity => activity.id !== item.id)
                      )
                    } else {
                      setSelectedMentalActivities([...selectedMentalActivities, item])
                    }
                  }}
                >
                  <Text style={styles.activityItemIcon}>{item.icon}</Text>
                  <Text style={styles.activityItemText}>{item.name}</Text>
                  {selectedMentalActivities.some(activity => activity.id === item.id) && (
                    <Text style={styles.activityItemSelected}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
            
            <TouchableOpacity 
              style={styles.modalDoneButton}
              onPress={() => setMentalModalVisible(false)}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal for selecting bonus activities */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={bonusModalVisible}
        onRequestClose={() => setBonusModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Bonus Activities</Text>
              <TouchableOpacity 
                onPress={() => setBonusModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={bonusActivities}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.activityItem}
                  onPress={() => {
                    const isSelected = selectedBonusActivities.some(
                      activity => activity.id === item.id
                    )
                    
                    if (isSelected) {
                      setSelectedBonusActivities(
                        selectedBonusActivities.filter(activity => activity.id !== item.id)
                      )
                    } else {
                      setSelectedBonusActivities([...selectedBonusActivities, item])
                    }
                  }}
                >
                  <Text style={styles.activityItemIcon}>{item.icon}</Text>
                  <Text style={styles.activityItemText}>{item.name}</Text>
                  {selectedBonusActivities.some(activity => activity.id === item.id) && (
                    <Text style={[styles.activityItemSelected, { color: '#4A9D63' }]}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              style={styles.modalList}
            />
            
            <TouchableOpacity 
              style={[styles.modalDoneButton, { backgroundColor: '#4A9D63' }]}
              onPress={() => setBonusModalVisible(false)}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

export default Profile

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F0F2',
  },
  headerContainer: {
    backgroundColor: '#3A8891',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#fff',
    overflow: 'hidden',
    backgroundColor: '#ccc',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0E5E6F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  userInfoContainer: {
    marginLeft: 20,
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 16,
    color: '#E8F0F2',
    marginBottom: 2,
  },
  userJoinDate: {
    fontSize: 14,
    color: '#E8F0F2',
    opacity: 0.8,
  },
  editButton: {
    marginTop: 15,
    backgroundColor: '#0E5E6F',
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0E5E6F',
    marginTop: 20,
    marginBottom: 10,
  },
  placeholder: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
  },
  activitySection: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0E5E6F',
    marginBottom: 5,
  },
  activityDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  activitySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  activitySelectorText: {
    fontSize: 16,
    color: '#333',
  },
  dropdownIcon: {
    fontSize: 14,
    color: '#666',
  },
  selectedActivitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  activityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3A8891',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    margin: 5,
  },
  activityChipIcon: {
    fontSize: 16,
    marginRight: 5,
  },
  activityChipText: {
    color: '#fff',
    fontSize: 14,
  },
  activityChipRemove: {
    marginLeft: 5,
    padding: 2,
  },
  activityChipRemoveText: {
    color: '#fff',
    fontSize: 12,
  },
  saveButton: {
    backgroundColor: '#0E5E6F',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0E5E6F',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#666',
  },
  modalList: {
    maxHeight: 400,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  activityItemIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  activityItemText: {
    fontSize: 16,
    flex: 1,
  },
  activityItemSelected: {
    fontSize: 18,
    color: '#3A8891',
    fontWeight: 'bold',
  },
  modalDoneButton: {
    padding: 15,
    backgroundColor: '#3A8891',
    alignItems: 'center',
    margin: 15,
    borderRadius: 8,
  },
  modalDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  developerSection: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    margin: 15,
    marginBottom: 30,
  },
  developerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF5722',
    marginBottom: 10,
  },
  developerButton: {
    backgroundColor: '#FF5722',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  developerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
})
