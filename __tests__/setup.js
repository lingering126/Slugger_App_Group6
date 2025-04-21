// Setup file for Jest environment

// No tests here, just configuration
// This file should be ignored by Jest

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve(null)),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve(null)),
  multiRemove: jest.fn(() => Promise.resolve(null)),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  clear: jest.fn(() => Promise.resolve(null)),
}));

// Mock React Native's Alert
jest.mock('react-native', () => {
  const ReactNative = jest.requireActual('react-native');
  
  ReactNative.Alert = {
    alert: jest.fn(),
  };
  
  return ReactNative;
});

// Mock Expo modules if needed
jest.mock('expo-router', () => ({
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  useLocalSearchParams: jest.fn().mockReturnValue({}),
}));

// Global fetch mock
global.fetch = jest.fn(); 