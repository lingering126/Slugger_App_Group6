import AsyncStorage from '@react-native-async-storage/async-storage';

// Base API URL - consider moving this to an environment config
const API_BASE_URL = 'http://localhost:5001/api';

const userService = {
  // Get user information from local storage (cached)
  async getUserProfile() {
    try {
      // Check authentication token
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.warn('No authentication token found - user may need to login');
        return null;
      }
      
      try {
        // Try multiple endpoints to find the working one
        const userId = await AsyncStorage.getItem('userId');
        const endpoints = [
          '/auth/me',
          `/users/${userId}`,
          '/users/me',
          '/user/profile'
        ];
        
        let userData = null;
        let workingEndpoint = null;
        
        for (const endpoint of endpoints) {
          try {
            console.log(`Trying to fetch user profile from: ${API_BASE_URL}${endpoint}`);
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            console.log(`Response status for ${endpoint}: ${response.status}`);
            
            if (response.ok) {
              userData = await response.json();
              workingEndpoint = endpoint;
              console.log(`Found working endpoint: ${endpoint}`);
              break;
            }
          } catch (endpointError) {
            console.warn(`Error for endpoint ${endpoint}:`, endpointError.message);
          }
        }
        
        // If we found data from a working endpoint
        if (userData) {
          // Update local storage with fresh data
          await AsyncStorage.setItem('user', JSON.stringify(userData));
          return userData;
        } else {
          console.warn('Failed to fetch user profile from any endpoint, falling back to local data');
        }
      } catch (serverError) {
        console.warn('Error fetching from server, falling back to local data:', serverError);
      }
      
      // If server request fails, try to get from local storage
      const userJson = await AsyncStorage.getItem('user');
      if (!userJson) {
        // If no user object stored, try to build one from individual pieces
        try {
          const userId = await AsyncStorage.getItem('userId');
          const username = await AsyncStorage.getItem('username');
          
          if (userId && username) {
            console.log('Building user object from stored pieces');
            const basicUser = {
              id: userId,
              _id: userId, // Include both formats for compatibility
              username: username,
              name: username // Use username as name if no dedicated name is available
            };
            
            // Save this basic profile for future use
            await AsyncStorage.setItem('user', JSON.stringify(basicUser));
            return basicUser;
          }
        } catch (buildError) {
          console.error('Error building user from pieces:', buildError);
        }
        
        console.error('Error loading user data: - Error: User data not found');
        return null;
      }
      
      return JSON.parse(userJson);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },
  
  // Get user by ID - new method to fetch a specific user
  async getUserById(userId) {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      // Validate token exists before making API call
      if (!token) {
        console.warn('No authentication token found - user may need to login');
        return null;
      }
      
      // Try multiple possible endpoints
      const endpoints = [
        `/users/${userId}`,
        `/user/${userId}`,
        `/auth/users/${userId}`
      ];
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying to fetch user by ID from: ${API_BASE_URL}${endpoint}`);
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            console.log(`Successfully fetched user from ${endpoint}`);
            return userData;
          }
        } catch (endpointError) {
          console.warn(`Error for endpoint ${endpoint}:`, endpointError.message);
        }
      }
      
      throw new Error(`Failed to fetch user with ID ${userId} from any endpoint`);
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
      return null;
    }
  },
  
  // Update user profile - connects to backend API
  async updateUserProfile(userData) {
    try {
      // Get authentication token
      const token = await AsyncStorage.getItem('userToken');
      
      // Validate token exists
      if (!token) {
        console.warn('No authentication token found - user may need to login');
        throw new Error('Authentication required');
      }
      
      // Try multiple possible endpoints for updating profile
      const endpoints = [
        '/user/profile',
        '/users/profile',
        '/auth/me',
        '/users/me'
      ];
      
      let updatedUser = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying to update profile at: ${API_BASE_URL}${endpoint}`);
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
          });
          
          if (response.ok) {
            updatedUser = await response.json();
            console.log(`Successfully updated profile at ${endpoint}`);
            break;
          } else {
            console.warn(`Failed to update profile at ${endpoint}: ${response.status}`);
          }
        } catch (endpointError) {
          console.warn(`Error for endpoint ${endpoint}:`, endpointError.message);
        }
      }
      
      if (!updatedUser) {
        throw new Error('Failed to update profile on any endpoint');
      }
      
      // Update local storage with server response
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      
      return updatedUser;
    } catch (error) {
      console.error('Error updating profile:', error);
      
      // Fallback: If server is unavailable, update local storage only
      // This is for development/testing - remove in production
      console.warn('Falling back to local storage update');
      try {
        // Get current user data first
        const userJson = await AsyncStorage.getItem('user');
        const currentUser = userJson ? JSON.parse(userJson) : {};
        
        // Merge with new data and add updatedAt timestamp
        const updatedUserData = {
          ...currentUser,
          ...userData,
          updatedAt: new Date().toISOString()
        };
        
        // Save to AsyncStorage
        await AsyncStorage.setItem('user', JSON.stringify(updatedUserData));
        
        return updatedUserData;
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        throw error; // Throw original error
      }
    }
  },
  
  // Save user activity preferences
  async saveUserActivities(activitySettings) {
    try {
      // Get authentication token
      const token = await AsyncStorage.getItem('userToken');
      
      // Validate token exists
      if (!token) {
        console.warn('No authentication token found - user may need to login');
        throw new Error('Authentication required');
      }
      
      // Try multiple possible endpoints
      const endpoints = [
        '/user/activities',
        '/users/activities',
        '/activities/user'
      ];
      
      let updatedUser = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`Trying to update activities at: ${API_BASE_URL}${endpoint}`);
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(activitySettings)
          });
          
          if (response.ok) {
            updatedUser = await response.json();
            console.log(`Successfully updated activities at ${endpoint}`);
            break;
          }
        } catch (endpointError) {
          console.warn(`Error for endpoint ${endpoint}:`, endpointError.message);
        }
      }
      
      if (!updatedUser) {
        throw new Error('Failed to update activities on any endpoint');
      }
      
      // Update local storage with server response
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      
      return updatedUser;
    } catch (error) {
      console.error('Error saving user activities:', error);
      
      // Fallback: If server is unavailable, update local storage only
      // This is for development/testing - remove in production
      console.warn('Falling back to local storage update');
      try {
        // Get current user data
        const userJson = await AsyncStorage.getItem('user');
        const user = userJson ? JSON.parse(userJson) : null;
        
        if (!user) {
          throw new Error('User not found');
        }
        
        // Update with new activity settings
        const updatedUser = {
          ...user,
          activities: {
            ...user.activities,
            ...activitySettings
          },
          updatedAt: new Date().toISOString()
        };
        
        // Save to AsyncStorage
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        
        return updatedUser;
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        throw error; // Throw original error
      }
    }
  }
};

// Group service for managing user groups
const groupService = {
  // Get user's groups with fully populated member data
  async getUserGroups() {
    try {
      // Get authentication token
      const token = await AsyncStorage.getItem('userToken');
      
      // Validate token exists before API call
      if (!token) {
        console.warn('No authentication token found - user may need to login');
        return []; // Return empty array if not authenticated
      }
      
      // Debug: Log token availability for troubleshooting
      console.log('Token available for groups API call:', !!token);
      
      // Make API request to get user's groups
      const response = await fetch(`${API_BASE_URL}/groups`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Log response status for debugging
      console.log('Groups API response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch groups: ${response.status} ${response.statusText}`);
      }
      
      const groups = await response.json();
      
      // Get current user for updating member data
      const currentUserJson = await AsyncStorage.getItem('user');
      const currentUser = currentUserJson ? JSON.parse(currentUserJson) : null;
      
      // Process groups to handle populated vs unpopulated members
      const processedGroups = await Promise.all(groups.map(async (group) => {
        // Check if members is an array of IDs or objects
        const populatedMembers = await Promise.all((group.members || []).map(async (member) => {
          // If member is just an ID string or ObjectId reference
          if (typeof member === 'string' || (member && !member.name && (member._id || member.id))) {
            const memberId = typeof member === 'string' ? member : (member._id || member.id);
            
            // If this is the current user, use current user data
            if (currentUser && (memberId === currentUser._id || memberId === currentUser.id)) {
              // Return user with a consistent id field
              return {
                id: currentUser._id || currentUser.id, // Choose one consistent id field
                name: currentUser.name,
                email: currentUser.email,
                bio: currentUser.bio,
                avatarUrl: currentUser.avatarUrl,
                // Include other needed fields but avoid duplicate IDs
              };
            }
            
            // Otherwise fetch user data from API
            try {
              const userData = await userService.getUserById(memberId);
              if (userData) {
                // Return user with consistent ID field
                return {
                  id: userData._id || userData.id, // Choose one consistent id field
                  name: userData.name,
                  email: userData.email,
                  bio: userData.bio || '',
                  avatarUrl: userData.avatarUrl,
                  // Include other needed fields
                };
              } else {
                // Return minimal user info with only id field
                return { 
                  id: memberId,  // Use only one ID field
                  name: `Member ${memberId.substring(0, 4)}` 
                };
              }
            } catch (err) {
              console.error(`Error fetching member ${memberId}:`, err);
              // Return minimal user info with only id field
              return { 
                id: memberId,  // Use only one ID field
                name: `Member ${memberId.substring(0, 4)}` 
              };
            }
          }
          
          // If it's already a user object but it's the current user, update with latest data
          if (currentUser && (member._id === currentUser._id || member.id === currentUser.id)) {
            // Merge, but ensure only one ID field
            return {
              id: currentUser._id || currentUser.id, // Choose one consistent id field
              name: currentUser.name,
              email: currentUser.email,
              bio: currentUser.bio || '',
              avatarUrl: currentUser.avatarUrl,
              // Include other needed fields
              ...member,
              _id: undefined // Remove the _id field to prevent duplication
            };
          }
          
          // Otherwise return as is, but ensure only one ID field
          if (member._id && member.id) {
            // If both fields exist, keep only one
            const { _id, ...rest } = member;
            return rest; // Return object without _id
          }
          return member;
        }));
        
        return { ...group, members: populatedMembers };
      }));
      
      return processedGroups;
    } catch (error) {
      console.error('Error fetching user groups with populated members:', error);
      
      // Return empty array if error occurs
      return [];
    }
  },
  
  // Get a specific group by ID with populated members
  async getGroupById(groupId) {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      // Validate token exists
      if (!token) {
        console.warn('No authentication token found - user may need to login');
        return null;
      }
      
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch group with ID ${groupId}`);
      }
      
      // Get group data
      const group = await response.json();
      
      // Process members similar to getUserGroups method
      const currentUserJson = await AsyncStorage.getItem('user');
      const currentUser = currentUserJson ? JSON.parse(currentUserJson) : null;
      
      const populatedMembers = await Promise.all((group.members || []).map(async (member) => {
        if (typeof member === 'string' || (member && !member.name && (member._id || member.id))) {
          const memberId = typeof member === 'string' ? member : (member._id || member.id);
          
          if (currentUser && (memberId === currentUser._id || memberId === currentUser.id)) {
            // Return user with a consistent id field
            return {
              id: currentUser._id || currentUser.id, // Choose one consistent id field
              name: currentUser.name,
              email: currentUser.email,
              bio: currentUser.bio || '',
              avatarUrl: currentUser.avatarUrl,
              // Include other needed fields
            };
          }
          
          try {
            const userData = await userService.getUserById(memberId);
            if (userData) {
              // Return user with consistent ID field
              return {
                id: userData._id || userData.id, // Choose one consistent id field
                name: userData.name,
                email: userData.email,
                bio: userData.bio || '',
                avatarUrl: userData.avatarUrl,
                // Include other needed fields
              };
            } else {
              // Return minimal user info with only id field
              return { 
                id: memberId,  // Use only one ID field
                name: `Member ${memberId.substring(0, 4)}` 
              };
            }
          } catch (err) {
            console.error(`Error fetching member ${memberId}:`, err);
            // Return minimal user info with only id field
            return { 
              id: memberId,  // Use only one ID field
              name: `Member ${memberId.substring(0, 4)}` 
            };
          }
        }
        
        if (currentUser && (member._id === currentUser._id || member.id === currentUser.id)) {
          // Merge, but ensure only one ID field
          return {
            id: currentUser._id || currentUser.id, // Choose one consistent id field
            name: currentUser.name,
            email: currentUser.email,
            bio: currentUser.bio || '',
            avatarUrl: currentUser.avatarUrl,
            // Include other needed fields
            ...member,
            _id: undefined // Remove the _id field to prevent duplication
          };
        }
        
        // Otherwise return as is, but ensure only one ID field
        if (member._id && member.id) {
          // If both fields exist, keep only one
          const { _id, ...rest } = member;
          return rest; // Return object without _id
        }
        return member;
      }));
      
      return { ...group, members: populatedMembers };
    } catch (error) {
      console.error(`Error fetching group ${groupId}:`, error);
      return null;
    }
  }
};

export { userService, groupService };
