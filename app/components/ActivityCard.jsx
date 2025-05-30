import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, Linking } from 'react-native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_CONFIG from '../config/api';

// ActivityCard Component: Displays a single activity with social interactions
const ActivityCard = ({ activity, onRefresh }) => {
  // State management for comments, likes, and user interactions
  const [comment, setComment] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [comments, setComments] = useState(activity.comments || []);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLikeError, setIsLikeError] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Check and update like status when component mounts or activity changes
  useEffect(() => {
    const checkLikeStatus = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        setCurrentUserId(userId);
        const likes = Array.isArray(activity.likes) ? activity.likes : [];
        setIsLiked(likes.includes(userId));
        setLikesCount(likes.length);
        setIsLikeError(false);
      } catch (error) {
        console.error('Error checking like status:', error);
        setIsLikeError(true);
      }
    };
    checkLikeStatus();
  }, [activity.likes]);

  // Update comments when activity comments change
  useEffect(() => {
    if (activity.comments) {
      setComments(Array.isArray(activity.comments) ? activity.comments : []);
    }
  }, [activity.comments]);

  // Helper functions for UI elements
  const getActivityIcon = (type) => {
    switch (type) {
      case 'Physical':
        return '💪';
      case 'Mental':
        return '🧠';
      case 'Bonus':
        return '⭐';
      default:
        return '📝';
    }
  };

  const getAvatarText = () => {
    return '?';  // Use question mark as avatar for anonymous users
  };

  // Handle like/unlike functionality
  const handleLike = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error('No token found');
        return;
      }

      // Optimistic update for better UX
      const prevIsLiked = isLiked;
      const prevLikesCount = likesCount;
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

      // API call to update like status
      console.log('Sending like request for activity:', activity.id);
      const response = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.ACTIVITIES.LIKE.replace(':id', activity.id)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('Like response:', data);

      if (!response.ok) {
        // Revert optimistic update on error
        setIsLiked(prevIsLiked);
        setLikesCount(prevLikesCount);
        setIsLikeError(true);
        console.error('Failed to like activity:', data.message);
        Alert.alert('Error', data.message || 'Failed to like activity');
      } else {
        setIsLikeError(false);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Revert optimistic update on error
      setIsLiked(prevIsLiked);
      setLikesCount(prevLikesCount);
      setIsLikeError(true);
      Alert.alert('Error', 'Failed to update like status');
    }
  };

  // Handle adding new comments
  const handleAddComment = async () => {
    if (!comment.trim()) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error('No token found');
        return;
      }

      // API call to add comment
      console.log('Sending comment for activity:', activity.id);
      const response = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.ACTIVITIES.COMMENT.replace(':id', activity.id)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: comment })
      });

      const data = await response.json();
      console.log('Comment response:', data);

      if (response.ok) {
        // Update local state with new comment
        const newComment = {
          id: data.comment.id,
          author: data.comment.author,
          content: data.comment.content,
          createdAt: data.comment.createdAt
        };
        
        setComments(prev => [...prev, newComment]);
        setComment('');
        setShowCommentInput(false);
        if (onRefresh) {
          onRefresh();
        }
      } else {
        console.error('Failed to add comment:', data.message);
        Alert.alert('Error', data.message || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  // Handle sharing activity
  const handleShare = async (destination) => {
    try {
      if (destination === 'github') {
        const githubUrl = `https://github.com/share?text=${encodeURIComponent(`Activity: ${activity.name} - Duration: ${activity.duration} minutes - Points: ${activity.points}`)}`;
        Linking.openURL(githubUrl);
      }
    } catch (error) {
      console.error('Error sharing activity:', error);
      Alert.alert('Error', 'Failed to share activity');
    }
    setShowShareOptions(false);
  };

  // Main render function
  return (
    <View style={styles.card}>
      {/* User Info Header Section */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getAvatarText()}</Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.username}>Anonymous</Text>
            <Text style={styles.timestamp}>{format(new Date(activity.createdAt), 'dd/MM/yyyy')}</Text>
          </View>
        </View>
      </View>

      {/* Activity Content Section */}
      <View style={styles.content}>
        <View style={styles.activityHeader}>
          <Text style={styles.icon}>{activity.icon || getActivityIcon(activity.type)}</Text>
          <View style={styles.activityInfo}>
            <Text style={styles.title}>{activity.name}</Text>
            <Text style={styles.duration}>{activity.duration} minutes</Text>
          </View>
          <Text style={styles.points}>+{activity.points} pts</Text>
        </View>

        {activity.status && (
          <Text style={[styles.status, { color: activity.status === 'completed' ? '#4CAF50' : '#FF9800' }]}>
            {activity.status}
          </Text>
        )}
      </View>

      {/* Comments Section */}
      {comments.length > 0 && (
        <View style={styles.commentsSection}>
          {comments.map((comment, index) => (
            <View key={index} style={styles.commentContainer}>
              <View style={styles.commentHeader}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>
                    {comment?.author?.[0] || 'A'}
                  </Text>
                </View>
                <Text style={styles.commentAuthor}>{comment?.author || 'Anonymous'}</Text>
                <Text style={styles.commentContent}>{comment?.content || ''}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Social Interaction Buttons */}
      <View style={styles.socialButtons}>
        <TouchableOpacity style={styles.socialButton} onPress={() => setShowCommentInput(!showCommentInput)}>
          <Ionicons name="chatbubble-outline" size={24} color="#666" />
          <Text style={styles.socialButtonText}>{comments.length || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButton} onPress={handleLike}>
          <Ionicons name={isLiked ? "heart" : "heart-outline"} size={24} color={isLiked ? "#ff4b4b" : "#666"} />
          <Text style={[styles.socialButtonText, isLiked && styles.likedText]}>{likesCount || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.socialButton} onPress={() => setShowShareOptions(true)}>
          <Ionicons name="share-social-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Comment Input Section */}
      {showCommentInput && (
        <View style={styles.commentInput}>
          <TextInput
            style={styles.input}
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

      {/* Share Options Modal */}
      <Modal
        visible={showShareOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowShareOptions(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
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
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    marginVertical: 4,
    marginHorizontal: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userDetails: {
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  content: {
    padding: 12,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  duration: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  points: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  status: {
    marginTop: 8,
    fontSize: 12,
    textTransform: 'capitalize',
  },
  commentsSection: {
    paddingHorizontal: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  commentContainer: {
    marginBottom: 10,
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
  socialButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    padding: 8,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: 8,
  },
  socialButtonText: {
    marginLeft: 4,
    color: '#666',
    fontSize: 14,
  },
  likedText: {
    color: '#ff4b4b',
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    height: 36,
    backgroundColor: '#f5f5f5',
    borderRadius: 18,
    paddingHorizontal: 15,
    marginRight: 10,
    fontSize: 14,
  },
  sendButton: {
    padding: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareModalContent: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    width: '80%',
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  shareOptionText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  }
});

export default ActivityCard; 