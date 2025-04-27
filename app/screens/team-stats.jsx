import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const TeamMemberCard = ({ member }) => (
  <View style={styles.memberCard}>
    <View style={styles.memberInfo}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{member.name[0]}</Text>
      </View>
      <View style={styles.memberDetails}>
        <Text style={styles.memberName}>{member.name}</Text>
        <Text style={styles.memberRole}>{member.role}</Text>
      </View>
    </View>
    <View style={styles.memberStats}>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{member.points}</Text>
        <Text style={styles.statLabel}>Points</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{member.activities}</Text>
        <Text style={styles.statLabel}>Activities</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statValue}>{member.streak}</Text>
        <Text style={styles.statLabel}>Streak</Text>
      </View>
    </View>
  </View>
);

const TeamStatsScreen = () => {
  const [teamStats, setTeamStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchTeamStats();
  }, []);

  const fetchTeamStats = async () => {
    try {
      const response = await fetch(
        'http://localhost:5001/api/homepage/stats/team/1',
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const data = await response.json();
      setTeamStats(data);
    } catch (error) {
      console.error('Error fetching team stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={require('../../assets/analytics_bg.png')}
        style={styles.backgroundImage}
        imageStyle={{ opacity: 0.16 }}
      >
        <LinearGradient
          colors={['rgba(248, 250, 252, 0.1)', 'rgba(248, 250, 252, 0.6)', 'rgba(248, 250, 252, 0.95)', 'rgba(248, 250, 252, 1)']}
          locations={[0, 0.2, 0.5, 0.7]}
          style={styles.gradient}
        >
          <ScrollView style={styles.scrollView}>
            {/* Team Overview */}
            <View style={styles.teamOverview}>
              <Text style={styles.teamName}>{teamStats?.name || 'Team Name'}</Text>
              <View style={styles.teamStats}>
                <View style={styles.teamStatCard}>
                  <Ionicons name="trophy" size={24} color="#007AFF" />
                  <Text style={styles.teamStatValue}>{teamStats?.totalPoints || 0}</Text>
                  <Text style={styles.teamStatLabel}>Total Points</Text>
                </View>
                <View style={styles.teamStatCard}>
                  <Ionicons name="people" size={24} color="#007AFF" />
                  <Text style={styles.teamStatValue}>{teamStats?.memberCount || 0}</Text>
                  <Text style={styles.teamStatLabel}>Members</Text>
                </View>
                <View style={styles.teamStatCard}>
                  <Ionicons name="trending-up" size={24} color="#007AFF" />
                  <Text style={styles.teamStatValue}>{teamStats?.rank || 'N/A'}</Text>
                  <Text style={styles.teamStatLabel}>Rank</Text>
                </View>
              </View>
            </View>

            {/* Team Progress */}
            <View style={styles.progressSection}>
              <Text style={styles.sectionTitle}>Team Progress</Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { width: `${teamStats?.progress || 0}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>{teamStats?.progress || 0}% of team goal</Text>
            </View>

            {/* Team Members */}
            <View style={styles.membersSection}>
              <Text style={styles.sectionTitle}>Team Members</Text>
              {teamStats?.members?.map((member, index) => (
                <TeamMemberCard key={index} member={member} />
              ))}
            </View>
          </ScrollView>
        </LinearGradient>
      </ImageBackground>
    </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  teamOverview: {
    padding: 16,
  },
  teamName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  teamStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  teamStatCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  teamStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 8,
  },
  teamStatLabel: {
    fontSize: 12,
    color: '#666',
  },
  progressSection: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'right',
  },
  membersSection: {
    padding: 16,
  },
  memberCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  memberRole: {
    fontSize: 14,
    color: '#666',
  },
  memberStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
});

export default TeamStatsScreen; 