import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Modal, FlatList, ActivityIndicator, Image, Alert } from 'react-native'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { userService, groupService } from '../../services/api' 

// Physical activities library
// Expanded Physical Activities
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
  { id: 11, name: 'Yoga', icon: '🧘' },
  { id: 12, name: 'Squash', icon: '🎾' },
  { id: 13, name: 'Rugby', icon: '🏉' },
  { id: 14, name: 'Touch Rugby', icon: '👐' },
  { id: 15, name: 'Steps goal', icon: '👣' },
  { id: 16, name: 'DIY', icon: '🔨' },
  { id: 17, name: 'Gardening', icon: '🌱' },
  { id: 19, name: 'Pilates', icon: '🧘‍♀️' },
  { id: 20, name: 'Dance', icon: '💃' },
  { id: 21, name: 'Rock Climbing', icon: '🧗' },
  { id: 22, name: 'Martial Arts', icon: '🥋' },
  { id: 23, name: 'Tennis', icon: '🎾' },
  { id: 24, name: 'Basketball', icon: '🏀' },
  { id: 25, name: 'Hiking', icon: '🥾' },
  { id: 26, name: 'Skiing/Snowboarding', icon: '🎿' },
  { id: 27, name: 'Kayaking/Paddling', icon: '🛶' },
  { id: 28, name: 'Golf', icon: '⛳' },
  { id: 29, name: 'Volleyball', icon: '🏐' },
  { id: 30, name: 'Badminton', icon: '🏸' },
  { id: 31, name: 'Table Tennis', icon: '🏓' },
  { id: 32, name: 'Boxing', icon: '🥊' },
  { id: 33, name: 'Surfing', icon: '🏄' },
  { id: 34, name: 'Baseball', icon: '⚾' },
  { id: 35, name: 'Softball', icon: '🥎' },
  { id: 36, name: 'American Football', icon: '🏈' },
  { id: 37, name: 'Hockey', icon: '🏒' },
  { id: 38, name: 'Skating', icon: '⛸️' },
  { id: 39, name: 'Rowing', icon: '🚣' },
  { id: 40, name: 'Crossfit', icon: '🏋️' },
  { id: 41, name: 'Bowling', icon: '🎳' },
  { id: 42, name: 'Archery', icon: '🏹' },
  { id: 43, name: 'Horse Riding', icon: '🏇' },
  { id: 44, name: 'Jumping Rope', icon: '⏱️' },
  { id: 45, name: 'Frisbee', icon: '🥏' },
  { id: 46, name: 'Bouldering', icon: '🧗‍♂️' },
  { id: 47, name: 'Gymnastics', icon: '🤸' },
  { id: 48, name: 'Tai Chi', icon: '🧘‍♂️' },
  { id: 49, name: 'Kickboxing', icon: '👊' },
  { id: 50, name: 'Weightlifting', icon: '🏋️‍♀️' },
  { id: 51, name: 'Stretching', icon: '🤸‍♀️' },
  { id: 52, name: 'Sailing', icon: '⛵' },
  { id: 53, name: 'Scuba Diving', icon: '🤿' },
  { id: 54, name: 'Snorkeling', icon: '🥽' },
  { id: 55, name: 'Fishing', icon: '🎣' },
  { id: 56, name: 'Canoeing', icon: '🛶' },
  { id: 57, name: 'Water Polo', icon: '🤽' },
  { id: 58, name: 'Ballet', icon: '🩰' },
  { id: 59, name: 'Parkour', icon: '🏃‍♂️' },
  { id: 60, name: 'Skateboarding', icon: '🛹' },
  { id: 61, name: 'Rollerblading', icon: '🛼' },
  { id: 62, name: 'Ice Hockey', icon: '🏒' },
  { id: 63, name: 'Handball', icon: '🤾' },
  { id: 64, name: 'Wrestling', icon: '🤼' },
  { id: 65, name: 'Judo', icon: '🥋' },
  { id: 66, name: 'Karate', icon: '🥋' },
  { id: 67, name: 'Lawn Bowling', icon: '🎳' },
  { id: 68, name: 'Aerobics', icon: '💃' },
  { id: 69, name: 'Zumba', icon: '💃' },
  { id: 70, name: 'Spinning', icon: '🚲' },
  { id: 71, name: 'Circuit Training', icon: '⚡' },
  { id: 72, name: 'Stair Climbing', icon: '🪜' },
  { id: 73, name: 'Functional Training', icon: '🏋️‍♂️' },
  { id: 74, name: 'Snowshoeing', icon: '❄️' },
  { id: 75, name: 'Cross-country Skiing', icon: '⛷️' },
  { id: 76, name: 'Mountain Biking', icon: '🚵' },
  { id: 77, name: 'BMX', icon: '🚵‍♂️' },
  { id: 78, name: 'Wakeboarding', icon: '🏄‍♂️' },
  { id: 79, name: 'Kitesurfing', icon: '🪁' },
  { id: 80, name: 'Windsurfing', icon: '🏄‍♀️' },
  { id: 81, name: 'Paragliding', icon: '🪂' },
  { id: 82, name: 'Hang Gliding', icon: '🪂' },
  { id: 83, name: 'Bungee Jumping', icon: '🧗‍♀️' },
  { id: 84, name: 'Rafting', icon: '🚣‍♀️' },
  { id: 85, name: 'Canyoning', icon: '🏞️' },
  { id: 86, name: 'Stand-up Paddleboarding', icon: '🏄‍♂️' },
  { id: 87, name: 'Disc Golf', icon: '🥏' },
  { id: 88, name: 'Lacrosse', icon: '🥍' },
  { id: 89, name: 'Cricket nets', icon: '🏏' },
  { id: 90, name: 'Ultimate Frisbee', icon: '🥏' },
  { id: 91, name: 'Trail Running', icon: '🏃‍♀️' },
  { id: 92, name: 'Paintball', icon: '🔫' },
  { id: 93, name: 'Indoor Climbing', icon: '🧗‍♀️' },
  { id: 94, name: 'Cheerleading', icon: '📣' },
  { id: 95, name: 'Dancing', icon: '💃' },
  { id: 96, name: 'Pole Dancing', icon: '💃' },
  { id: 97, name: 'Hula Hooping', icon: '⭕' },
  { id: 18, name: 'Physical other', icon: '❓' }
];

// Realistic Mental Activities List
const mentalActivities = [
  { id: 1, name: 'Meditation', icon: '🧘' },
  { id: 2, name: 'Reading', icon: '📚' },
  { id: 3, name: 'Writing', icon: '✍️' },
  { id: 4, name: 'Music Practice', icon: '🎵' },
  { id: 5, name: 'Brain Training', icon: '🧠' },
  { id: 6, name: 'Language Learning', icon: '🗣️' },
  { id: 7, name: 'Journaling', icon: '📓' },
  { id: 8, name: 'Breathing Exercise', icon: '💨' },
  { id: 10, name: 'Puzzle Solving', icon: '🧩' },
  { id: 11, name: 'Drawing/Sketching', icon: '🎨' },
  { id: 12, name: 'Mindfulness', icon: '🪷' },
  { id: 13, name: 'Online Course', icon: '🎓' },
  { id: 14, name: 'Podcast', icon: '🎧' },
  { id: 15, name: 'Audiobook', icon: '🔊' },
  { id: 16, name: 'Chess', icon: '♟️' },
  { id: 17, name: 'Sudoku', icon: '🔢' },
  { id: 18, name: 'Crossword', icon: '📝' },
  { id: 19, name: 'Educational Video', icon: '📺' },
  { id: 20, name: 'Gratitude Practice', icon: '🙏' },
  { id: 21, name: 'Digital Detox', icon: '📵' },
  { id: 22, name: 'Planning/Organizing', icon: '📅' },
  { id: 23, name: 'Self-reflection', icon: '💭' },
  { id: 24, name: 'Cooking New Recipe', icon: '👨‍🍳' },
  { id: 25, name: 'DIY Project', icon: '🔧' },
  { id: 26, name: 'Gardening', icon: '🌱' },
  { id: 27, name: 'Knowledge Sharing', icon: '👨‍🏫' },
  { id: 28, name: 'Therapy Session', icon: '🛋️' },
  { id: 29, name: 'Skill Practice', icon: '🛠️' },
  { id: 30, name: 'Documentary', icon: '🎬' },
  { id: 31, name: 'Board Game', icon: '🎲' },
  { id: 32, name: 'Reading News', icon: '📰' },
  { id: 33, name: 'Learning Instrument', icon: '🎸' },
  { id: 34, name: 'Photography', icon: '📷' },
  { id: 35, name: 'Creative Writing', icon: '📝' },
  { id: 36, name: 'Goal Setting', icon: '🎯' },
  { id: 37, name: 'Public Speaking', icon: '🎤' },
  { id: 38, name: 'Deep Conversation', icon: '💬' },
  { id: 39, name: 'Hobby Time', icon: '🧶' },
  { id: 40, name: 'Nature Observation', icon: '🌿' },
  { id: 9, name: 'Mental other', icon: '❓' }
];

// Expanded Bonus Activities
const bonusActivities = [
  { id: 1, name: 'Community Service', icon: '🤝' },
  { id: 2, name: 'Family', icon: '👨‍👩‍👧‍👦' },
  { id: 3, name: 'Personal Best', icon: '🏆' },
  { id: 4, name: 'Personal Goal', icon: '🎯' },
  { id: 6, name: 'Environmental Action', icon: '🌍' },
  { id: 7, name: 'Volunteering', icon: '❤️' },
  { id: 8, name: 'Teaching Others', icon: '👨‍🏫' },
  { id: 9, name: 'Religious/Spiritual Practice', icon: '🕊️' },
  { id: 10, name: 'Self-Care', icon: '🧖' },
  { id: 5, name: 'Bonus other', icon: '✨' }
];

export default function Profile() {
  const router = useRouter()
  
  // User data state
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Groups state
  const [groups, setGroups] = useState([])
  const [loadingGroups, setLoadingGroups] = useState(false)
  
  // Activity selection states
  const [selectedPhysicalActivities, setSelectedPhysicalActivities] = useState([])
  const [physicalModalVisible, setPhysicalModalVisible] = useState(false)
  const [selectedMentalActivities, setSelectedMentalActivities] = useState([])
  const [mentalModalVisible, setMentalModalVisible] = useState(false)
  const [selectedBonusActivities, setSelectedBonusActivities] = useState([])
  const [bonusModalVisible, setBonusModalVisible] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  
  // Load user data function with better error handling
  const loadUserData = async () => {
    try {
      setLoading(true)
      
      // Get user data from service or AsyncStorage
      const user = await userService.getUserProfile()
      
      if (!user) {
        throw new Error('User data not found')
      }
      
      setUserData(user)
      
      // Load saved activity preferences
      if (user.activitySettings) {
        // Find the full activity objects based on saved IDs
        if (user.activitySettings.physicalActivities) {
          const savedPhysical = physicalActivities.filter(activity => 
            user.activitySettings.physicalActivities.includes(activity.id)
          )
          setSelectedPhysicalActivities(savedPhysical)
        }
        
        if (user.activitySettings.mentalActivities) {
          const savedMental = mentalActivities.filter(activity => 
            user.activitySettings.mentalActivities.includes(activity.id)
          )
          setSelectedMentalActivities(savedMental)
        }
        
        if (user.activitySettings.bonusActivities) {
          const savedBonus = bonusActivities.filter(activity => 
            user.activitySettings.bonusActivities.includes(activity.id)
          )
          setSelectedBonusActivities(savedBonus)
        }
      }
    } catch (err) {
      console.error('Error loading user data:', err)
      setError('Failed to load profile data')
      
      // Use default values if unable to get user data
      setUserData({
        name: "Guest User",
        status: "Inactive",
        createdAt: new Date().toISOString()
      })
    } finally {
      setLoading(false)
    }
  }
  
  // Fetch groups function
  const fetchGroups = async () => {
    try {
      setLoadingGroups(true)
      
      // Get groups from service
      const userGroups = await groupService.getUserGroups()
      setGroups(userGroups)
      
    } catch (error) {
      console.error('Error fetching groups:', error)
      // Keep the groups array as is if there's an error
    } finally {
      setLoadingGroups(false)
    }
  }
  
  // Load user data when component mounts
  useEffect(() => {
    loadUserData()
  }, [])
  
  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadUserData()
      fetchGroups() // Refresh groups when returning to Profile
      return () => {
        // Cleanup if needed
      }
    }, [])
  )
  
  // Generate avatar text from user's name
  const getAvatarText = () => {
    if (!userData || !userData.name) return "??"
    return userData.name.substring(0, 2).toUpperCase()
  }
  
  // Format join date for display
  const getFormattedJoinDate = () => {
    if (!userData || !userData.createdAt) {
      return "April 2025" // Default date
    }
    
    return new Date(userData.createdAt).toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    })
  }
  
  // Save user settings with proper API integration
  const saveUserSettings = async () => {
    try {
      setSavingSettings(true)
      
      // Create the data object to send to API
      const activitySettings = {
        physicalActivities: selectedPhysicalActivities.map(a => a.id),
        mentalActivities: selectedMentalActivities.map(a => a.id),
        bonusActivities: selectedBonusActivities.map(a => a.id)
      }
      
      // Update local user object
      const updatedUserData = {
        ...userData,
        activitySettings,
        updatedAt: new Date().toISOString()
      }
      
      // Save to local storage first
      await AsyncStorage.setItem('user', JSON.stringify(updatedUserData))
      
      // Then update user profile via API
      try {
        // This would call the API service to save settings
        await userService.updateUserProfile({
          activitySettings
        })
        
        // Update local state
        setUserData(updatedUserData)
        
        Alert.alert('Success', 'Activity settings saved successfully!')
      } catch (apiError) {
        console.error('API error saving settings:', apiError)
        Alert.alert(
          'Warning', 
          'Settings saved locally but could not connect to server. Your changes will sync when connection is restored.'
        )
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      Alert.alert('Error', 'Failed to save settings. Please try again.')
    } finally {
      setSavingSettings(false)
    }
  }
  
  // Navigate to edit profile
  const handleEditProfile = () => {
    router.push('/screens/(tabs)/profile/EditProfile')
  }
  
  // Show loading placeholder while fetching user data
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarPlaceholder}>
                <ActivityIndicator color="#fff" />
              </View>
            </View>
            <View style={styles.userInfoContainer}>
              <Text style={styles.userName}>Loading...</Text>
              <Text style={styles.userStatus}>Please wait</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3A8891" />
        </View>
      </View>
    )
  }
  
  return (
    <View style={styles.container}>
      {/* Header/Top Information Area - replaced with dynamic user data */}
      <View style={styles.headerContainer}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {userData?.avatarUrl ? (
              <Image 
                source={{ uri: userData.avatarUrl }} 
                style={{ width: '100%', height: '100%' }}
                onError={(e) => {
                  console.log('Avatar image error:', e.nativeEvent.error)
                  // Fall back to placeholder on error
                }}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{getAvatarText()}</Text>
              </View>
            )}
          </View>
          <View style={styles.userInfoContainer}>
            <Text style={styles.userName}>{userData?.name || "Unknown User"}</Text>
            <Text style={styles.userStatus}>Status: {userData?.status || "Active"}</Text>
            <Text style={styles.userJoinDate}>Member since: {getFormattedJoinDate()}</Text>
          </View>
        </View>
        
        {/* Bio section */}
        {userData?.bio ? (
          <View style={styles.bioContainer}>
            <View style={styles.goalLabelContainer}>
              <Text style={styles.goalLabel}>Bio:</Text>
            </View>
            <Text style={styles.bioText}>{userData.bio}</Text>
          </View>
        ) : null}
        
        {/* Long-term Goal section */}
        {userData?.longTermGoal ? (
          <View style={styles.goalContainer}>
            <View style={styles.goalLabelContainer}>
              <Text style={styles.goalLabel}>Long-term Goal:</Text>
            </View>
            <Text style={styles.goalText}>{userData.longTermGoal}</Text>
          </View>
        ) : null}
        
        <TouchableOpacity 
          style={styles.editButton}
          onPress={handleEditProfile}
        >
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Rest of the profile content */}
      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>My Groups</Text>
        {loadingGroups ? (
          <View style={styles.placeholder}>
            <ActivityIndicator size="small" color="#3A8891" />
            <Text style={[styles.placeholderText, {marginTop: 8}]}>Loading groups...</Text>
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>No groups joined yet</Text>
          </View>
        ) : (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.groupsScrollView}
          >
            {groups.map(group => (
              <View
                key={group._id || group.id}
                style={styles.groupCard}
              >
                <View style={styles.groupCardIcon}>
                  <Text style={styles.groupCardIconText}>
                    {group.name.substring(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.groupCardName}>{group.name}</Text>
                <Text style={styles.groupCardMembers}>
                  {group.members?.length || 0} members
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
        
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
                <View key={activity.id} style={[styles.activityChip, { backgroundColor: '#FF6B6B' }]}>
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

        {/* Developer Tools Section - For testing only */}
        <View style={styles.devToolsSection}>
          <Text style={styles.devToolsTitle}>Developer Tools</Text>
          <Text style={styles.devToolsDescription}>These tools are for development testing only</Text>
          
          <TouchableOpacity 
            style={styles.resetButton} 
            onPress={async () => {
              try {
                // Remove the welcomeCompleted flag from AsyncStorage
                await AsyncStorage.removeItem('welcomeCompleted')
                Alert.alert('Success', 'Welcome flow has been reset. Log out and back in to see the welcome screens.')
              } catch (error) {
                console.error('Error resetting welcome flow:', error)
                Alert.alert('Error', 'Failed to reset welcome flow: ' + error.message)
              }
            }}
          >
            <Text style={styles.resetButtonText}>Reset Welcome Flow</Text>
          </TouchableOpacity>
        </View>
        
        {/* Save Button */}
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={saveUserSettings}
          disabled={savingSettings}
        >
          {savingSettings ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Settings</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      
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
  // Bio container styles
  bioContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    padding: 12,
    marginTop: 15,
    marginBottom: 10,
  },
  bioText: {
    color: '#fff',
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  // Long-term Goal styles
  goalContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    padding: 12,
    marginTop: 5,
    marginBottom: 10,
  },
  goalLabelContainer: {
    marginBottom: 4,
  },
  goalLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  goalText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
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
  // Group styles
  groupsScrollView: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  groupCard: {
    width: 150,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginRight: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  groupCardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3A8891',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  groupCardIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  groupCardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0E5E6F',
    marginBottom: 5,
    textAlign: 'center',
  },
  groupCardMembers: {
    fontSize: 14,
    color: '#666',
  },
  // Activities styles
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
  devToolsSection: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  devToolsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0E5E6F',
    marginBottom: 5,
  },
  devToolsDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  resetButton: {
    backgroundColor: '#0E5E6F',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Added loading style
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
