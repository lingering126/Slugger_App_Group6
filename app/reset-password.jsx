import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function ResetPasswordRedirect() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const token = params.token;

  useEffect(() => {
    // Redirect to the actual reset password screen with the token
    if (token) {
      console.log('Redirecting to reset password screen with token:', token);
      router.replace({
        pathname: '/screens/reset-password',
        params: { token }
      });
    } else {
      console.error('No token provided in URL');
      router.replace('/screens/forgot-password');
    }
  }, [token, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6c63ff" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  }
}); 