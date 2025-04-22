import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ActivityPost = ({ post }) => {
  if (!post) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.activityTypeContainer}>
          <Ionicons 
            name={
              post.type === 'Physical' ? 'fitness' : 
              post.type === 'Mental' ? 'brain' : 
              'star'
            } 
            size={24} 
            color="#4A90E2" 
          />
          <Text style={styles.activityType}>{post.type}</Text>
        </View>
        <Text style={styles.points}>+{post.points} pts</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.activityName}>{post.name}</Text>
        <Text style={styles.duration}>{post.duration} minutes</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.timestamp}>
          {new Date(post.createdAt).toLocaleDateString()}
        </Text>
        <Text style={[styles.status, post.status === 'completed' ? styles.completed : styles.pending]}>
          {post.status}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  activityTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityType: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  points: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  content: {
    marginBottom: 10,
  },
  activityName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  duration: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  status: {
    fontSize: 12,
    fontWeight: '500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completed: {
    backgroundColor: '#E8F5E9',
    color: '#4CAF50',
  },
  pending: {
    backgroundColor: '#FFF3E0',
    color: '#FF9800',
  },
});

export default ActivityPost; 