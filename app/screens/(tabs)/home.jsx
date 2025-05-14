import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, SafeAreaView, ImageBackground, Image, TextInput, Alert, Linking, Animated, ActivityIndicator, Platform, RefreshControl } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import API_CONFIG from '../../config/api';
import ActivityCard from '../../components/ActivityCard';

// Activity category data
const activityData = {
  Physical: [
    "Cricket", "Soccer", "Run", "Walk", "HIIT", "Gym Workout", 
    "Cycle", "Swim", "Home Workout", "Physio", "Yoga", "Squash", 
    "Rugby", "Touch Rugby", "Steps goal", "DIY", "Gardening", 
    "Physical other"
  ],
  Mental: [
    "Meditation", "Reading", "Writing", "Music Practice", 
    "Mental Gym", "Duolingo", "Language Training", "Cold shower", 
    "Mental other", "Journal", "Breathing exercise"
  ],
  Bonus: [
    "Community Service", "Family", "Personal Best", "Personal Goal", "Bonus other"
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
  const activities = category ? activityData[category] || [] : [];

  // Fetch user's team on component mount
  useEffect(() => {
    const fetchUserTeam = async () => {
      try {
        const teamData = await AsyncStorage.getItem('userTeam');
        if (teamData) {
          setUserTeam(JSON.parse(teamData));
        }
      } catch (error) {
        console.error('Error fetching user team:', error);
      }
    };

    if (visible) {
      fetchUserTeam();
    }
  }, [visible]);

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
      // Convert hours to minutes
      const durationInMinutes = parseInt(selectedTime) * 60;
      
      // Create request body
      const requestBody = {
        type: category,
        name: selectedActivity,
        duration: durationInMinutes,
        icon: getActivityIcon(category, selectedActivity)
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

        // Build complete activity data with Anonymous as default username
        const activityData = {
          ...data.data,
          type: category,
          name: selectedActivity,
          duration: durationInMinutes,
          icon: getActivityIcon(category, selectedActivity),
          createdAt: new Date().toISOString(),
          author: 'Anonymous',  // Use Anonymous as default username
          userId: 'anonymous'   // Use lowercase anonymous as default userID
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

          <Text style={styles.modalLabel}>Select Duration (Hours)</Text>
          <View style={styles.pickerContainer}>
          <Picker 
            selectedValue={selectedTime} 
            style={styles.picker} 
              onValueChange={(itemValue) => {
                setSelectedTime(itemValue);
                console.log('Selected time:', itemValue); // Changed from Chinese to English
              }}
          >
            {[...Array(24).keys()].map((num) => (
              <Picker.Item key={num + 1} label={`${num + 1} hour`} value={`${num + 1}`} />
            ))}
          </Picker>
          </View>

          <Text style={styles.modalLabel}>Select Activity</Text>
          <ScrollView style={styles.activityList}>
            <View style={styles.activityGrid}>
            {activities.map((activity, index) => (
              <TouchableOpacity 
                key={index}
                style={[
                    styles.activityGridItem,
                  selectedActivity === activity && styles.selectedActivity
                ]}
                  onPress={() => {
                    setSelectedActivity(activity);
                    console.log('Selected activity:', activity); // Changed from Chinese to English
                  }}
              >
                <Text style={[
                    styles.activityGridText,
                  selectedActivity === activity && styles.selectedActivityText
                ]}>
                  {activity}
                </Text>
              </TouchableOpacity>
            ))}
            </View>
          </ScrollView>

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
    </Modal>
  );
};

const PostCard = ({ post }) => {
  const [comment, setComment] = useState('');
  const [localComments, setLocalComments] = useState(post?.comments || []);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [isLiked, setIsLiked] = useState(post?.isLikedByUser || false);
  const [likesCount, setLikesCount] = useState(post?.likesCount || 0);

  // 检查点赞状态
  useEffect(() => {
    if (!post) return;

    console.log('Initializing post like status:', {
      postId: post._id,
      likesCount: post.likesCount,
      isLikedByUser: post.isLikedByUser
    });
    
    // 直接使用帖子的点赞状态
    setIsLiked(post.isLikedByUser || false);
    setLikesCount(post.likesCount || 0);
  }, [post?._id, post?.likesCount, post?.isLikedByUser]);

  const handleLike = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');
      if (!token || !userId) {
        console.error('No token or userId found');
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
      } else {
        // If request fails, restore previous state
        console.error('Failed to update like status:', data);
        setIsLiked(prevIsLiked);
        setLikesCount(prevLikesCount);
        Alert.alert('Error', 'Failed to update like status');
      }
    } catch (error) {
      // Restore previous state in case of error
      console.error('Error updating like status:', error);
      setIsLiked(prevIsLiked);
      setLikesCount(prevLikesCount);
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
      const response = await fetch(`${API_CONFIG.API_URL}/posts/${post?._id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: comment })
      });

      if (response.ok) {
        const newComment = await response.json();
        setLocalComments(prevComments => [...prevComments, {
          id: newComment.id,
          author: newComment.author || 'Anonymous',
          content: comment
        }]);
        setComment('');
        setShowCommentInput(false);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
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
            <Text style={styles.avatarText}>{post.author?.[0] || '?'}</Text>
          </View>
          <View style={styles.userInfoText}>
            <Text style={styles.username}>{post.author?.name || 'Anonymous'}</Text>
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
      
      {/* 评论列表 */}
      {localComments.length > 0 && (
        <View style={styles.commentsSection}>
          {localComments.map((comment, index) => (
            <View key={index} style={styles.commentContainer}>
              <View style={styles.commentHeader}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>
                    {comment?.author?.[0] || '?'}
                  </Text>
          </View>
                <Text style={styles.commentAuthor}>{comment?.author || 'Anonymous'}</Text>
                <Text style={styles.commentContent}>{comment?.content || ''}</Text>
          </View>
        </View>
          ))}
      </View>
      )}

      {/* 评论按钮和输入框 */}
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

      {/* 分享选项弹窗 */}
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

      {/* 点击评论按钮后显示的输入框 */}
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
      console.log('Retrieved token:', token);
      
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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const router = useRouter();

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
    const updateUtcTime = () => {
      setCurrentUtcTime(new Date().toUTCString());
    };
    updateUtcTime();
    const intervalId = setInterval(updateUtcTime, 1000);
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
      await fetchActivities();
      
      // Show a success message
      Alert.alert('Success', `Logged ${newActivity.type} activity: ${newActivity.name}`);
    } catch (error) {
      console.error('Error refreshing activities after creation:', error);
    }
  };

  const getSortedFeed = () => {
    const currentActivities = Array.isArray(activities) ? activities : [];
    const currentPosts = Array.isArray(posts) ? posts : [];

    const allItems = [
      ...currentActivities.map(activity => ({ ...activity, itemType: 'activity', createdAt: new Date(activity.createdAt) })),
      ...currentPosts.map(post => ({ ...post, itemType: 'post', createdAt: new Date(post.createdAt) }))
    ];
    return allItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  useFocusEffect(
    useCallback(() => {
      const loadDataForCurrentUser = async () => {
        setLoading(true);
        console.log("HomeScreen focused, reloading data for current user...");
        try {
          const token = await AsyncStorage.getItem('userToken');
          if (!token) {
            console.log("No token found on focus, user might be logged out.");
            setActivities([]);
            setPosts([]);
            setUserStats(null);
            setLoading(false);
            return;
          }
          await Promise.all([fetchActivities(), fetchPosts(), fetchUserStats()]);
          // Check weekly limits after data is loaded
          checkWeeklyLimits();
        } catch (error) {
          console.error('Error loading data on focus:', error);
        } finally {
          setLoading(false);
        }
      };

      loadDataForCurrentUser();

      return () => {
        console.log("HomeScreen out of focus");
      };
    }, [])
  );

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
      const data = await response.json();
      if (response.ok) {
        setUserStats(prevStats => ({ ...prevStats, totalPoints: data.totalPoints || 0, totalActivities: data.totalActivities || 0, currentStreak: data.currentStreak || 0, monthlyProgress: data.monthlyProgress || 0 }));
      } else {
        console.error('Failed to fetch user stats:', data);
        setUserStats(null);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
      setUserStats(null);
    }
  };

  const fetchActivities = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.log('No token found for fetchActivities');
        setActivities([]);
        setUserStats(prevStats => ({ ...(prevStats || {}), totalPoints: 0, totalActivities: 0 }));
        return;
      }
      console.log('Fetching activities with token...');
      const response = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.ACTIVITIES.LIST}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setActivities(data.data?.activities || []);
        setUserStats(prevStats => ({ ...(prevStats || {}), totalPoints: data.data?.stats?.totalPoints || 0, totalActivities: data.data?.pagination?.total || 0 }));
      } else {
        console.error('Failed to fetch activities:', data.message || 'Unknown error');
        setActivities([]);
        setUserStats(prevStats => ({ ...(prevStats || {}), totalPoints: 0, totalActivities: 0 }));
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
      setUserStats(prevStats => ({ ...(prevStats || {}), totalPoints: 0, totalActivities: 0 }));
    }
  };

  const handlePostCreated = async () => {
    try {
      await Promise.all([
        fetchActivities(),
        fetchPosts()
      ]);
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
          <Text style={styles.utcTimeText}>Current UTC: {currentUtcTime}</Text>
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
                <FontAwesome5 name="running" size={24} color="white" />
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
                <FontAwesome5 name="brain" size={24} color="white" />
                <Text style={styles.actionButtonText}>Mental</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.bonusButton]}
            onPress={() => handleCategorySelect('Bonus')}
            disabled={checkingCategoryLimit !== null}
          >
            <FontAwesome5 name="star" size={24} color="white" />
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

              {/* Monthly Progress */}
              <View style={styles.progressSection}>
                <Text style={styles.progressTitle}>Weekly Progress</Text>
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>Team</Text>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill,
                        { width: `${userStats?.monthlyProgress || 0}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>{userStats?.monthlyProgress || 0}%</Text>
                </View>
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>Personal</Text>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill,
                        { 
                          width: `${userStats?.monthlyProgress || 0}%`,
                          backgroundColor: '#ff9800'
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>{userStats?.monthlyProgress || 0}%</Text>
                </View>
              </View>
            </View>

            {/* Combined Feed */}
            <ScrollView 
              style={styles.feed}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={async () => {
                  setRefreshing(true);
                  await Promise.all([fetchActivities(), fetchPosts(), fetchUserStats()]);
                  setRefreshing(false);
                }} />
              }
            >
              {loading && activities.length === 0 && posts.length === 0 ? (
                <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
              ) : getSortedFeed().length === 0 ? (
                <Text style={styles.emptyFeedText}>No activities or posts yet. Start logging or post something!</Text>
              ) : (
                getSortedFeed().map((item) => (
                  item.itemType === 'activity' ? (
                    <ActivityCard
                      key={`activity-${item.id || item._id}`}
                      activity={item}
                    />
                  ) : (
                    <PostCard 
                      key={`post-${item._id}`}
                      post={item}
                    />
                  )
                ))
              )}
            </ScrollView>

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

            {/* Bottom action buttons with UTC time */}
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
    padding: 10,
    backgroundColor: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', 
    marginBottom: 10,
  },
  statCard: {
    flex: 1, 
    alignItems: 'center',
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginVertical: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  progressSection: {
    marginTop: 15,
    marginBottom: 10,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    width: 60,
    fontSize: 12,
    color: '#666',
  },
  progressBar: { 
    flex: 1,
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    marginHorizontal: 8,
  },
  progressFill: {
    height: '100%', 
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  progressText: {
    width: 35,
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  feed: {
    flex: 1, 
    marginBottom: 60,
  },
  postCard: {
    backgroundColor: '#fff', 
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6c63ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  username: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 10,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  activityCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  activityPoints: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  activityDetails: {
    marginBottom: 5,
  },
  activityText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    textAlign: 'left',
  },
  progressBarContainer: {
    marginTop: 5,
    paddingRight: 15,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    flex: 1,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    textAlign: 'right',
  },
  commentsSection: {
    marginTop: 10,
    marginBottom: 10,
    paddingTop: 10,
    paddingLeft: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#f8f9fa',
  },
  commentContainer: {
    marginBottom: 6,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  commentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6c63ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  commentAvatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  commentAuthor: {
    fontWeight: '600',
    fontSize: 14,
    color: '#1a1a1a',
    marginRight: 8,
  },
  commentContent: {
    flex: 1,
    fontSize: 14,
    color: '#4a4a4a',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  activityButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  activityButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    flex: 1,
    marginHorizontal: 5,
  },
  activityButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    right: 20,
    bottom: 70,
    backgroundColor: '#fff',
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  commentInput: {
    flex: 1,
    height: 36,
    backgroundColor: '#f5f5f5',
    borderRadius: 18,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  sendButton: {
    padding: 5,
  },
  postInput: {
    height: 120,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    marginVertical: 15,
    textAlignVertical: 'top',
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
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
  teamSelection: {
    marginBottom: 15,
  },
  teamOption: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f0',
    marginBottom: 5,
  },
  contentTypeSelection: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  contentTypeOption: {
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
  teamOptionText: {
    color: '#666',
  },
  selectedTeam: {
    backgroundColor: '#4A90E2',
  },
  selectedTeamText: {
    color: '#fff',
  },
  contentInput: {
    height: 120,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    textAlignVertical: 'top',
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
  confirmButton: {
    backgroundColor: '#4A90E2',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  socialButtonText: {
    marginLeft: 5,
    color: '#666',
    fontSize: 14,
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
  likedText: {
    color: '#ff4b4b'
  },
  errorText: {
    color: '#ff4b4b',
    marginBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    padding: 5,
  },
  pickerContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 20,
  },
  picker: {
    height: 50,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  activityList: {
    maxHeight: '50%',
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
    marginTop: 20,
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
  actionButtonsContainer: {
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  utcTimeContainer: {
    marginBottom: 10,
  },
  utcTimeText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    minWidth: 100,
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
    marginLeft: 8,
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
});

export default HomeScreen;