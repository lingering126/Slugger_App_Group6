import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

import ServerSettings from '../components/ServerSettings';

// Server settings screen - provides a dedicated screen for server connection management
export default function ServerSettingsScreen() {
  const router = useRouter();
  
  // When the user is done with settings, navigate back
  const handleClose = () => {
    router.back();
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <ServerSettings onClose={handleClose} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
}); 