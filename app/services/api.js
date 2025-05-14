import AsyncStorage from '@react-native-async-storage/async-storage';

// Base API URL - consider moving this to an environment config
const API_BASE_URL = 'https://slugger-app-group6.onrender.com/api';

// Fallback URL if the main one fails
const FALLBACK_API_URL = 'http://localhost:5001/api';

// Function to determine which API URL to use
const getApiUrl = async () => {
  try {
    // Try to get a stored custom API URL
    const customUrl = await AsyncStorage.getItem('apiBaseUrl');
    if (customUrl) {
      return `${customUrl}/api`;
    }
    return API_BASE_URL;
  } catch (error) {
    console.error('Error getting API URL:', error);
    return API_BASE_URL;
  }
};

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
      
      const apiUrl = await getApiUrl();
      
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
          // Ensure 'id' is the string ID from the populated 'user' object or the user ID itself.
          let userIdStr = null;
          if (profileData.user) {
            if (typeof profileData.user === 'string') {
              userIdStr = profileData.user; // Should be the ID string
            } else if (typeof profileData.user === 'object') {
              // If user is populated, it's an object. Prefer .id (virtual) or ._id.
              userIdStr = profileData.user.id || (profileData.user._id ? profileData.user._id.toString() : null);
            }
          }
          const userData = {
            id: userIdStr,
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
          const token = await AsyncStorage.getItem('userToken');
          
          if (userId && token) {
            // Try to fetch from API first
            try {
              const apiUrl = await getApiUrl();
              const response = await fetch(`${apiUrl}/auth/me`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (response.ok) {
                const userData = await response.json();
                await AsyncStorage.setItem('user', JSON.stringify(userData));
                return userData;
              }
            } catch (apiError) {
              console.error('Error fetching user data from API:', apiError);
            }
            
            // Build a basic user object from available data
            const basicUser = {
              id: userId,
              _id: userId, // Include both formats for compatibility
              username: username || 'User', // Fallback name if username is not available
              name: username || 'User' // Use username as name if no dedicated name is available
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
      
      // Try the profile API endpoint
      try {
        const apiUrl = await getApiUrl();
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
          // If the primary /api/profiles endpoint fails, parse the error and throw it.
          const errorData = await response.json().catch(() => ({ message: `Failed to update profile. Status: ${response.status}` }));
          console.error('Failed to update profile via /api/profiles:', errorData);
          throw new Error(errorData.message || `Server error: ${response.status}`);
        }
      } catch (profileUpdateAttemptError) {
        // This catch handles errors from the fetch call itself (network error) 
        // or from parsing the JSON if the primary call failed.
        console.error('Error during primary profile update attempt (/api/profiles):', profileUpdateAttemptError);
        // Instead of falling back, we re-throw to ensure EditProfile.jsx handles it.
        // If fallback logic is desired for specific network errors, it can be added here.
        throw profileUpdateAttemptError; 
      }
      // Fallback logic removed to ensure errors from primary endpoint are handled.
      // If legacy API fallback is strictly needed, it would require more nuanced error checking.
    } catch (error) { // This is the outermost catch for userService.updateUserProfile
      console.error('Overall error in updateUserProfile:', error);
      // The original fallback to local storage update for network errors can remain if desired,
      // but it won't be reached if the API call (even if failed with 500) completes.
      // For clarity, let's ensure any error from API attempts is thrown.
      // The local storage fallback below is more for offline-first, which is complex.
      // For now, let's remove the local storage fallback to simplify and ensure server errors are surfaced.
      // console.warn('Falling back to local storage update');
      // try {
      //   const userJson = await AsyncStorage.getItem('user');
      //   const currentUser = userJson ? JSON.parse(userJson) : {};
      //   const updatedUserData = { ...currentUser, ...userData, updatedAt: new Date().toISOString() };
      //   await AsyncStorage.setItem('user', JSON.stringify(updatedUserData));
      //   return updatedUserData;
      // } catch (fallbackError) {
      //   console.error('Fallback error:', fallbackError);
      // }
      throw error; // Re-throw the error to be handled by the calling component
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
      
      // Try profile activities endpoint
      try {
        const apiUrl = await getApiUrl();
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
          const apiUrl = await getApiUrl();
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
      
      // Make API request to get user's groups
      // Corrected endpoint from /groups to /teams
      const apiUrl = await getApiUrl();
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
      // Backend now populates members with 'email username name'.
      // The complex client-side processing can be simplified.
      // We just need to ensure each member object has a consistent 'id' field (string).
      const processedGroups = groups.map(group => {
        const processedMembers = (group.members || []).map(member => {
          if (member && typeof member === 'object') {
            return {
              ...member,
              id: member.id || (member._id ? member._id.toString() : undefined)
            };
          }
          return member; // Should not happen if backend populates correctly
        });
        return { ...group, members: processedMembers };
      });
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
      
      const apiUrl = await getApiUrl();
      const response = await fetch(`${apiUrl}/groups/${groupId}`, {
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
      
      // If team details are fetched, members should already be populated by the backend.
      // The complex client-side member processing might be redundant if backend populates correctly.
      // For now, keeping the existing client-side processing logic, but it's a candidate for review.
      // Backend route GET /api/teams/:teamId now populates members.
      // Simplify client-side processing.
      const processedMembers = (group.members || []).map(member => {
        if (member && typeof member === 'object') {
          return {
            ...member,
            id: member.id || (member._id ? member._id.toString() : undefined)
          };
        }
        return member;
      });
      return { ...group, members: processedMembers };
    } catch (error) {
      console.error(`Error fetching group ${groupId}:`, error);
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
      
      const apiUrl = await getApiUrl();
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
      
      const apiUrl = await getApiUrl();
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
      
      const apiUrl = await getApiUrl();
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
