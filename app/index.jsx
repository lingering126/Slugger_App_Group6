import { Redirect } from 'expo-router';
import { LogBox } from 'react-native';

// Ignore specific warnings to prevent noise in development
LogBox.ignoreLogs([
  'AsyncStorage has been extracted from react-native core',
  'Setting a timer for a long period of time',
]);

export default function Index() {
  return <Redirect href="/screens/login" />;
}



