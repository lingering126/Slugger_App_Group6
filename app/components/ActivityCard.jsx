import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, Linking, Image } from 'react-native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api';

// ActivityCard Component: Displays a single activity with social interactions
const ActivityCard = ({ activity, onRefresh }) => {
  // State management for comments, likes, and user interactions
  const [comment, setComment] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [comments, setComments] = useState(activity.comments || []);
  
  // Use authorInfo and like/comment counts directly from the activity prop
  const [isLiked, setIsLiked] = useState(activity.isLikedByUser || false);
  const [likesCount, setLikesCount] = useState(activity.likesCount || 0);
  
  const [isLikeError, setIsLikeError] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [authorName, setAuthorName] = useState(activity.authorInfo?.name || 'Anonymous');
  const [authorAvatar, setAuthorAvatar] = useState(activity.authorInfo?.avatarUrl || null);

  useEffect(() => {
    const loadCurrentUserId = async () => {
      const userId = await AsyncStorage.getItem('userId');
      setCurrentUserId(userId);
    };
    loadCurrentUserId();
  }, []);

  // Update local state if activity prop changes (e.g., after a feed refresh)
  useEffect(() => {
    // console.log('activity:', activity);
    console.log('✅activity.authorInfo.name', activity.authorInfo.name);
    console.log('activity.name', activity.name);
    console.log('activity.isLikedByUser', activity.isLikedByUser);
    console.log('activity.likesCount', activity.likesCount);
    
    setAuthorName(activity.authorInfo?.name || 'Anonymous');
    setAuthorAvatar(activity.authorInfo?.avatarUrl || null);
    setIsLiked(activity.isLikedByUser || false);
    setLikesCount(activity.likesCount || 0);
    setComments(activity.comments || []);
  }, [activity]);

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
    return authorName?.[0] || '?';
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
      const activityId = activity.id || activity._id;
      console.log('Sending like request for activity:', activityId);
      const response = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.ACTIVITIES.LIKE.replace(':id', activityId)}`, {
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
      const activityId = activity.id || activity._id;
      console.log('Sending comment for activity:', activityId);
      const response = await fetch(`${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.ACTIVITIES.COMMENT.replace(':id', activityId)}`, {
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
        console.log('✅加了data.comment', data.comment);
        const newComment = {
          id: data.comment.id,
          author: data.comment.author,
          content: data.comment.content,
          createdAt: data.comment.createdAt,
          authorInfo: data.comment.authorInfo || { name: data.comment.author || 'Anonymous', avatarUrl: null }
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
            {authorAvatar ? (
              <Image 
                source={{ uri: authorAvatar }} 
                style={{ width: '100%', height: '100%', borderRadius: 20 }}
                onError={() => setAuthorAvatar(null)}
              />
            ) : (
              <Text style={styles.avatarText}>{getAvatarText()}</Text>
            )}
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.username}>{authorName}</Text>
            <Text style={styles.timestamp}>
              {new Date(activity.createdAt).toLocaleString('en-GB', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                }).replace(',', '')}
            </Text>
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
          {comments.map((commentItem, index) => (
            <View key={commentItem.id || commentItem._id || index} style={styles.commentContainer}>
              <View style={styles.commentHeader}>
                <View style={styles.commentAvatar}>
                  {commentItem.authorInfo?.avatarUrl ? (
                    <Image 
                      source={{ uri: commentItem.authorInfo.avatarUrl }} 
                      style={{ width: '100%', height: '100%', borderRadius: 12 }}
                      onError={(e) => { 
                        // console.log("Error loading comment author avatar", e.nativeEvent.error);
                      }}
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
    marginVertical: 3,
    marginHorizontal: 4,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: '97%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
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
    padding: 10,
    width: '100%',
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap', // Allow wrapping for smaller screens
  },
  icon: {
    fontSize: 22, // Slightly smaller icon
    marginRight: 10, // Slightly less margin
  },
  activityInfo: {
    flex: 1,
    minWidth: 150, // Ensure it doesn't get too squished before wrapping
  },
  title: {
    fontSize: 15, // Slightly smaller title
    fontWeight: '600',
    color: '#1a1a1a',
    flexShrink: 1, // Allow title to shrink if needed
  },
  duration: {
    fontSize: 13, // Slightly smaller duration text
    color: '#666',
    marginTop: 1,
  },
  points: {
    fontSize: 15, // Slightly smaller points text
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 'auto', // Push points to the right if space allows, helps with wrapping
    paddingLeft: 8, // Add some padding if it's next to wrapped content
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
    paddingVertical: 6, // Reduced vertical padding
    paddingHorizontal: 4, // Reduced horizontal padding
    justifyContent: 'space-around', // Better distribution
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1, // Allow buttons to grow but not necessarily take equal fixed space
    flexBasis: 0, // Allow flexGrow to work effectively
    paddingVertical: 6, // Reduced padding
    paddingHorizontal: 4, // Reduced padding
    minWidth: 70, // Ensure buttons have a minimum tap area
  },
  socialButtonText: {
    marginLeft: 3, // Reduced margin
    color: '#666',
    fontSize: 13, // Slightly smaller text
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
