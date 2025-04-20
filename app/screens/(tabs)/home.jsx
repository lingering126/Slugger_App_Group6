import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, SafeAreaView, ImageBackground, Image, TextInput, Alert, Linking, Animated } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SocialButtons } from '../../components/SocialButtons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

// 活动分类数据
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

// 示例团队数据
const teams = [
  { id: 1, name: "Alpha Team" },
  { id: 2, name: "Beta Squad" },
  { id: 3, name: "Gamma Force" }
];

// 更新示例帖子数据 - 按频道分类
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

const ActivityModal = ({ visible, category, onClose }) => {
  const [selectedTime, setSelectedTime] = useState('1');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const activities = activityData[category] || [];

  const handleConfirm = async () => {
    if (!selectedActivity) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch('http://localhost:5000/api/homepage/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: category,
          name: selectedActivity,
          duration: parseInt(selectedTime),
          description: `${selectedActivity} activity for ${selectedTime} hour(s)`
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Activity logged successfully:', result);
        // 重置表单
        setSelectedTime('1');
        setSelectedActivity(null);
        // 关闭模态框
        onClose();
        // 刷新统计数据
        fetchUserStats();
      } else {
        console.error('Failed to log activity:', await response.text());
      }
    } catch (error) {
      console.error('Error logging activity:', error);
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
          <Text style={styles.modalTitle}>Log {category} Activity</Text>

          <Text style={styles.modalLabel}>Select Duration (Hours)</Text>
          <Picker 
            selectedValue={selectedTime} 
            style={styles.picker} 
            onValueChange={(itemValue) => setSelectedTime(itemValue)}
          >
            {[...Array(24).keys()].map((num) => (
              <Picker.Item key={num + 1} label={`${num + 1} hour`} value={`${num + 1}`} />
            ))}
          </Picker>

          <Text style={styles.modalLabel}>Select Activity</Text>
          <ScrollView style={styles.activityList}>
            {activities.map((activity, index) => (
              <TouchableOpacity 
                key={index}
                style={[
                  styles.activityOption,
                  selectedActivity === activity && styles.selectedActivity
                ]}
                onPress={() => setSelectedActivity(activity)}
              >
                <Text style={[
                  styles.activityOptionText,
                  selectedActivity === activity && styles.selectedActivityText
                ]}>
                  {activity}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={handleConfirm}
            >
              <Text style={styles.modalButtonText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const PostCard = ({ post }) => {
  const [comment, setComment] = useState('');
  const [localComments, setLocalComments] = useState(post.comments || []);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [showShareOptions, setShowShareOptions] = useState(false);

  const handleLike = () => {
    // 更新点赞状态和数量
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
  };

  const handleShare = async (destination) => {
    try {
      if (destination === 'github') {
        // 分享到GitHub的逻辑
        const githubUrl = `https://github.com/share?text=${encodeURIComponent(post.content)}`;
        Linking.openURL(githubUrl);
      } else {
        // 分享到公共或团队界面的逻辑
        const token = await AsyncStorage.getItem('userToken');
        const response = await fetch('http://localhost:5000/api/homepage/posts/share', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            postId: post.id,
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
      const response = await fetch(`http://localhost:5000/api/homepage/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: comment })
      });

      if (response.ok) {
        const newComment = await response.json();
        // 将新评论添加到现有评论列表末尾
        setLocalComments(prevComments => [...prevComments, {
          id: newComment.id,
          author: newComment.author || 'User', // 使用实际的用户名
          content: comment
        }]);
        setComment('');
        setShowCommentInput(false); // 发送后隐藏输入框
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const renderContent = () => {
    switch (post.type) {
      case 'activity':
        return (
          <View style={styles.activityCard}>
            <View style={styles.activityHeader}>
              <Text style={styles.activityTitle}>{post.activityType}</Text>
              <Text style={styles.activityPoints}>+{post.points} pts</Text>
            </View>
            <View style={styles.activityDetails}>
              <Text style={styles.activityText}>Activity: {post.activity}</Text>
              <Text style={styles.activityText}>Duration: {post.duration}</Text>
              <Text style={styles.activityText}>Personal target completed: {post.progress}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: `${post.progress}%` }]} />
              </View>
            </View>
          </View>
        );
      case 'image':
        return (
          <View>
            <Text style={styles.postContent}>{post.content}</Text>
            <Image 
              source={{ uri: post.imageUrl }}
              style={styles.postImage}
            />
          </View>
        );
      default:
        return <Text style={styles.postContent}>{post.content}</Text>;
    }
  };

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{post.author[0]}</Text>
          </View>
          <Text style={styles.username}>{post.author}</Text>
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
                  <Text style={styles.commentAvatarText}>{comment.author[0]}</Text>
                </View>
                <Text style={styles.commentAuthor}>{comment.author}</Text>
                <Text style={styles.commentContent}>{comment.content}</Text>
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
            isLiked && styles.likedText
          ]}>{likesCount}</Text>
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
              onPress={() => handleShare('public')}
            >
              <Ionicons name="globe-outline" size={24} color="#666" />
              <Text style={styles.shareOptionText}>Share to Public</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.shareOption}
              onPress={() => handleShare('team')}
            >
              <Ionicons name="people-outline" size={24} color="#666" />
              <Text style={styles.shareOptionText}>Share to Team</Text>
            </TouchableOpacity>
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

const ChannelSelector = ({ selectedChannel, onChannelSelect }) => {
  const [showTeamList, setShowTeamList] = useState(false);
  const [teams, setTeams] = useState([
    { id: '1', name: 'Team A' },
    { id: '2', name: 'Team B' },
    { id: '3', name: 'Team C' },
  ]);
  
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: showTeamList ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showTeamList]);

  const handleTeamSelect = (team) => {
    onChannelSelect({ type: 'team', teamId: team.id, teamName: team.name });
    setShowTeamList(false);
  };

  return (
    <View style={styles.channelSelectorContainer}>
      <View style={styles.channelButtonsRow}>
        <TouchableOpacity
          style={[
            styles.channelButton,
            selectedChannel.type === 'public' && styles.selectedChannelButton,
          ]}
          onPress={() => {
            onChannelSelect({ type: 'public' });
            setShowTeamList(false);
          }}
        >
          <Text style={[
            styles.channelButtonText,
            selectedChannel.type === 'public' && styles.selectedChannelButtonText
          ]}>Public</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.channelButton,
            selectedChannel.type === 'team' && styles.selectedChannelButton,
          ]}
          onPress={() => setShowTeamList(!showTeamList)}
        >
          <Text style={[
            styles.channelButtonText,
            selectedChannel.type === 'team' && styles.selectedChannelButtonText
          ]}>Team</Text>
        </TouchableOpacity>
      </View>

      <Animated.View 
        style={[
          styles.teamList,
          {
            opacity: slideAnim,
            transform: [{
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            }],
            display: showTeamList ? 'flex' : 'none',
          },
        ]}
      >
        {teams.map((team) => (
          <TouchableOpacity
            key={team.id}
            style={[
              styles.teamItem,
              selectedChannel.teamId === team.id && styles.selectedTeamItem,
            ]}
            onPress={() => handleTeamSelect(team)}
          >
            <Text style={[
              styles.teamItemText,
              selectedChannel.teamId === team.id && styles.selectedTeamItemText,
            ]}>{team.name}</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
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

const AddContentModal = ({ visible, onClose }) => {
  const [selectedChannel, setSelectedChannel] = useState('public');
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [contentType, setContentType] = useState(null);
  const [showTeamList, setShowTeamList] = useState(false);
  const [content, setContent] = useState('');
  const [selectedActivity, setSelectedActivity] = useState(null);

  const handleSubmit = async () => {
    if (contentType === 'message' && !content.trim()) return;
    if (contentType === 'activity' && !selectedActivity) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      let endpoint = 'http://localhost:5000/api/homepage/';
      let body = {};

      if (contentType === 'message') {
        endpoint += 'posts';
        body = {
          content,
          channel: selectedChannel,
          teamId: selectedTeam
        };
      } else if (contentType === 'activity') {
        endpoint += 'activities/share';
        body = {
          activityId: selectedActivity.id,
          channel: selectedChannel,
          teamId: selectedTeam
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        setContent('');
        setSelectedActivity(null);
        onClose();
      }
    } catch (error) {
      console.error('Error creating content:', error);
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
          
          {/* Channel Selection */}
          <View style={styles.channelSelection}>
            <TouchableOpacity
              style={[
                styles.channelOption,
                selectedChannel === 'public' && styles.selectedOption
              ]}
              onPress={() => {
                setSelectedChannel('public');
                setShowTeamList(false);
                setSelectedTeam(null);
              }}
            >
              <Text style={selectedChannel === 'public' ? styles.selectedOptionText : styles.optionText}>
                Public
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.channelOption,
                selectedChannel === 'team' && styles.selectedOption
              ]}
              onPress={() => {
                setSelectedChannel('team');
                setShowTeamList(true);
              }}
            >
              <Text style={selectedChannel === 'team' ? styles.selectedOptionText : styles.optionText}>
                Team
              </Text>
            </TouchableOpacity>
          </View>

          {/* Team Selection */}
          {showTeamList && (
            <View style={styles.teamSelection}>
              {teams.map(team => (
                <TouchableOpacity
                  key={team.id}
                  style={[
                    styles.teamOption,
                    selectedTeam === team.id && styles.selectedTeam
                  ]}
                  onPress={() => setSelectedTeam(team.id)}
                >
                  <Text style={selectedTeam === team.id ? styles.selectedTeamText : styles.teamOptionText}>
                    {team.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Content Type Selection */}
          <View style={styles.contentTypeSelection}>
            <TouchableOpacity
              style={[
                styles.contentTypeOption,
                contentType === 'message' && styles.selectedOption
              ]}
              onPress={() => setContentType('message')}
            >
              <Text style={contentType === 'message' ? styles.selectedOptionText : styles.optionText}>
                Message
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.contentTypeOption,
                contentType === 'activity' && styles.selectedOption
              ]}
              onPress={() => setContentType('activity')}
            >
              <Text style={contentType === 'activity' ? styles.selectedOptionText : styles.optionText}>
                Activity Share
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content Input */}
          {contentType === 'message' && (
            <TextInput
              style={styles.contentInput}
              placeholder="What's on your mind?"
              multiline
              value={content}
              onChangeText={setContent}
            />
          )}

          {contentType === 'activity' && (
            <View style={styles.activitySelection}>
              {/* Add activity selection UI here */}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={handleSubmit}
            >
              <Text style={styles.modalButtonText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
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
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedChannel, setSelectedChannel] = useState({ type: 'public' });
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [postType, setPostType] = useState(null);
  const [contentType, setContentType] = useState(null);
  const [postContent, setPostContent] = useState('');
  const [userStats, setUserStats] = useState({
    totalPoints: 0,
    totalActivities: 0,
    currentStreak: 0,
    monthlyProgress: 0,
    mentalPoints: {
      teamTarget: 65,
      personalTarget: 68
    }
  });
  const router = useRouter();

  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch('http://localhost:5000/api/homepage/stats/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setUserStats({
          ...data,
          mentalPoints: {
            teamTarget: 65,
            personalTarget: 68
          }
        });
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const handleChannelSelect = (channel) => {
    setSelectedChannel(channel);
  };

  const handleTeamSelect = (teamId) => {
    setSelectedTeam(teamId);
  };

  const getCurrentPosts = () => {
    if (selectedChannel.type === 'public') {
      return samplePosts.public;
    } else if (selectedChannel.type === 'team' && selectedChannel.teamId) {
      return samplePosts.team[selectedChannel.teamId] || [];
    }
    return [];
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground 
        source={require('../../../assets/analytics_bg.png')}
        style={styles.backgroundImage}
        imageStyle={{ opacity: 0.16 }}
      >
        <LinearGradient
          colors={['rgba(248, 250, 252, 0.1)', 'rgba(248, 250, 252, 0.6)', 'rgba(248, 250, 252, 0.95)', 'rgba(248, 250, 252, 1)']}
          locations={[0, 0.2, 0.5, 0.7]}
          style={styles.gradient}
        >
          <View style={styles.mainContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerCenter}>
                <Ionicons name="home" size={28} color="#3A8891" />
              </View>
            </View>

            {/* Stats Section */}
            <View style={styles.statsSection}>
              {/* Activity Statistics */}
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Ionicons name="trophy" size={20} color="#007AFF" />
                  <Text style={styles.statValue}>{userStats.totalPoints}</Text>
                  <Text style={styles.statLabel}>Points</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="calendar" size={20} color="#007AFF" />
                  <Text style={styles.statValue}>{userStats.totalActivities}</Text>
                  <Text style={styles.statLabel}>Activities</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="flame" size={20} color="#007AFF" />
                  <Text style={styles.statValue}>{userStats.currentStreak}</Text>
                  <Text style={styles.statLabel}>Streak</Text>
                </View>
              </View>

              {/* Monthly Progress */}
              <View style={styles.progressSection}>
                <Text style={styles.progressTitle}>Monthly Progress</Text>
                
                {/* Team Progress */}
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>Team</Text>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill,
                        { width: `${userStats.monthlyProgress}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>{userStats.monthlyProgress}%</Text>
                </View>

                {/* Personal Progress */}
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>Personal</Text>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill,
                        { 
                          width: `${userStats.monthlyProgress}%`,
                          backgroundColor: '#ff9800'
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>{userStats.monthlyProgress}%</Text>
                </View>
              </View>
            </View>

            {/* Rest of the content */}
            <ChannelSelector 
              selectedChannel={selectedChannel}
              onChannelSelect={handleChannelSelect}
            />

            <ScrollView style={styles.scrollView}>
              {getCurrentPosts().map(post => (
                <PostCard key={post.id} post={post} />
              ))}
            </ScrollView>

            {/* Activity Buttons and Add Post Button */}
            <View style={styles.bottomContainer}>
              <View style={styles.activityButtonsContainer}>
                <TouchableOpacity 
                  style={styles.activityButton}
                  onPress={() => {
                    setSelectedCategory('Physical');
                    setModalVisible(true);
                  }}
                >
                  <Text style={styles.activityButtonText}>Physical</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.activityButton}
                  onPress={() => {
                    setSelectedCategory('Mental');
                    setModalVisible(true);
                  }}
                >
                  <Text style={styles.activityButtonText}>Mental</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.activityButton}
                  onPress={() => {
                    setSelectedCategory('Bonus');
                    setModalVisible(true);
                  }}
                >
                  <Text style={styles.activityButtonText}>Bonus</Text>
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => setShowNewPostModal(true)}
              >
                <Ionicons name="add-circle" size={50} color="#4A90E2" />
              </TouchableOpacity>
            </View>

            <ActivityModal
              visible={modalVisible}
              category={selectedCategory}
              onClose={() => setModalVisible(false)}
            />

            <AddContentModal
              visible={showNewPostModal}
              onClose={() => setShowNewPostModal(false)}
            />
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
  channelSelectorContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 1,
  },
  channelButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  channelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    flex: 1,
    marginHorizontal: 5,
    justifyContent: 'center',
  },
  selectedChannelButton: {
    backgroundColor: '#6c63ff',
  },
  channelButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  selectedChannelButtonText: {
    color: '#fff',
  },
  teamList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    zIndex: 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  teamItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 15,
    marginBottom: 5,
    backgroundColor: '#f5f5f0',
  },
  selectedTeamItem: {
    backgroundColor: '#6c63ff',
  },
  teamItemText: {
    color: '#666',
    textAlign: 'center',
  },
  selectedTeamItemText: {
    color: '#fff',
  },
  scrollView: {
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
  channelSelection: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  channelOption: {
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
    backgroundColor: '#f5f5f5',
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
  activitySelection: {
    marginBottom: 15,
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
    color: '#ff4b4b',
  },
});

export default HomeScreen; 