import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const SocialButtons = ({ likes = 0, comments = [] }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [scale] = useState(new Animated.Value(1));

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleComment = () => {
    setShowCommentInput(!showCommentInput);
    setShowShareOptions(false);
  };

  const handleShare = () => {
    setShowShareOptions(!showShareOptions);
    setShowCommentInput(false);
  };

  const handleSubmitComment = () => {
    if (commentText.trim()) {
      // TODO: Handle comment submission
      console.log('Comment submitted:', commentText);
      setCommentText('');
      setShowCommentInput(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.buttonsRow}>
        {/* Like Button */}
        <TouchableOpacity style={styles.button} onPress={handleLike}>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={24}
              color={isLiked ? '#ff4b4b' : '#666'}
            />
          </Animated.View>
          <Text style={styles.buttonText}>{likeCount}</Text>
        </TouchableOpacity>

        {/* Comment Button */}
        <TouchableOpacity style={styles.button} onPress={handleComment}>
          <Ionicons
            name={showCommentInput ? 'chatbubble' : 'chatbubble-outline'}
            size={24}
            color={showCommentInput ? '#4A90E2' : '#666'}
          />
          <Text style={styles.buttonText}>{comments.length}</Text>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity style={styles.button} onPress={handleShare}>
          <Ionicons
            name={showShareOptions ? 'share-social' : 'share-social-outline'}
            size={24}
            color={showShareOptions ? '#4CAF50' : '#666'}
          />
        </TouchableOpacity>
      </View>

      {/* Comment Input Section */}
      {showCommentInput && (
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Write a comment..."
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <View style={styles.commentActions}>
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSubmitComment}
              disabled={!commentText.trim()}
            >
              <Ionicons
                name="send"
                size={24}
                color={commentText.trim() ? '#4A90E2' : '#ccc'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCommentInput(false)}
            >
              <Ionicons name="close" size={24} color="#ff4b4b" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Share Options */}
      {showShareOptions && (
        <View style={styles.shareOptionsContainer}>
          <TouchableOpacity style={styles.shareOption}>
            <Ionicons name="chatbubbles-outline" size={24} color="#4A90E2" />
            <Text style={styles.shareOptionText}>Share via Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareOption}>
            <Ionicons name="people-outline" size={24} color="#4CAF50" />
            <Text style={styles.shareOptionText}>Share with Team</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareOption}>
            <Ionicons name="logo-github" size={24} color="#333" />
            <Text style={styles.shareOptionText}>Share on GitHub</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  buttonText: {
    color: '#666',
    marginLeft: 5,
  },
  commentInputContainer: {
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginTop: 10,
  },
  commentInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    minHeight: 40,
    maxHeight: 100,
  },
  commentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  sendButton: {
    padding: 5,
  },
  closeButton: {
    padding: 5,
  },
  shareOptionsContainer: {
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginTop: 10,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 5,
  },
  shareOptionText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
});

// Add default export for Expo Router
export default SocialButtons; 