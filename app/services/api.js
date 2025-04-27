import AsyncStorage from '@react-native-async-storage/async-storage';

// User API service - keeping your existing code
const userService = {
  // Get user information - directly from local storage
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

// Add this new group service
const groupService = {
  // Get groups the user belongs to
  async getUserGroups() {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      const response = await fetch('http://localhost:5001/api/groups', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch groups: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching user groups:', error);
      throw error;
    }
  }
};

export { userService, groupService };
