import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_CONFIG from '../config/api';

const ActivityCard = ({ activity }) => {
  const [comment, setComment] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [comments, setComments] = useState(activity.comments || []);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(activity.likes ? activity.likes.length : 0);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const checkLikeStatus = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        setCurrentUserId(userId);
        const likes = Array.isArray(activity.likes) ? activity.likes : [];
        setIsLiked(likes.includes(userId));
        setLikesCount(likes.length);
      } catch (error) {
        console.error('Error checking like status:', error);
      }
    };
    checkLikeStatus();
  }, [activity.likes]);

  useEffect(() => {
    if (activity.comments) {
      setComments(Array.isArray(activity.comments) ? activity.comments : []);
    }
  }, [activity.comments]);

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
    const userId = activity.userId;
    if (!userId) return '?';
    return typeof userId === 'object' ? 
      (userId.name ? userId.name.substring(0, 2).toUpperCase() : '?') :
      userId.substring(0, 2).toUpperCase();
  };

  const handleLike = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error('No token found');
        return;
      }

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

      if (response.ok) {
        setIsLiked(!isLiked);
        setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
      } else {
        console.error('Failed to like activity:', data.message);
        Alert.alert('Error', data.message || 'Failed to like activity');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like status');
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error('No token found');
        return;
      }

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
        setComments(prev => [...prev, data]);
        setComment('');
        setShowCommentInput(false);
      } else {
        console.error('Failed to add comment:', data.message);
        Alert.alert('Error', data.message || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  return (
    <View style={styles.card}>
      {/* User Info Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getAvatarText()}</Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.username}>
              {typeof activity.userId === 'object' ? activity.userId.name || 'Anonymous' : activity.userId || 'Anonymous'}
            </Text>
            <Text style={styles.timestamp}>{format(new Date(activity.createdAt), 'dd/MM/yyyy')}</Text>
          </View>
        </View>
      </View>

      {/* Activity Content */}
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
            <View key={index} style={styles.commentItem}>
              <View style={styles.commentAvatar}>
                <Text style={styles.commentAvatarText}>
                  {comment.userId && typeof comment.userId === 'object' ? 
                    comment.userId.name?.substring(0, 2).toUpperCase() || 'A' :
                    'A'}
                </Text>
              </View>
              <View style={styles.commentContent}>
                <Text style={styles.commentAuthor}>
                  {comment.userId && typeof comment.userId === 'object' ? 
                    comment.userId.name || 'Anonymous' :
                    'Anonymous'}
                </Text>
                <Text style={styles.commentText}>
                  {typeof comment === 'string' ? comment : comment.content}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Social Buttons */}
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

      {/* Comment Input */}
      {showCommentInput && (
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            value={comment}
            onChangeText={setComment}
            onSubmitEditing={handleAddComment}
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleAddComment}>
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
              onPress={() => handleShare('team')}
            >
              <Ionicons name="people-outline" size={24} color="#666" />
              <Text style={styles.shareOptionText}>Share with Team</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.shareOption}
              onPress={() => handleShare('public')}
            >
              <Ionicons name="globe-outline" size={24} color="#666" />
              <Text style={styles.shareOptionText}>Share Publicly</Text>
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  commentAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  commentContent: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: '#4a4a4a',
    lineHeight: 18,
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
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  commentInput: {
    flex: 1,
    height: 36,
    backgroundColor: '#f5f5f5',
    borderRadius: 18,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  sendButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  shareModalContent: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    width: '80%',
    alignSelf: 'center',
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
  },
});

export default ActivityCard; 