import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function VerifyEmailRedirect() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const token = params.token;

  useEffect(() => {
    // Redirect to the actual verify email screen with the token
    if (token) {
      console.log('Redirecting to verify email screen with token:', token);
      router.replace({
        pathname: '/screens/verify-email',
        params: { token }
      });
    } else {
      console.error('No verification token provided in URL');
      router.replace('/screens/login');
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