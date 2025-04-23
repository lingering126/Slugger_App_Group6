import AsyncStorage from '@react-native-async-storage/async-storage';

// 用户API服务 - 仅包含获取用户资料的功能
const userService = {
  // 获取用户信息 - 直接从本地存储获取
  async getUserProfile() {
    try {
      const userJson = await AsyncStorage.getItem('user');
      return userJson ? JSON.parse(userJson) : null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }
};

export { userService };