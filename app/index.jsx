import { useEffect } from 'react';
import { Redirect, useRouter, useLocalSearchParams } from 'expo-router';

export default function Index() {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  // Check if we're being redirected to reset password
  useEffect(() => {
    if (params.screen === 'reset-password' && params.token) {
      console.log('Redirecting to reset password with token:', params.token);
      router.replace({
        pathname: '/screens/reset-password',
        params: { token: params.token }
      });
    }
  }, [params, router]);

  // Default redirect to login
  return <Redirect href="/screens/login" />;
}



