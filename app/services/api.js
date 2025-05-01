import AsyncStorage from '@react-native-async-storage/async-storage';

// Base API URL - updated to use the deployed server 
const API_BASE_URL = 'https://slugger-app-group6.onrender.com/api';

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
      
      // Get the API URL from utils and use the deployed URL
      const API_URLS = await import('../utils').then(module => module.getApiUrl());
      const apiUrl = API_URLS[0]; // Use the first URL which should be the deployed one
      
      console.log('Using API URL for user profile fetch:', apiUrl);
      
      try {
        // First try to get the profile from the profiles endpoint
        const response = await fetch(`${apiUrl}/profiles/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const profileData = await response.json();
          
          // Combine user and profile data
          const userData = {
            id: profileData.user,
            name: profileData.name,
            email: profileData.user?.email || '',
            username: profileData.user?.username || '',
            bio: profileData.bio || '',
            longTermGoal: profileData.longTermGoal || '',
            avatarUrl: profileData.avatarUrl,
            activitySettings: profileData.activitySettings || {
              physicalActivities: [],
              mentalActivities: [],
              bonusActivities: []
            },
            status: profileData.status || 'Active',
            createdAt: profileData.createdAt,
            updatedAt: profileData.updatedAt
          };
          
          // Update local storage with fresh data
          await AsyncStorage.setItem('user', JSON.stringify(userData));
          return userData;
        }
        
        // Fallback to legacy endpoint if profile API fails
        console.warn('Profile API failed, falling back to user API');
        
        const userResponse = await fetch(`${apiUrl}/auth/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          await AsyncStorage.setItem('user', JSON.stringify(userData));
          return userData;
        }
        
        console.warn('Failed to fetch user profile from any endpoint, falling back to local data');
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
          
          if (userId) {
            const basicUser = {
              id: userId,
              _id: userId, // Include both formats for compatibility
              username: username || "User", // Provide a default if username is null
              name: username || "User" // Use username as name if no dedicated name is available
            };
            
            // Save this basic profile for future use
            await AsyncStorage.setItem('user', JSON.stringify(basicUser));
            return basicUser;
          }
        } catch (buildError) {
          console.error('Error building user from pieces:', buildError);
        }
        
        console.error('Error loading user data - User data not found');
        return null;
      }
      
      return JSON.parse(userJson);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },
  
  // Update user profile - connects to profile API
  async updateUserProfile(userData) {
    try {
      // Get authentication token
      const token = await AsyncStorage.getItem('userToken');
      
      // Validate token exists
      if (!token) {
        console.warn('No authentication token found - user may need to login');
        throw new Error('Authentication required');
      }
      
      // Get the API URL from utils and use the deployed URL
      const API_URLS = await import('../utils').then(module => module.getApiUrl());
      const apiUrl = API_URLS[0]; // Use the first URL which should be the deployed one
      
      console.log('Using API URL for profile update:', apiUrl);
      
      // Try the profile API endpoint
      try {
        const response = await fetch(`${apiUrl}/profiles`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(userData)
        });
        
        if (response.ok) {
          const updatedProfile = await response.json();
          
          // Format for consistency
          const updatedUser = {
            id: updatedProfile.user,
            name: updatedProfile.name,
            email: updatedProfile.user?.email || '',
            username: updatedProfile.user?.username || '',
            bio: updatedProfile.bio || '',
            longTermGoal: updatedProfile.longTermGoal || '',
            avatarUrl: updatedProfile.avatarUrl,
            activitySettings: updatedProfile.activitySettings || {
              physicalActivities: [],
              mentalActivities: [],
              bonusActivities: []
            },
            status: updatedProfile.status || 'Active',
            createdAt: updatedProfile.createdAt,
            updatedAt: updatedProfile.updatedAt
          };
          
          // Update local storage
          await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
          return updatedUser;
        } else {
          console.warn(`Failed to update profile: ${response.status}`);
        }
      } catch (profileError) {
        console.warn('Profile API error:', profileError.message);
      }
      
      // Fallback to legacy user API
      console.log('Falling back to user API endpoint');
      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.status}`);
      }
      
      const updatedUser = await response.json();
      
      // Update local storage with server response
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      
      return updatedUser;
    } catch (error) {
      console.error('Error updating profile:', error);
      
      // Fallback: If server is unavailable, update local storage only
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
  
  // Save user activity preferences - updated to use profiles/activities endpoint
  async saveUserActivities(activitySettings) {
    try {
      // Get authentication token
      const token = await AsyncStorage.getItem('userToken');
      
      // Validate token exists
      if (!token) {
        console.warn('No authentication token found - user may need to login');
        throw new Error('Authentication required');
      }
      
      // Get the API URL from utils and use the deployed URL
      const API_URLS = await import('../utils').then(module => module.getApiUrl());
      const apiUrl = API_URLS[0]; // Use the first URL which should be the deployed one
      
      console.log('Using API URL for activities update:', apiUrl);
      
      // Try profile activities endpoint
      try {
        const response = await fetch(`${apiUrl}/profiles/activities`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(activitySettings)
        });
        
        if (response.ok) {
          const updatedProfile = await response.json();
          
          // Get current user data
          const userJson = await AsyncStorage.getItem('user');
          const user = userJson ? JSON.parse(userJson) : {};
          
          // Update with new activity settings
          const updatedUser = {
            ...user,
            activitySettings: updatedProfile.activitySettings,
            updatedAt: updatedProfile.updatedAt
          };
          
          // Save to AsyncStorage
          await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
          
          return updatedUser;
        }
      } catch (profileError) {
        console.warn('Profile API error:', profileError.message);
      }
      
      // Fallback to legacy activities endpoint
      const legacyEndpoints = [
        '/user/activities',
        '/users/activities',
        '/activities/user'
      ];
      
      for (const endpoint of legacyEndpoints) {
        try {
          const response = await fetch(`${apiUrl}${endpoint}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(activitySettings)
          });
          
          if (response.ok) {
            const updatedUser = await response.json();
            
            // Update local storage with server response
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
            
            return updatedUser;
          }
        } catch (endpointError) {
          console.warn(`Error for endpoint ${endpoint}:`, endpointError.message);
        }
      }
      
      throw new Error('Failed to update activities on any endpoint');
    } catch (error) {
      console.error('Error saving user activities:', error);
      
      // Fallback: If server is unavailable, update local storage only
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
          activitySettings: {
            ...user.activitySettings,
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

// Other services remain unchanged
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
      
      // Get the API URL from utils and use the deployed URL
      const API_URLS = await import('../utils').then(module => module.getApiUrl());
      const apiUrl = API_URLS[0]; // Use the first URL which should be the deployed one
      
      console.log('Using API URL for group fetch:', apiUrl);
      
      // Make API request to get user's groups
      try {
        const response = await fetch(`${apiUrl}/teams`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
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
      } catch (fetchError) {
        console.error('Error fetching teams with main endpoint:', fetchError);
        
        // Try the alternative endpoint as a fallback
        console.log('Attempting to use alternative endpoint...');
        try {
          // Try with the teamService as fallback
          const { default: teamService } = await import('../services/teamService');
          const teams = await teamService.getUserTeams();
          console.log('Successfully retrieved teams from teamService:', teams.length);
          return teams;
        } catch (teamServiceError) {
          console.error('TeamService fallback also failed:', teamServiceError);
          throw new Error('All team/group fetch attempts failed');
        }
      }
    } catch (error) {
      console.error('Error fetching user groups with populated members:', error);
      
      // More detailed logging to help debug
      if (error.response) {
        console.error('Response error:', error.response.status, error.response.statusText);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('Request error - no response received');
      } else {
        console.error('Error message:', error.message);
      }
      
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
      
      // Get the API URL from utils and use the deployed URL
      const API_URLS = await import('../utils').then(module => module.getApiUrl());
      const apiUrl = API_URLS[0]; // Use the first URL which should be the deployed one
      
      console.log('Using API URL for group fetch by ID:', apiUrl);
      
      try {
        const response = await fetch(`${apiUrl}/teams/${groupId}`, {
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
      } catch (fetchError) {
        console.error(`Error fetching team with ID ${groupId}:`, fetchError);
        
        // Try the alternative service as a fallback
        console.log('Attempting to use teamService as fallback...');
        try {
          const { default: teamService } = await import('../services/teamService');
          const team = await teamService.getTeamById(groupId);
          console.log('Successfully retrieved team from teamService');
          return team;
        } catch (teamServiceError) {
          console.error('TeamService fallback also failed:', teamServiceError);
          throw new Error(`All attempts to fetch team/group ${groupId} failed`);
        }
      }
    } catch (error) {
      console.error(`Error in getGroupById for ${groupId}:`, error);
      
      // More detailed error logging
      if (error.response) {
        console.error('Response error:', error.response.status, error.response.statusText);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('Request error - no response received');
      } else {
        console.error('Error message:', error.message);
      }
      
      return null;
    }
  }
};

// Add new profileService for direct profile operations
const profileService = {
  // Get the user's profile directly (not through user)
  async getProfile() {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.warn('No authentication token found - user may need to login');
        return null;
      }
      
      // Get the API URL from utils and use the deployed URL
      const API_URLS = await import('../utils').then(module => module.getApiUrl());
      const apiUrl = API_URLS[0]; // Use the first URL which should be the deployed one
      
      console.log('Using API URL for profile fetch:', apiUrl);
      
      const response = await fetch(`${apiUrl}/profiles/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.status}`);
      }
      
      const profile = await response.json();
      return profile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  },
  
  // Update profile directly
  async updateProfile(profileData) {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.warn('No authentication token found - user may need to login');
        throw new Error('Authentication required');
      }
      
      // Get the API URL from utils and use the deployed URL
      const API_URLS = await import('../utils').then(module => module.getApiUrl());
      const apiUrl = API_URLS[0]; // Use the first URL which should be the deployed one
      
      console.log('Using API URL for profile update:', apiUrl);
      
      const response = await fetch(`${apiUrl}/profiles`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.status}`);
      }
      
      const updatedProfile = await response.json();
      return updatedProfile;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },
  
  // Update just the activities portion of the profile
  async updateActivities(activitySettings) {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.warn('No authentication token found - user may need to login');
        throw new Error('Authentication required');
      }
      
      // Get the API URL from utils and use the deployed URL
      const API_URLS = await import('../utils').then(module => module.getApiUrl());
      const apiUrl = API_URLS[0]; // Use the first URL which should be the deployed one
      
      console.log('Using API URL for activities update:', apiUrl);
      
      const response = await fetch(`${apiUrl}/profiles/activities`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(activitySettings)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update activities: ${response.status}`);
      }
      
      const updatedProfile = await response.json();
      return updatedProfile;
    } catch (error) {
      console.error('Error updating activities:', error);
      throw error;
    }
  }
};

export { userService, groupService, profileService };
