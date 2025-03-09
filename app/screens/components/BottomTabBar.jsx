import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';

export default function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    { name: 'home', icon: 'home', label: 'Home' },
    { name: 'team', icon: 'users', label: 'Team' },
    { name: 'profile', icon: 'user', label: 'Profile' },
    { name: 'analytics', icon: 'bar-chart', label: 'Analytics' },
    { name: 'more', icon: 'ellipsis-h', label: 'More' },
  ];

  const navigateTo = (screenName) => {
    // Use the tab navigation which keeps screens mounted
    router.navigate(`/screens/(tabs)/${screenName}`);
  };

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = pathname.includes(`/screens/(tabs)/${tab.name}`);
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => navigateTo(tab.name)}
          >
            <FontAwesome
              name={tab.icon}
              size={24}
              color={isActive ? '#4A90E2' : '#8E8E93'}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: isActive ? '#4A90E2' : '#8E8E93' },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
  },
}); 