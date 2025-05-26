import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, SafeAreaView, ImageBackground, Image, TextInput, Alert, Linking, Animated, ActivityIndicator, Platform, RefreshControl } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { API_CONFIG } from '../../config/api';
import { refreshAuthToken, getApiUrl } from '../../services/api';
import ActivityCard from '../../components/ActivityCard';

// Physical activities library
// Expanded Physical Activities
const physicalActivitiesList = [
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
  { id: 18, name: 'Physical other', icon: '❓' },
  { id: 19, name: 'Pilates', icon: '🧘‍♀️' },
  { id: 20, name: 'Dance', icon: '💃' }
];

// Realistic Mental Activities List
const mentalActivitiesList = [
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
  { id: 9, name: 'Mental other', icon: '❓' }
];

// Expanded Bonus Activities
const bonusActivitiesList = [
  { id: 1, name: 'Community Service', icon: '🤝' },
  { id: 2, name: 'Family', icon: '👨‍👩‍👧‍👦' },
  { id: 3, name: 'Personal Best', icon: '🏆' },
  { id: 4, name: 'Personal Goal', icon: '🎯' },
  { id: 5, name: 'Bonus other', icon: '✨' },
  { id: 6, name: 'Environmental Action', icon: '🌳' },
  { id: 7, name: 'Volunteering', icon: '🙌' },
  { id: 8, name: 'Teaching Others', icon: '👨‍🏫' },
  { id: 9, name: 'Religious/Spiritual Practice', icon: '🕊️' },
  { id: 10, name: 'Self-Care', icon: '🧖' }
];

// Activity category data
const activityData = {
  Physical: [
    "Cricket", "Soccer", "Run", "Walk", "HIIT", "Gym Workout", 
    "Cycle", "Swim", "Home Workout", "Physio", "Yoga", "Squash", 
    "Rugby", "Touch Rugby", "Steps goal", "DIY", "Gardening", 
    "Pilates", "Dance", "Rock Climbing", "Martial Arts", "Tennis",
    "Basketball", "Hiking", "Skiing/Snowboarding", "Kayaking/Paddling",
    "Golf", "Volleyball", "Badminton", "Table Tennis", "Boxing",
    "Surfing", "Baseball", "Softball", "American Football", "Hockey",
    "Skating", "Rowing", "Crossfit", "Bowling", "Archery", "Horse Riding",
    "Jumping Rope", "Frisbee", "Bouldering", "Gymnastics", "Tai Chi",
    "Kickboxing", "Weightlifting", "Stretching", "Sailing", "Scuba Diving",
    "Snorkeling", "Fishing", "Canoeing", "Water Polo", "Ballet", "Parkour",
    "Skateboarding", "Rollerblading", "Ice Hockey", "Handball", "Wrestling",
    "Judo", "Karate", "Lawn Bowling", "Aerobics", "Zumba", "Spinning",
    "Circuit Training", "Stair Climbing", "Functional Training", "Snowshoeing",
    "Cross-country Skiing", "Mountain Biking", "BMX", "Wakeboarding", "Kitesurfing",
    "Windsurfing", "Paragliding", "Hang Gliding", "Bungee Jumping", "Rafting",
    "Canyoning", "Stand-up Paddleboarding", "Disc Golf", "Lacrosse", "Cricket nets",
    "Ultimate Frisbee", "Trail Running", "Paintball", "Indoor Climbing", "Cheerleading",
    "Dancing", "Pole Dancing", "Hula Hooping", "Physical other"
  ],
  Mental: [
    "Meditation", "Reading", "Writing", "Music Practice", "Brain Training",
    "Language Learning", "Journaling", "Breathing Exercise", "Mental other",
    "Puzzle Solving", "Drawing/Sketching", "Mindfulness", "Online Course", 
    "Podcast", "Audiobook", "Chess", "Sudoku", "Crossword", "Educational Video",
    "Gratitude Practice", "Digital Detox", "Planning/Organizing", "Self-reflection",
    "Cooking New Recipe", "DIY Project", "Gardening", "Knowledge Sharing", 
    "Therapy Session", "Skill Practice", "Documentary", "Board Game", "Reading News",
    "Learning Instrument", "Photography", "Creative Writing", "Goal Setting", 
    "Public Speaking", "Deep Conversation", "Hobby Time", "Nature Observation"
  ],
  Bonus: [
    "Community Service", "Family", "Personal Best", "Personal Goal", 
    "Bonus other", "Environmental Action", "Volunteering", "Teaching Others", 
    "Religious/Spiritual Practice", "Self-Care"
  ]
};

// Example team data
const teams = [
  { id: 1, name: "Alpha Team" },
  { id: 2, name: "Beta Squad" },
  { id: 3, name: "Gamma Force" }
];

// Updated sample posts data - organized by channel
const samplePosts = {
  public: [
    {
      id: 1,
      type: 'text',
      author: 'Jake',
      content: 'Perfect weather for outdoor activities today! 🌞',
      likes: 12,
      comments: [
        { id: 1, author: 'Sarah', content: 'Indeed, such a lovely day!' },
        { id: 2, author: 'Mike', content: "Let's go for a run together!" }
      ]
    },
    {
      id: 2,
      type: 'activity',
      author: 'Tina',
      activityType: 'Physical Exercise',
      activity: 'Running',
      duration: '45 mins',
      points: 5,
      progress: 68,
      likes: 24,
      comments: [
        { id: 1, author: 'Chris', content: 'Keep pushing forward! 💪' },
        { id: 2, author: 'Lisa', content: "Let's run together next time!" }
      ]
    },
    {
      id: 3,
      type: 'text',
      author: 'David',
      content: 'Just finished a meditation session, feeling so peaceful 🧘‍♂️',
      likes: 18,
      comments: [
        { id: 1, author: 'Emma', content: 'Meditation really helps!' }
      ]
    }
  ],
  team: {
    '1': [
      {
        id: 4,
        type: 'activity',
        author: 'Sarah',
        activityType: 'Mental Training',
        activity: 'Meditation',
        duration: '20 mins',
        points: 3,
        progress: 75,
        likes: 8,
        comments: [
          { id: 1, author: 'Tom', content: 'Group meditation is more effective!' },
          { id: 2, author: 'Jerry', content: 'Count me in next time!' }
        ]
      },
      {
        id: 5,
        type: 'text',
        author: 'Alex',
        content: 'Team A has completed 80% of our weekly goal! Keep it up! 📈',
        likes: 15,
        comments: [
          { id: 1, author: 'Lucy', content: "We're the best!" }
        ]
      }
    ],
    '2': [
      {
        id: 6,
        type: 'activity',
        author: 'Mike',
        activityType: 'Bonus Activity',
        activity: 'Community Service',
        duration: '2 hours',
        points: 8,
        progress: 100,
        likes: 15,
        comments: [
          { id: 1, author: 'Helen', content: 'Community service is so meaningful!' },
          { id: 2, author: 'Jack', content: 'I want to join next time!' }
        ]
      },
      {
        id: 7,
        type: 'text',
        author: 'Sophie',
        content: 'Team B just completed an amazing training session! 💪',
        likes: 12,
        comments: []
      }
    ],
    '3': [
      {
        id: 8,
        type: 'image',
        author: 'Lisa',
        content: 'Team C outdoor training photos!',
        imageUrl: 'https://picsum.photos/400/300',
        likes: 20,
        comments: [
          { id: 1, author: 'Peter', content: 'Looks like so much fun!' },
          { id: 2, author: 'Mary', content: 'Want to join next time!' }
        ]
      },
      {
        id: 9,
        type: 'text',
        author: 'Kevin',
        content: 'Thanks to every member of Team C, we set a new record this week! 🏆',
        likes: 25,
        comments: [
          { id: 1, author: 'Anna', content: 'The power of teamwork!' }
        ]
      }
    ]
  }
};

const ActivityModal = ({ visible, category, onClose, onActivityCreated }) => {
  const [selectedTime, setSelectedTime] = useState('1');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [userTeam, setUserTeam] = useState(null);
  const [userActivities, setUserActivities] = useState([]);
  const [loadingUserActivities, setLoadingUserActivities] = useState(false);
  
  // Get activities based on category and user preferences
  const activities = useMemo(() => {
    if (!category) return [];
    
    // If user has selected activities in their profile, use those
    if (userActivities.length > 0) {
      console.log(`Using ${userActivities.length} user-selected ${category} activities`);
      return userActivities;
    }
    
    // Fallback to default activities if no user preferences are found
    console.log(`Using default ${category} activities list`);
    return activityData[category] || [];
  }, [category, userActivities]);

  // Fetch user's team and activity preferences on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoadingUserActivities(true);
        
        // Fetch team data
        const teamData = await AsyncStorage.getItem('userTeam');
        if (teamData) {
          setUserTeam(JSON.parse(teamData));
        }
        
        // Fetch user profile data to get activity preferences
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          console.log('Fetched user data:', user?.name);
          
          // Debug: Print out activity settings
          if (user.activitySettings) {
            console.log('ACTIVITY SETTINGS:', JSON.stringify(user.activitySettings, null, 2));
            console.log('Physical Activities:', user.activitySettings.physicalActivities);
            console.log('Mental Activities:', user.activitySettings.mentalActivities);
            console.log('Bonus Activities:', user.activitySettings.bonusActivities);
            
            // Debug: Print out activity lists
            console.log('Physical Activities List Length:', physicalActivitiesList.length);
            console.log('Mental Activities List Length:', mentalActivitiesList.length);
            console.log('Bonus Activities List Length:', bonusActivitiesList.length);
          }
          
          if (user.activitySettings && category) {
            console.log('User has activity settings');
            
            // Map activity IDs to activity names based on category
            if (category === 'Physical' && Array.isArray(user.activitySettings.physicalActivities)) {
              console.log(`User has ${user.activitySettings.physicalActivities.length} physical activities`);
              
              // Debug: Print out the IDs to match
              console.log('Physical Activity IDs to match:', user.activitySettings.physicalActivities);
              
              // Check if any activity IDs match
              if (user.activitySettings.physicalActivities.length > 0) {
                // Get physical activities from profile
                const matchingActivities = physicalActivitiesList.filter(
                  activity => user.activitySettings.physicalActivities.some(
                    id => id === activity.id || id === activity.id.toString() || parseInt(id) === activity.id
                  )
                );
                
                // Debug: Print out the matching activities
                console.log('Matching Physical Activities:', matchingActivities.map(a => `${a.id}:${a.name}`));
                
                const selectedActivities = matchingActivities.map(activity => activity.name);
                
                console.log(`Found ${selectedActivities.length} matching physical activities`);
                
                if (selectedActivities.length > 0) {
                  setUserActivities(selectedActivities);
                } else {
                  // If no matches found, use default activities
                  console.log('No matching physical activities found, using defaults');
                  setUserActivities(activityData[category] || []);
                }
              } else {
                // If no activities selected, use default activities
                console.log('No physical activities selected, using defaults');
                setUserActivities(activityData[category] || []);
              }
            } 
            else if (category === 'Mental' && Array.isArray(user.activitySettings.mentalActivities)) {
              console.log(`User has ${user.activitySettings.mentalActivities.length} mental activities`);
              
              // Debug: Print out the IDs to match
              console.log('Mental Activity IDs to match:', user.activitySettings.mentalActivities);
              
              // Check if any activity IDs match
              if (user.activitySettings.mentalActivities.length > 0) {
                // Get mental activities from profile
                const matchingActivities = mentalActivitiesList.filter(
                  activity => user.activitySettings.mentalActivities.some(
                    id => id === activity.id || id === activity.id.toString() || parseInt(id) === activity.id
                  )
                );
                
                // Debug: Print out the matching activities
                console.log('Matching Mental Activities:', matchingActivities.map(a => `${a.id}:${a.name}`));
                
                const selectedActivities = matchingActivities.map(activity => activity.name);
                
                console.log(`Found ${selectedActivities.length} matching mental activities`);
                
                if (selectedActivities.length > 0) {
                  setUserActivities(selectedActivities);
                } else {
                  // If no matches found, use default activities
                  console.log('No matching mental activities found, using defaults');
                  setUserActivities(activityData[category] || []);
                }
              } else {
                // If no activities selected, use default activities
                console.log('No mental activities selected, using defaults');
                setUserActivities(activityData[category] || []);
              }
            }
            else if (category === 'Bonus' && Array.isArray(user.activitySettings.bonusActivities)) {
              console.log(`User has ${user.activitySettings.bonusActivities.length} bonus activities`);
              
              // Debug: Print out the IDs to match
              console.log('Bonus Activity IDs to match:', user.activitySettings.bonusActivities);
              
              // Check if any activity IDs match
              if (user.activitySettings.bonusActivities.length > 0) {
                // Get bonus activities from profile
                const matchingActivities = bonusActivitiesList.filter(
                  activity => user.activitySettings.bonusActivities.some(
                    id => id === activity.id || id === activity.id.toString() || parseInt(id) === activity.id
                  )
                );
                
                // Debug: Print out the matching activities
                console.log('Matching Bonus Activities:', matchingActivities.map(a => `${a.id}:${a.name}`));
                
                const selectedActivities = matchingActivities.map(activity => activity.name);
                
                console.log(`Found ${selectedActivities.length} matching bonus activities`);
                
                if (selectedActivities.length > 0) {
                  setUserActivities(selectedActivities);
                } else {
                  // If no matches found, use default activities
                  console.log('No matching bonus activities found, using defaults');
                  setUserActivities(activityData[category] || []);
                }
              } else {
                // If no activities selected, use default activities
                console.log('No bonus activities selected, using defaults');
                setUserActivities(activityData[category] || []);
              }
            } else {
              // If no category-specific settings, use default activities
              console.log(`No ${category} activities settings found, using defaults`);
              setUserActivities(activityData[category] || []);
            }
          } else {
            console.log('User has no activity settings or no category selected, using defaults');
            if (category) {
              setUserActivities(activityData[category] || []);
            } else {
              setUserActivities([]);
            }
          }
        } else {
          console.log('No user data found, using defaults');
          if (category) {
            setUserActivities(activityData[category] || []);
          } else {
            setUserActivities([]);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // On error, fall back to default activities
        if (category) {
          setUserActivities(activityData[category] || []);
        } else {
          setUserActivities([]);
        }
      } finally {
        setLoadingUserActivities(false);
      }
    };

    if (visible && category) {
      fetchUserData();
    } else {
      // Reset when modal is closed
      setSelectedActivity(null);
      setUserActivities([]);
    }
  }, [visible, category]);

  const getActivityIcon = (type, name) => {
    switch (type) {
      case 'Mental':
        switch (name) {
          case 'Meditation':
            return '🧘';
          case 'Reading':
            return '📚';
          case 'Writing':
            return '✍️';
          case 'Music Practice':
            return '🎵';
          case 'Mental Gym':
            return '🧠';
          case 'Duolingo':
            return '🦉';
          case 'Language Training':
            return '🗣️';
          case 'Cold shower':
            return '🚿';
          case 'Journal':
            return '📓';
          case 'Breathing exercise':
            return '💨';
          default:
            return '🧠';
        }
      case 'Physical':
        switch (name) {
          case 'Cricket':
            return '🏏';
          case 'Soccer':
            return '⚽';
          case 'Run':
            return '🏃';
          case 'Walk':
            return '🚶';
          case 'HIIT':
            return '🔥';
          case 'Gym Workout':
            return '💪';
          case 'Cycle':
            return '🚴';
          case 'Swim':
            return '🏊';
          case 'Home Workout':
            return '🏠';
          case 'Physio':
            return '🧑‍⚕️';
          case 'Yoga':
            return '🧘';
          case 'Squash':
            return '🎾';
          case 'Rugby':
            return '🏉';
          case 'Touch Rugby':
            return '👐';
          case 'Steps goal':
            return '👣';
          case 'DIY':
            return '🔨';
          case 'Gardening':
            return '🌱';
          default:
            return '💪';
        }
      case 'Bonus':
        switch (name) {
          case 'Community Service':
            return '🤝';
          case 'Family':
            return '👨‍👩‍👧‍👦';
          case 'Personal Best':
            return '🏆';
          case 'Personal Goal':
            return '🎯';
          case 'Environmental Action':
            return '🌳';
          case 'Volunteering':
            return '🙌';
          case 'Teaching Others':
            return '👨‍🏫';
          case 'Religious/Spiritual Practice':
            return '🕊️';
          case 'Self-Care':
            return '🧖';
          case 'Bonus other':
            return '✨';
          default:
            return '⭐';
        }
      default:
        return '📝';
    }
  };

  const handleConfirm = async () => {
    if (!selectedActivity) {
      Alert.alert('Error', 'Please select an activity');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('user');
      let userName = 'Anonymous';
      let userId = 'anonymous';
      let userAvatar = null;
      
      if (userData) {
        const parsedUser = JSON.parse(userData);
        userName = parsedUser.name || parsedUser.email?.split('@')[0] || 'Anonymous';
        userId = parsedUser.id || 'anonymous';
        userAvatar = parsedUser.avatarUrl || null;
      }
      
      // Convert time value to minutes
      // Format: "0.25" = 15 mins, "0.5" = 30 mins, "0.75" = 45 mins, "1" = 1 hour, etc.
      const durationInMinutes = parseFloat(selectedTime) * 60;
      
      // Create request body
      const requestBody = {
        type: category || 'Unknown',
        name: selectedActivity,
        duration: durationInMinutes,
        icon: getActivityIcon(category || 'Unknown', selectedActivity)
      };
      
      // Add teamId to the request if the user is in a team
      if (userTeam && userTeam._id) {
        requestBody.teamId = userTeam._id;
      }
      
      const response = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.ACTIVITIES.CREATE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('Activity creation response:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Activity created:', data);

        // Build complete activity data with user name and avatar
        const activityData = {
          ...data.data,
          type: category || 'Unknown',
          name: selectedActivity,
          duration: durationInMinutes,
          icon: getActivityIcon(category || 'Unknown', selectedActivity),
          createdAt: new Date().toISOString(),
          author: userName,
          userName: userName,
          userId: userId,
          avatarUrl: userAvatar
        };

        // Call parent component callback function
        onActivityCreated && onActivityCreated(activityData);
        onClose();
      } else {
        const errorData = await response.json();
        console.error('Failed to create activity:', errorData);
        Alert.alert('Error', errorData.message || 'Failed to create activity');
      }
    } catch (error) {
      console.error('Error creating activity:', error);
      Alert.alert('Error', 'Failed to create activity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log {category || 'Activity'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <View style={styles.timeSection}>
              <Text style={styles.modalLabel}>Select Duration (Hours)</Text>
              <View style={styles.pickerContainer}>
                <Picker 
                  selectedValue={selectedTime} 
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                  onValueChange={(itemValue) => {
                    setSelectedTime(itemValue);
                    console.log('Selected time:', itemValue);
                  }}
                >
                  <Picker.Item key="0.25" label="15 minutes" value="0.25" color="#333" />
                  <Picker.Item key="0.5" label="30 minutes" value="0.5" color="#333" />
                  <Picker.Item key="0.75" label="45 minutes" value="0.75" color="#333" />
                  {[...Array(8).keys()].map((num) => (
                    <Picker.Item key={num + 1} label={`${num + 1} hour${num > 0 ? 's' : ''}`} value={`${num + 1}`} color="#333" />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.activitySection}>
              <Text style={styles.modalLabel}>Select Activity</Text>
              <ScrollView style={styles.activityList}>
                <View style={styles.activityGrid}>
                {loadingUserActivities ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#3A8891" />
                    <Text style={styles.loadingText}>Loading your activities...</Text>
                  </View>
                ) : activities.length === 0 ? (
                  <View style={styles.emptyActivitiesContainer}>
                    <Text style={styles.emptyActivitiesText}>
                      No {category ? category.toLowerCase() : ''} activities found. Please set up your preferences in the Profile tab.
                    </Text>
                  </View>
                ) : (
                  activities.map((activity, index) => (
                    <TouchableOpacity 
                      key={index}
                      style={[
                        styles.activityGridItem,
                        selectedActivity === activity && styles.selectedActivity
                      ]}
                      onPress={() => {
                        setSelectedActivity(activity);
                        console.log('Selected activity:', activity);
                      }}
                    >
                      <Text style={[
                        styles.activityGridText,
                        selectedActivity === activity && styles.selectedActivityText
                      ]}>
                        {activity}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
                </View>
              </ScrollView>
            </View>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!selectedActivity || loading) && styles.disabledButton
              ]}
              onPress={handleConfirm}
              disabled={!selectedActivity || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const PostCard = ({ post, onPostUpdated }) => {
  const [comment, setComment] = useState('');
  const [localComments, setLocalComments] = useState(post?.comments || []);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [isLiked, setIsLiked] = useState(post?.isLikedByUser || false);
  const [likesCount, setLikesCount] = useState(post?.likesCount || 0);
  const [authorName, setAuthorName] = useState(post?.authorInfo?.name || 'Anonymous');
  const [authorAvatar, setAuthorAvatar] = useState(post?.authorInfo?.avatarUrl || null);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const loadCurrentUserId = async () => {
      const userId = await AsyncStorage.getItem('userId');
      setCurrentUserId(userId);
    };
    loadCurrentUserId();
  }, []);
  
  useEffect(() => {
    console.log('✅post.authorInfo.name', post.authorInfo.name);
    console.log('post.content', post.content);
    console.log('post.isLikedByUser', post.isLikedByUser);
    console.log('post.likesCount', post.likesCount);
    setAuthorName(post?.authorInfo?.name || 'Anonymous');
    setAuthorAvatar(post?.authorInfo?.avatarUrl || null);
    setIsLiked(post?.isLikedByUser || false);
    setLikesCount(post?.likesCount || 0);
    setLocalComments(post?.comments || []);
  }, [post]);

  const handleLike = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');
      if (!token || !userId) {
        console.error('No token or userId found for like action');
        return;
      }

      // 乐观更新
      const prevIsLiked = isLiked;
      const prevLikesCount = likesCount;
      
      console.log('Before like update:', {
        postId: post._id,
        currentUserId: userId,
        isLiked: isLiked,
        likesCount: likesCount
      });

    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

      console.log('Sending like request for post:', post._id);
      const response = await fetch(`${API_CONFIG.API_URL}/posts/${post._id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('Like response:', data);

      if (response.ok && data.success) {
        // 使用服务器返回的状态更新
        const serverLikeStatus = data.liked || data.likeStatus === 'Liked';
        const serverLikesCount = data.likesCount || data.totalLikes || 0;

        console.log('Server returned like status:', {
          liked: serverLikeStatus,
          likesCount: serverLikesCount
        });

        setIsLiked(serverLikeStatus);
        setLikesCount(serverLikesCount);
        
        if (onPostUpdated) {
          onPostUpdated({ ...post, isLikedByUser: serverLikeStatus, likesCount: serverLikesCount });
        }
      } else {
        // If request fails, restore previous state
        console.error('Failed to update like status:', data);
        setIsLiked(prevIsLiked);
        setLikesCount(prevLikesCount);
        Alert.alert('Error', data.message || 'Failed to update like status');
      }
    } catch (error) {
      // Restore previous state in case of error
      console.error('Error updating like status:', error);
      setIsLiked(isLiked);
      setLikesCount(likesCount);
      console.error('Error updating like status:', error);
      Alert.alert('Error', 'Failed to update like status');
    }
  };

  const handleShare = async (destination) => {
    try {
      if (destination === 'github') {
        const githubUrl = `https://github.com/share?text=${encodeURIComponent(post?.content || '')}`;
        Linking.openURL(githubUrl);
      } else {
        const token = await AsyncStorage.getItem('userToken');
        const response = await fetch(`${API_CONFIG.API_URL}/posts/${post?._id}/share`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            destination: destination
          })
        });

        if (response.ok) {
          Alert.alert('Success', 'Post shared successfully!');
        }
      }
    } catch (error) {
      console.error('Error sharing post:', error);
    }
    setShowShareOptions(false);
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert("Error", "You need to be logged in to comment.");
        return;
      }
      const response = await fetch(`${API_CONFIG.API_URL}/posts/${post?._id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: comment })
      });

      if (response.ok) {
        const newCommentData = await response.json();
        
        const formattedNewComment = {
          ...(newCommentData.comment || newCommentData),
          authorInfo: newCommentData.comment?.authorInfo || 
                      (newCommentData.authorInfo || 
                       { name: newCommentData.comment?.author || newCommentData.author || 'Anonymous', avatarUrl: null })
        };

        setLocalComments(prevComments => [...prevComments, formattedNewComment]);
        setComment('');
        setShowCommentInput(false);
        if (onPostUpdated) {
          onPostUpdated({ ...post, comments: [...localComments, formattedNewComment]});
        }
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const renderContent = () => {
    if (!post) return null;

    switch (post.type) {
      case 'activity':
  return (
          <View style={styles.activityCard}>
            <View style={styles.activityHeader}>
              <Text style={styles.activityTitle}>{post.activityType || 'Activity'}</Text>
              <Text style={styles.activityPoints}>+{post.points || 0} pts</Text>
            </View>
            <View style={styles.activityDetails}>
              <Text style={styles.activityText}>Activity: {post.activity || 'Unknown'}</Text>
              <Text style={styles.activityText}>Duration: {post.duration || '0 mins'}</Text>
              <Text style={styles.activityText}>Personal target completed: {post.progress || 0}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: `${post.progress || 0}%` }]} />
              </View>
            </View>
          </View>
        );
      case 'image':
        return (
          <View>
            <Text style={styles.postContent}>{post.content}</Text>
            {post.imageUrl && (
            <Image 
              source={{ uri: post.imageUrl }}
              style={styles.postImage}
            />
            )}
          </View>
        );
      default:
        return <Text style={styles.postContent}>{post.content || ''}</Text>;
    }
  };

  if (!post) {
    return null;
  }

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            {authorAvatar ? (
              <Image 
                source={{ uri: authorAvatar }} 
                style={{ width: '100%', height: '100%', borderRadius: 18 }}
                onError={() => setAuthorAvatar(null)}
              />
            ) : (
              <Text style={styles.avatarText}>{authorName?.[0] || '?'}</Text>
            )}
          </View>
          <View style={styles.userInfoText}>
            <Text style={styles.username}>{authorName}</Text>
            <Text style={styles.postTime}>
              {new Date(post.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
              })}
            </Text>
          </View>
        </View>
      </View>
      {renderContent()}
      
      {localComments.length > 0 && (
        <View style={styles.commentsSection}>
          {localComments.map((commentItem, index) => (
            <View key={commentItem.id || commentItem._id || index} style={styles.commentContainer}>
              <View style={styles.commentHeader}>
                <View style={styles.commentAvatar}>
                  {commentItem.authorInfo?.avatarUrl ? (
                    <Image 
                      source={{ uri: commentItem.authorInfo.avatarUrl }} 
                      style={{ width: '100%', height: '100%', borderRadius: 11 }}
                      onError={(e) => { /* console.log("Error loading comment author avatar", e.nativeEvent.error); */ }}
                    />
                  ) : (
                    <Text style={styles.commentAvatarText}>
                      {commentItem.authorInfo?.name?.[0] || 'A'}
                    </Text>
                  )}
                </View>
                <Text style={styles.commentAuthor}>{commentItem.authorInfo?.name || 'Anonymous'}</Text>
                <Text style={styles.commentContent}>{commentItem.content || ''}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.socialButtonsContainer}>
        <TouchableOpacity 
          style={styles.socialButton} 
          onPress={() => setShowCommentInput(!showCommentInput)}
        >
          <Ionicons name="chatbubble-outline" size={24} color="#666" />
          <Text style={styles.socialButtonText}>{localComments.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.socialButton}
          onPress={handleLike}
        >
          <Ionicons 
            name={isLiked ? "heart" : "heart-outline"} 
            size={24} 
            color={isLiked ? "#ff4b4b" : "#666"} 
          />
          <Text style={[
            styles.socialButtonText,
            isLiked && { color: '#ff4b4b' }
          ]}>
            {likesCount}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.socialButton}
          onPress={() => setShowShareOptions(true)}
        >
          <Ionicons name="share-social-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showShareOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowShareOptions(false)}
      >
        <TouchableOpacity 
          style={styles.shareModalOverlay}
          activeOpacity={1}
          onPress={() => setShowShareOptions(false)}
        >
          <View style={styles.shareModalContent}>
            <TouchableOpacity 
              style={styles.shareOption}
              onPress={() => handleShare('github')}
            >
              <Ionicons name="logo-github" size={24} color="#666" />
              <Text style={styles.shareOptionText}>Share to GitHub</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {showCommentInput && (
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            value={comment}
            onChangeText={setComment}
            onSubmitEditing={handleAddComment}
          />
          <TouchableOpacity 
            style={styles.sendButton}
            onPress={handleAddComment}
          >
            <Ionicons name="send" size={24} color="#4A90E2" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const StatsCard = ({ title, personalProgress, teamProgress }) => (
  <View style={styles.statsCard}>
    <View style={styles.statsHeader}>
      <Text style={styles.statsTitle}>{title}</Text>
      {title.includes('mental') && <Ionicons name="diamond" size={20} color="#6c63ff" />}
    </View>
    <View style={styles.statsContent}>
      <View style={styles.statsProgressContainer}>
        {/* 团队目标进度条 */}
        <View style={styles.statsProgressRow}>
          <View style={styles.progressLabel}>
            <Text style={styles.progressLabelText}>Team Target</Text>
          </View>
          <View style={styles.statsProgressBarBackground}>
            <View 
              style={[
                styles.statsProgressBarFill, 
                { width: `${teamProgress}%` }
              ]} 
            />
          </View>
          <Text style={styles.statsProgressText}>{teamProgress}%</Text>
        </View>
        
        {/* 个人目标进度条 */}
        <View style={styles.statsProgressRow}>
          <View style={styles.progressLabel}>
            <Text style={styles.progressLabelText}>Personal Target</Text>
          </View>
          <View style={styles.statsProgressBarBackground}>
            <View 
              style={[
                styles.statsProgressBarFill, 
                { width: `${personalProgress}%`, backgroundColor: '#ff9800' }
              ]} 
            />
          </View>
          <Text style={styles.statsProgressText}>{personalProgress}%</Text>
        </View>
      </View>
    </View>
  </View>
);

const AddContentModal = ({ visible, onClose, onPostCreated }) => {
  const [selectedChannel, setSelectedChannel] = useState('public');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    try {
      console.log('Starting post submission...');
      setLoading(true);
      setError('');

      const token = await AsyncStorage.getItem('userToken');
      // console.log('Retrieved token:', token); // Sensitive: Token printed
      
      if (!token) {
        console.error('No token found in AsyncStorage');
        setError('Please login again');
        setLoading(false);
        return;
      }

      if (!content.trim()) {
        console.error('Content is empty');
        setError('Content is required');
        setLoading(false);
        return;
      }

      const postData = {
        content: content.trim(),
        channelType: selectedChannel?.type || 'public'
      };

      // Add teamId if it's a team post
      if (selectedChannel?.type === 'team' && selectedChannel?.teamId) {
        postData.teamId = selectedChannel.teamId;
      }

      console.log('Sending post data:', postData);

      const response = await fetch(`${API_CONFIG.API_URL}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(postData)
      });

      if (!response.ok) {
        const responseData = await response.json();
        throw new Error(responseData.message || 'Failed to create post');
      }

      const responseData = await response.json();
      console.log('Server response:', responseData);

      // Clear form and close modal
        setContent('');
        onClose();
      
      // Refresh posts list
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setError(error.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Create New Post</Text>
          
          {/* Error Message */}
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          {/* Content Input */}
            <TextInput
              style={styles.contentInput}
              placeholder="What's on your mind?"
              placeholderTextColor="#888"
              multiline
              value={content}
              onChangeText={setContent}
            />

          {/* Action Buttons */}
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
              <Text style={styles.modalButtonText}>Share</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
        </View>
    </View>
      </View>
    </Modal>
  );
};

const HomeScreen = () => {
  const [selectedFeed, setSelectedFeed] = useState('all');
  const [userStats, setUserStats] = useState(null);
  const [feedItems, setFeedItems] = useState([]);
  const [activities, setActivities] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showContentModal, setShowContentModal] = useState(false);
  const [currentUtcTime, setCurrentUtcTime] = useState('');
  const [checkingCategoryLimit, setCheckingCategoryLimit] = useState(null);
  const [weeklyLimitsUnlocked, setWeeklyLimitsUnlocked] = useState(false);
  const [weekCycleEndTime, setWeekCycleEndTime] = useState('');
  const [timeUntilReset, setTimeUntilReset] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreItems, setHasMoreItems] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const PAGE_LIMIT = 10;

  // Calculate UTC week cycle (starts on Monday 00:00 UTC)
  const calculateWeekCycle = () => {
    const now = new Date();
    const currentUtcDay = now.getUTCDay(); // 0 (Sunday) to 6 (Saturday)
    const daysUntilNextMonday = currentUtcDay === 0 ? 1 : 8 - currentUtcDay; // If Sunday (0), next Monday is 1 day away
    
    // Calculate next Monday at 00:00 UTC
    const nextMonday = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + daysUntilNextMonday,
      0, 0, 0, 0
    ));
    
    // Convert UTC time to local time for display
    const nextMondayLocal = new Date(nextMonday);
    
    // Format the date and time in user's local timezone (without weekday)
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    };
    
    const formattedEndTime = nextMondayLocal.toLocaleDateString(undefined, options);
    setWeekCycleEndTime(formattedEndTime);
    
    // Calculate time remaining until reset
    const msUntilReset = nextMonday.getTime() - now.getTime();
    const daysLeft = Math.floor(msUntilReset / (1000 * 60 * 60 * 24));
    const hoursLeft = Math.floor((msUntilReset % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutesLeft = Math.floor((msUntilReset % (1000 * 60 * 60)) / (1000 * 60));
    
    setTimeUntilReset(`${daysLeft}d ${hoursLeft}h ${minutesLeft}m`);
    
    return { nextMonday, msUntilReset };
  };
  
  // Check if weekly reset is needed
  const checkWeeklyReset = async () => {
    try {
      // Get the last reset time from AsyncStorage
      const lastResetTimeStr = await AsyncStorage.getItem('lastWeeklyReset');
      const now = new Date();
      
      // If no last reset time, store current time and return
      if (!lastResetTimeStr) {
        await AsyncStorage.setItem('lastWeeklyReset', now.toISOString());
        return false;
      }
      
      const lastResetTime = new Date(lastResetTimeStr);
      
      // Check if we're in a new UTC week cycle since the last reset
      // UTC week starts on Sunday 00:00 (day 0)
      const lastResetDay = lastResetTime.getUTCDay();
      const currentDay = now.getUTCDay();
      
      // Calculate start of current week (Sunday 00:00 UTC)
      const startOfCurrentWeek = new Date(now);
      startOfCurrentWeek.setUTCDate(now.getUTCDate() - currentDay);
      startOfCurrentWeek.setUTCHours(0, 0, 0, 0);
      
      // Calculate start of last reset week
      const lastResetDayOffset = lastResetTime.getUTCDay();
      const startOfLastResetWeek = new Date(lastResetTime);
      startOfLastResetWeek.setUTCDate(lastResetTime.getUTCDate() - lastResetDayOffset);
      startOfLastResetWeek.setUTCHours(0, 0, 0, 0);
      
      // Check if we've crossed into a new week
      const isNewWeekCycle = startOfCurrentWeek.getTime() > startOfLastResetWeek.getTime();
      
      console.log('Weekly reset check:', {
        lastResetTime: lastResetTime.toISOString(),
        currentTime: now.toISOString(),
        startOfCurrentWeek: startOfCurrentWeek.toISOString(),
        startOfLastResetWeek: startOfLastResetWeek.toISOString(),
        isNewWeekCycle
      });
      
      if (isNewWeekCycle) {
        console.log("New week cycle detected, resetting stats...");
        
        // Reset stats and store new reset time
        await AsyncStorage.setItem('lastWeeklyReset', now.toISOString());
        
        // Reset user stats by calling backend endpoint
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const response = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.USER.RESET_WEEKLY_STATS}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            }
          });
          
          if (response.ok) {
            console.log("Weekly stats reset successfully");
            // After reset, fetch updated stats
            await fetchUserStats();
            return true;
          } else {
            console.error("Failed to reset weekly stats:", await response.text());
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error("Error checking weekly reset:", error);
      return false;
    }
  };

  // Check if weekly limits are unlocked
  const checkWeeklyLimits = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userTeam = await AsyncStorage.getItem('userTeam');
      
      if (!token || !userTeam) return;
      
      const team = JSON.parse(userTeam);
      
      // Get today's date at UTC midnight
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      
      // Calculate cycle start date based on team creation date
      const creationDate = new Date(team.createdAt);
      const cycleStartDate = new Date(Date.UTC(
        creationDate.getUTCFullYear(),
        creationDate.getUTCMonth(),
        creationDate.getUTCDate(),
        0, 0, 0, 0
      ));
      
      // Calculate days since creation
      const msSinceCreation = todayStart.getTime() - cycleStartDate.getTime();
      const daysSinceCreation = Math.floor(msSinceCreation / (1000 * 60 * 60 * 24));
      
      // Calculate current cycle index (0-based)
      const currentCycleIndex = Math.floor(daysSinceCreation / 7);
      
      // Calculate current cycle start date
      const currentCycleStart = new Date(cycleStartDate);
      currentCycleStart.setUTCDate(cycleStartDate.getUTCDate() + currentCycleIndex * 7);
      
      // Calculate current cycle end date
      const currentCycleEnd = new Date(currentCycleStart);
      currentCycleEnd.setUTCDate(currentCycleStart.getUTCDate() + 7);
      
      // Get activities for the current week cycle
      const response = await fetch(
        `${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.ACTIVITIES.LIST}?startDate=${currentCycleStart.toISOString()}&endDate=${currentCycleEnd.toISOString()}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.activities) {
          // Count mental and physical activities
          let mentalCount = 0;
          let physicalCount = 0;
          
          data.data.activities.forEach(activity => {
            if (activity.type === 'Mental') mentalCount++;
            if (activity.type === 'Physical') physicalCount++;
          });
          
          // Check if both limits are reached
          const mentalLimitReached = mentalCount >= team.weeklyLimitMental;
          const physicalLimitReached = physicalCount >= team.weeklyLimitPhysical;
          
          setWeeklyLimitsUnlocked(mentalLimitReached && physicalLimitReached);
        }
      }
    } catch (error) {
      console.error('Error checking weekly limits:', error);
    }
  };

  useEffect(() => {
    // Update UTC time and week cycle end time every minute
    const updateTimes = () => {
      setCurrentUtcTime(new Date().toUTCString());
      calculateWeekCycle();
    };
    
    updateTimes();
    const intervalId = setInterval(updateTimes, 60000); // Update every minute
    
    // Check for weekly reset on component mount
    checkWeeklyReset();
    
    return () => clearInterval(intervalId);
  }, []);

  const handleCategorySelect = async (category) => {
    if (category === 'Physical' || category === 'Mental') {
      setCheckingCategoryLimit(category);
      try {
        const token = await AsyncStorage.getItem('userToken');
        console.log(`[handleCategorySelect] User B - Token from AsyncStorage: ${token ? 'TOKEN_EXISTS' : 'NO_TOKEN'}`); // Check token for User B
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart);
        todayEnd.setUTCDate(todayStart.getUTCDate() + 1);
        
        const fetchUrl = `${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.ACTIVITIES.LIST}?type=${category}&startDate=${todayStart.toISOString()}&endDate=${todayEnd.toISOString()}`;
        console.log(`[handleCategorySelect] User B - Fetching URL: ${fetchUrl}`);

        const response = await fetch(fetchUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const responseText = await response.text(); // Get text first to avoid parsing error if not JSON
        console.log(`[handleCategorySelect] User B - Response status: ${response.status}, Response text: ${responseText}`);

        if (response.ok) {
          let responseData;
          try {
            responseData = JSON.parse(responseText); // Manually parse after logging text
          } catch (e) {
            console.error('[handleCategorySelect] User B - JSON.parse error:', e, 'Raw response text was:', responseText);
            const errMessage = 'Error parsing server response for daily limit check.';
            if (Platform.OS === 'web') { alert(errMessage); } else { Alert.alert('Error', errMessage); }
            return;
          }

          console.log('[handleCategorySelect] User B - Parsed responseData:', JSON.stringify(responseData));
          
          // THIS IS THE CRITICAL CHECK - We need to verify activities are from current day
          if (responseData.success && responseData.data && responseData.data.activities && responseData.data.activities.length > 0) {
            // Verify activities are from current UTC day
            const activitiesFromToday = responseData.data.activities.filter(activity => {
              const activityDate = new Date(activity.createdAt);
              return activityDate >= todayStart && activityDate < todayEnd;
            });
            
            if (activitiesFromToday.length > 0) {
              console.log('[handleCategorySelect] User B - Daily limit IS REACHED based on frontend check. Activities found in today\'s date range:', activitiesFromToday.length);
              const message = `You can only log 1 point for ${category.toLowerCase()} activities per day.`;
              if (Platform.OS === 'web') {
                alert(message);
              } else {
                Alert.alert('Daily Limit Reached', message, [{ text: 'OK' }]);
              }
              return;
            } else {
              console.log('[handleCategorySelect] User B - No activities found in today\'s date range. Activities array exists but all from different days.');
            }
          } else {
            console.log('[handleCategorySelect] User B - Daily limit NOT reached based on frontend check. Activities array:', responseData.data?.activities);
          }
          setSelectedCategory(category);
          setShowActivityModal(true);
        } else {
          console.error(`[handleCategorySelect] User B - Server responded with ${response.status}. Raw response text: ${responseText}`);
          const errorData = responseText ? JSON.parse(responseText) : { message: 'Could not verify daily limit. Please try again.' };
          const errorMessage = errorData.message || 'Could not verify daily limit. Please try again.';
          if (Platform.OS === 'web') {
            alert(errorMessage);
          } else {
            Alert.alert('Error', errorMessage);
          }
          return; 
        }
      } catch (error) {
        const errorMessage = 'An error occurred while checking your daily limits. Please try again.';
        console.error(`[handleCategorySelect] User B - Catch block error:`, error);
        if (Platform.OS === 'web') {
          alert(errorMessage);
        } else {
          Alert.alert('Error', errorMessage);
        }
        return; 
      } finally {
        setCheckingCategoryLimit(null); 
      }
    } else {
      setSelectedCategory(category);
      setShowActivityModal(true);
    }
  };

  const handleActivityCreated = async (newActivity) => {
    try {
      // Only update stats, not fetchActivities to avoid overwriting weekly stats
      await fetchUserStats();
      
      // Show a success message
      Alert.alert('Success', `Logged ${newActivity.type} activity: ${newActivity.name}`);
    } catch (error) {
      console.error('Error refreshing data after activity creation:', error);
    }
  };

  const getSortedFeed = () => {
    return feedItems;
  };

  // focus update info
  useFocusEffect(
    useCallback(() => {
      const loadInitialFeed = async (isRefreshing = false) => {
        if (!isRefreshing) setLoading(true);
        else setRefreshing(true);

        console.log("HomeScreen focused, reloading data for current user...");
        try {
          const token = await AsyncStorage.getItem('userToken');
          if (!token) {
            console.log("No token found on focus, user might be logged out.");
            setFeedItems([]); // Clear feed if no token
            setActivities([]);
            setPosts([]);
            setUserStats(null);
            if (!isRefreshing) setLoading(false);
            else setRefreshing(false);
            return;
          }
          
          await ensureCompleteUserData();
          await fetchFeedItems(1, isRefreshing); // Fetch first page of combined feed
          await fetchUserStats(); // Keep fetching user stats separately if needed
          // checkWeeklyLimits(); // Keep if still relevant
        } catch (error) {
          console.error('Error loading data on focus/refresh:', error);
          if (isRefreshing) setRefreshing(false);
          else setLoading(false);
        }
      };

      loadInitialFeed(false); // Initial load

      return () => {
        console.log("HomeScreen out of focus");
      };
    }, [])
  );
  
  // Function to ensure user data is complete and valid
  const ensureCompleteUserData = async () => {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (!userJson) {
        console.log('No user data found, fetching from API...');
        // Try to fetch from API using the userService
        const { userService } = require('../../services/api');
        const userData = await userService.getUserProfile();
        if (userData) {
          console.log('Successfully fetched user data from API');
          return;
        }
        return;
      }
      
      const userData = JSON.parse(userJson);
      
      // Check if the name is a placeholder like "guest user"
      const isPlaceholderName = !userData.name || 
                               userData.name === 'User' || 
                               userData.name === 'guest user' || 
                               userData.name === 'Anonymous' || 
                               userData.name.toLowerCase() === 'unknown user';
      
      if (isPlaceholderName) {
        console.log('User has placeholder name, trying to update it...');
        
        // Try to find a better name
        let betterName = null;
        
        if (userData.email && userData.email.includes('@')) {
          betterName = userData.email.split('@')[0];
        } else if (userData.username) {
          betterName = userData.username;
        }
        
        if (betterName) {
          console.log(`Updating user name from "${userData.name}" to "${betterName}"`);
          userData.name = betterName;
          
          // Save updated user data
          await AsyncStorage.setItem('user', JSON.stringify(userData));
          
          // Try to update on the server as well
          try {
            const { userService } = require('../../services/api');
            await userService.updateUserProfile({
              id: userData.id || userData._id,
              name: betterName
            });
            console.log('Successfully updated name on server');
          } catch (serverError) {
            console.warn('Failed to update name on server:', serverError);
          }
        }
      }
    } catch (error) {
      console.error('Error ensuring complete user data:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.log('No token found for fetchPosts');
        setPosts([]);
        return;
      }
      console.log('Fetching posts with token...');
      const response = await fetch(`${API_CONFIG.API_URL}/posts`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        const postsWithLikeInfo = data.map(post => ({ ...post, isLikedByUser: post.isLikedByUser || false, likesCount: post.likesCount || 0 }));
        setPosts(postsWithLikeInfo);
      } else {
        console.error('Failed to fetch posts:', await response.text());
        setPosts([]);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
    }
  };

  const fetchUserStats = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.log('No token found for fetchUserStats');
        setUserStats(null);
        return;
      }
      console.log('Fetching user stats with token...');
      const response = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.USER.STATS}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        console.error('Failed to fetch user stats:', response.status);
        // Fallback to default values if the API call fails
        setUserStats(prevStats => ({ 
          ...prevStats, 
          totalPoints: 0, 
          totalActivities: 0, 
          currentStreak: 0, 
          monthlyProgress: 0 
        }));
        return;
      }
      
      const data = await response.json();
      console.log('data', data);
      console.log('Updated userStats', data.totalPoints, data.totalActivities, data.currentStreak, data.monthlyProgress);
      setUserStats(prevStats => ({ 
        ...prevStats, 
        totalPoints: data.totalPoints || 0, 
        totalActivities: data.totalActivities || 0, 
        currentStreak: data.currentStreak || 0, 
        monthlyProgress: data.monthlyProgress || 0 
      }));
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
      setUserStats(prevStats => ({ 
        ...prevStats, 
        totalPoints: 0, 
        totalActivities: 0, 
        currentStreak: 0, 
        monthlyProgress: 0 
      }));
    }
  };

  const fetchActivities = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.log('No token found for fetchActivities');
        setActivities([]);
        setUserStats(prevStats => ({ ...(prevStats || {}), totalPoints: 0, totalActivities: 0 }));
        
        // Try to handle the missing token - check if we have a user object that might help
        const userJson = await AsyncStorage.getItem('user');
        if (userJson) {
          const user = JSON.parse(userJson);
          if (user && user.id) {
            console.log('Found user data but no token, attempting to restore session...');
            
            // Try to refresh login session using available data
            const refreshToken = await AsyncStorage.getItem('refreshToken');
            if (refreshToken) {
              try {
                const apiUrl = API_CONFIG.API_URL;
                const refreshResponse = await fetch(`${apiUrl}/auth/refresh`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ refreshToken })
                });
                
                if (refreshResponse.ok) {
                  const refreshData = await refreshResponse.json();
                  if (refreshData.token) {
                    console.log('Successfully refreshed token');
                    await AsyncStorage.setItem('userToken', refreshData.token);
                    // Retry fetching activities with new token
                    fetchActivities();
                    return;
                  }
                }
              } catch (refreshError) {
                console.error('Error refreshing token:', refreshError);
              }
            }
          }
        }
        
        return;
      }
      
      console.log('Fetching activities with token...');
      const response = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.ACTIVITIES.LIST}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Check for auth errors
      if (response.status === 401 || response.status === 403) {
        console.warn('Authentication error in fetchActivities, attempting to refresh token...');
        
        // Try to refresh the token
        const refreshed = await refreshAuthToken();
        if (refreshed) {
          console.log('Token refreshed, retrying activities fetch');
          // Retry with fresh token
          setTimeout(() => fetchActivities(), 500);
          return;
        }
        
        console.error('Unable to refresh authentication token');
        setActivities([]);
        // setUserStats(prevStats => ({ ...(prevStats || {}), totalPoints: 0, totalActivities: 0 }));
        // Remove setting userStats, avoid overwriting this week's stats
        return;
      }
      
      const data = await response.json();
      if (response.ok && data.success) {
        setActivities(data.data?.activities || []);
        // Remove setting userStats, avoid overwriting this week's stats
        // setUserStats(prevStats => ({ ...(prevStats || {}), totalPoints: data.data?.stats?.totalPoints || 0, totalActivities: data.
        // data?.pagination?.total || 0 }));
      } else {
        console.error('Failed to fetch activities:', data.message || 'Unknown error');
        setActivities([]);
        // Remove setting userStats, avoid overwriting this week's stats
        // setUserStats(prevStats => ({ ...(prevStats || {}), totalPoints: 0, totalActivities: 0 }));
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
      // Remove setting userStats, avoid overwriting this week's stats
      // setUserStats(prevStats => ({ ...(prevStats || {}), totalPoints: 0, totalActivities: 0 }));
    }
  };

    // ADDED: fetchFeedItems function
  const fetchFeedItems = async (page, isRefreshing = false) => {
    if (loadingMore && !isRefreshing) return; // Prevent multiple loads
    if (!hasMoreItems && !isRefreshing && page > 1) return; // No more items to load

    // console.log(`Fetching feed: page ${page}, refreshing: ${isRefreshing}`);

    if (isRefreshing) {
      // console.log('Refreshing feed, setting page to 1');
      setCurrentPage(1);
      setHasMoreItems(true); // Reset hasMore on refresh
      // setLoading(true); // setLoading(true) is handled by loadInitialFeed or onRefresh itself
    } else if (page > 1) {
      // console.log('Loading more feed items');
      setLoadingMore(true);
    } else { // Initial load for page 1 (not a refresh action)
      // console.log('Initial feed load (page 1)');
      if (!refreshing) setLoading(true); // Main loading for initial fetch if not already refreshing
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setFeedItems([]);
        setHasMoreItems(false);
        // if (isRefreshing) setRefreshing(false); else if (page === 1) setLoading(false);
        // setLoadingMore(false);
        return;
      }

      const apiUrl = await getApiUrl(); // Assuming getApiUrl correctly points to your base (e.g. http://localhost:5001)
      const response = await fetch(`${apiUrl}/feed?page=${page}&limit=${PAGE_LIMIT}`, { // Use /feed endpoint
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        console.warn('Authentication error in fetchFeedItems, attempting to refresh token...');
        const refreshed = await refreshAuthToken(); // Ensure refreshAuthToken is available
        if (refreshed) {
          fetchFeedItems(page, isRefreshing); // Retry with the same page
          return;
        }
        console.error('Unable to refresh authentication token for feed');
        setFeedItems(isRefreshing ? [] : []);
        setHasMoreItems(false);
        return;
      }

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        const fetchedItems = responseData.data?.feed || [];
        const pagination = responseData.data?.pagination;
        const newHasMore = pagination?.hasNextPage || false;

        // console.log(`Fetched ${fetchedItems.length} items. HasMore: ${newHasMore}`);

        setFeedItems(prevItems =>
          (page === 1 || isRefreshing) ? fetchedItems : [...prevItems, ...fetchedItems]
        );
        setHasMoreItems(newHasMore);
        if (pagination?.page) setCurrentPage(pagination.page);
      } else {
        console.error('Failed to fetch feed items:', responseData.message || await response.text());
        if (isRefreshing || page === 1) setFeedItems([]);
        setHasMoreItems(false);
      }
    } catch (error) {
      console.error('Error fetching feed items:', error);
      if (isRefreshing || page === 1) setFeedItems([]); // Clear on error for initial or refresh
      setHasMoreItems(false);
    } finally {
      if (isRefreshing) setRefreshing(false);
      if (page === 1 && !isRefreshing) setLoading(false); // Turn off main loading for initial non-refresh
      setLoadingMore(false);
    }
  };

  const handlePostCreated = async () => {
    try {
      // await Promise.all([
      //   fetchActivities(),
      //   fetchPosts()
      // ]);
      // only refresh feed and posts, not fetchActivities to avoid overwriting this week's stats
      await fetchFeedItems(1, true);
    } catch (error) {
      console.error('Error refreshing data after post creation:', error);
    }
  };

  const renderActionButtons = () => {
    const isLoadingPhysical = checkingCategoryLimit === 'Physical';
    const isLoadingMental = checkingCategoryLimit === 'Mental';

    return (
      <View style={styles.actionButtonsContainer}>
        <View style={styles.utcTimeContainer}>
          {/* <Text style={styles.utcTimeText}>Current UTC Time: {currentUtcTime}</Text> */}
          <Text style={styles.resetCountdownText}>Week starts every Sunday 00:00 UTC</Text>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.physicalButton, isLoadingPhysical && styles.disabledButtonVisual]}
            onPress={() => handleCategorySelect('Physical')}
            disabled={isLoadingPhysical}
          >
            {isLoadingPhysical ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <FontAwesome5 name="running" size={18} color="white" />
                <Text style={styles.actionButtonText}>Physical</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.mentalButton, isLoadingMental && styles.disabledButtonVisual]}
            onPress={() => handleCategorySelect('Mental')}
            disabled={isLoadingMental}
          >
            {isLoadingMental ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <FontAwesome5 name="brain" size={18} color="white" />
                <Text style={styles.actionButtonText}>Mental</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.bonusButton]}
            onPress={() => handleCategorySelect('Bonus')}
            disabled={checkingCategoryLimit !== null}
          >
            <FontAwesome5 name="star" size={18} color="white" />
            <Text style={styles.actionButtonText}>Bonus</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ImageBackground 
        source={require('../../../assets/analytics_bg.png')}
        style={styles.backgroundImage}
        imageStyle={{ opacity: 0.16 }}
      >
        <LinearGradient
          colors={['#F4F9FF', '#FFFFFF']}
          style={styles.container}
        >
          <View style={styles.mainContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerCenter}>
                <Ionicons name="home" size={28} color="#3A8891" />
              </View>
            </View>

            {/* Weekly Limits Unlocked Notification */}
            {weeklyLimitsUnlocked && (
              <View style={styles.notificationBanner}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.notificationText}>
                  Weekly limits unlocked! You can log additional activities.
                </Text>
              </View>
            )}

            {/* Stats Section */}
            <View style={styles.statsSection}>
              {/* Activity Statistics */}
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Ionicons name="trophy" size={20} color="#007AFF" />
                  <Text style={styles.statValue}>{userStats?.totalPoints || 0}</Text>
                  <Text style={styles.statLabel}>Points</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="calendar" size={20} color="#007AFF" />
                  <Text style={styles.statValue}>{userStats?.totalActivities || 0}</Text>
                  <Text style={styles.statLabel}>Activities</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="flame" size={20} color="#007AFF" />
                  <Text style={styles.statValue}>{userStats?.currentStreak || 0}</Text>
                  <Text style={styles.statLabel}>Streak</Text>
                </View>
              </View>
            </View>

            {/* Combined Feed */}
            <View style={styles.feedContainer}>
              <ScrollView 
                style={styles.feed}
                contentContainerStyle={{ flexGrow: 1, width: '100%' }} 
                onScroll={({ nativeEvent }) => {
                  const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                  const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 200;
                  if (isCloseToBottom && hasMoreItems && !loadingMore && !refreshing && !loading) {
                    // console.log("Scrolled near bottom, attempting to load more feed items...");
                    fetchFeedItems(currentPage + 1);
                  }
                }}
                scrollEventThrottle={400}
                refreshControl={
                  <RefreshControl 
                    refreshing={refreshing} 
                    onRefresh={() => {
                      // console.log("Pull to refresh triggered for feed");
                      fetchFeedItems(1, true); // Fetch page 1 and mark as refreshing
                    }} 
                  />
                }
              >
                {(loading && feedItems.length === 0 && !refreshing) ? ( // Show main loader only on initial load
                  <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
                ) : getSortedFeed().length === 0 ? (
                  <View style={styles.emptyFeedContainer}>
                    <Text style={styles.emptyFeedText}>No activities or posts yet. Start logging or post something!</Text>
                  </View>
                ) : (
                  console.log('loading', loading),
                  console.log('feedItems.length', feedItems.length),
                  console.log('refreshing', refreshing),
                  getSortedFeed().map((item) => {
                    if (!item || (!item.id && !item._id)) { // Add a check for valid item
                      console.warn("Encountered an item without id or _id:", item);
                      return null; 
                    }
                    const key = `${item.itemType}-${item.id || item._id}-${item.createdAt}`; // More unique key
                    if (item.itemType === 'activity') {
                      return (
                        <ActivityCard
                          key={key}
                          activity={item}
                          onRefresh={() => fetchFeedItems(1, true)} // Pass refresh if ActivityCard needs it
                        />
                      );
                    } else if (item.itemType === 'post') {
                      return (
                        <PostCard 
                          key={key}
                          post={item}
                          onPostUpdated={() => fetchFeedItems(1, true)} // If PostCard modifies data
                        />
                      );
                    }
                    return null; // Should not happen
                  })
                )}
                {/* Loading more indicator at the bottom */}
                {loadingMore && (
                  <ActivityIndicator size="small" color="#007AFF" style={{ marginVertical: 20 }} />
                )}
              </ScrollView>

              {/* Floating Post Button */}
              <TouchableOpacity 
                style={styles.floatingPostButton}
                onPress={() => setShowContentModal(true)}
                disabled={checkingCategoryLimit !== null}
              >
                <FontAwesome5 name="edit" size={20} color="white" />
              </TouchableOpacity>
            </View>

            <ActivityModal
              visible={showActivityModal}
              category={selectedCategory}
              onClose={() => {
                setShowActivityModal(false);
              }}
              onActivityCreated={handleActivityCreated}
            />

            <AddContentModal
              visible={showContentModal}
              onClose={() => setShowContentModal(false)}
              onPostCreated={handlePostCreated}
            />

            {renderActionButtons()} 
          </View>
        </LinearGradient>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#E8F0F2',
    paddingHorizontal: 0,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    backgroundColor: '#f8f9fa',
    position: 'relative',
  },
  gradient: {
    flex: 1,
    backgroundColor: 'rgba(248, 250, 252, 0.95)',
  },
  mainContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'rgba(248, 250, 252, 0.95)',
    paddingHorizontal: 0,
  },
  header: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
    zIndex: 1,
  },
  headerCenter: {
    alignItems: 'center',
  },
  statsSection: {
    padding: 6,
    paddingVertical: 4,
    backgroundColor: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around', 
    flexWrap: 'wrap', 
    marginBottom: 5,
  },
  statCard: {
    alignItems: 'center',
    paddingVertical: 4,
    marginHorizontal: 4,
    minWidth: 70, 
    flexGrow: 1, 
    flexBasis: '25%', 
    marginBottom: 4, 
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginVertical: 0,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  feed: {
    flex: 1,
    width: '100%',
  },
  emptyFeedContainer: { 
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postCard: {
    backgroundColor: '#fff', 
    paddingHorizontal: 8, 
    paddingVertical: 8, 
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginVertical: 3,
    marginHorizontal: 4,
    width: '97%',
    alignSelf: 'center',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8, 
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1, 
  },
  avatar: {
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: '#0E5E6F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8, 
  },
  avatarText: {
    color: '#fff',
    fontSize: 14, 
    fontWeight: 'bold',
  },
  username: {
    fontWeight: 'bold',
    fontSize: 15, 
  },
  postContent: {
    fontSize: 15, 
    lineHeight: 22, 
    marginBottom: 8,
    width: '100%',
  },
  postImage: {
    width: '100%',
    height: 180, 
    borderRadius: 8, 
    marginBottom: 8, 
  },
  activityCard: { 
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10, 
    marginBottom: 8,
    width: '100%',
  },
  activityHeader: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', 
    marginBottom: 8,
    flexWrap: 'wrap', 
  },
  activityTitle: { 
    fontSize: 15, 
    fontWeight: 'bold',
    flexShrink: 1, 
  },
  activityPoints: { 
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 15, 
    marginLeft: 8, 
  },
  activityDetails: { 
    marginBottom: 4,
  },
  activityText: { 
    fontSize: 13, 
    color: '#666',
    marginBottom: 3,
    textAlign: 'left',
  },
  progressBarContainer: { 
    marginTop: 4,
    paddingRight: 10, 
  },
  progressBarBackground: { 
    height: 6, 
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    flex: 1,
  },
  progressBarFill: { 
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  commentsSection: {
    marginTop: 8, 
    marginBottom: 8, 
    paddingTop: 8, 
    paddingHorizontal: 12, 
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#f8f9fa',
  },
  commentContainer: {
    marginBottom: 5, 
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start', 
    flexWrap: 'nowrap', 
  },
  commentAvatar: {
    width: 22, 
    height: 22, 
    borderRadius: 11, 
    backgroundColor: '#0E5E6F',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6, 
    marginTop: 2, 
  },
  commentAvatarText: {
    color: '#fff',
    fontSize: 11, 
    fontWeight: 'bold',
  },
  commentAuthor: {
    fontWeight: '600',
    fontSize: 13, 
    color: '#1a1a1a',
    marginRight: 6, 
  },
  commentContent: {
    flex: 1, 
    fontSize: 13, 
    color: '#4a4a4a',
    lineHeight: 18, 
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around', 
    alignItems: 'center',
    paddingVertical: 8, 
    paddingHorizontal: 10, 
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1, 
    flexBasis: 0, 
    paddingVertical: 6, 
  },
  socialButtonText: {
    marginLeft: 4, 
    color: '#666',
    fontSize: 13, 
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10, 
    paddingVertical: 6, 
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0', 
  },
  commentInput: {
    flex: 1,
    height: 34, 
    backgroundColor: '#f5f5f5',
    borderRadius: 17, 
    paddingHorizontal: 12, 
    marginRight: 8, 
    fontSize: 13, 
  },
  sendButton: {
    padding: 4, 
  },
  actionButtonsContainer: {
    paddingHorizontal: 8, 
    paddingVertical: 6, 
    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0', 
  },
  utcTimeContainer: {
    paddingVertical: 4, 
    paddingHorizontal: 8, 
    backgroundColor: 'rgba(240, 240, 240, 0.85)', 
    borderRadius: 6, 
    marginBottom: 6, 
    alignItems: 'center',
  },
  utcTimeText: {
    fontSize: 11, 
    color: '#333',
    fontWeight: '500',
    marginBottom: 1, 
  },
  resetCountdownText: {
    fontSize: 11, 
    color: '#007AFF',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap', 
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6, 
    paddingHorizontal: 8, 
    borderRadius: 16, 
    minWidth: 80, 
    marginVertical: 3, 
    flexGrow: 1, 
    marginHorizontal: 3, 
  },
  physicalButton: {
    backgroundColor: '#4A90E2',
  },
  mentalButton: {
    backgroundColor: '#9C27B0',
  },
  bonusButton: {
    backgroundColor: '#FF9800',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 12,
  },
  disabledButtonVisual: {
    backgroundColor: '#cccccc',
  },
  emptyFeedText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 20, 
  },
  notificationBanner: {
    backgroundColor: '#4CAF50',
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  notificationText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
  },
  modalOverlay: { 
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: { 
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '85%',
    minHeight: '70%',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    flexShrink: 0,
  },
  modalBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  timeSection: {
    flexShrink: 0,
    marginBottom: 5,
  },
  activitySection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  closeButton: { 
    padding: 5,
  },
  pickerContainer: { 
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 6,
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  picker: { 
    height: 50,
    width: '100%',
    backgroundColor: 'transparent',
  },
  modalTitle: { 
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalLabel: { 
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  activityList: { 
    flex: 1,
    minHeight: 150,
  },
  activityGrid: { 
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  activityGridItem: { 
    width: '48%',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityGridText: { 
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  selectedActivity: { 
    backgroundColor: '#4A90E2',
  },
  selectedActivityText: { 
    color: '#fff',
  },
  confirmButton: { 
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
    flexShrink: 0,
  },
  confirmButtonText: { 
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: { 
    backgroundColor: '#ccc',
  },
  userInfoText: { 
    flex: 1,
  },
  postTime: { 
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  errorText: { 
    color: '#ff4b4b',
    marginBottom: 10,
  },
  contentInput: { 
    height: 120,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    textAlignVertical: 'top',
  },
  modalButtons: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: { 
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: { 
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
    flexShrink: 0,
  },
  modalButtonText: { 
    color: '#fff', 
    fontWeight: 'bold',
  },
  shareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareModalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    elevation: 5,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  shareOptionText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
  },
  typeSelection: { 
    flexDirection: 'row',
    marginBottom: 15,
  },
  typeOption: { 
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 5,
  },
  selectedOption: { 
    backgroundColor: '#4A90E2',
  },
  optionText: { 
    color: '#666',
  },
  selectedOptionText: { 
    color: '#fff',
  },
  teamSelection: { 
    marginBottom: 15,
  },
  teamOption: { 
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f5f50',
    marginBottom: 5,
  },
  selectedTeam: { 
    backgroundColor: '#4A90E2',
  },
  selectedTeamText: { 
    color: '#fff',
  },
  activityFields: { 
    marginBottom: 15,
  },
  activityInput: { 
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 10,
  },
  likedText: { 
    color: '#ff4b4b'
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  emptyActivitiesContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  emptyActivitiesText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  pickerItem: {
    color: '#333',
    fontSize: 16,
    textAlign: 'center',
    height: 50,
  },
  feedContainer: {
    flex: 1,
    position: 'relative',
  },
  floatingPostButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#34c759',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
});

export default HomeScreen;
