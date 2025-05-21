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

// Utility function to refresh token
const refreshAuthToken = async () => {
  try {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    const currentToken = await AsyncStorage.getItem('userToken');
    
    if (!refreshToken || !currentToken) {
      console.warn('Cannot refresh token: missing refresh token or current token');
      return false;
    }
    
    // Check if token is expired
    let needsRefresh = false;
    
    try {
      // Simple check for JWT expiration - splitting token and checking second part
      const tokenParts = currentToken.split('.');
      if (tokenParts.length === 3) {
        // Decode the payload part (second part)
        const payload = JSON.parse(atob(tokenParts[1]));
        
        // If token expires in less than 5 minutes, refresh it
        const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
        if (payload.exp && payload.exp * 1000 < fiveMinutesFromNow) {
          console.log('Token expires soon, refreshing');
          needsRefresh = true;
        }
      }
    } catch (tokenCheckError) {
      console.warn('Error checking token expiration, will attempt refresh:', tokenCheckError);
      needsRefresh = true;
    }
    
    if (!needsRefresh) {
      return true; // Token is still valid
    }
    
    // Attempt to refresh token
    const apiUrl = await getApiUrl();
    const response = await fetch(`${apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ refreshToken })
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.token) {
        await AsyncStorage.setItem('userToken', data.token);
        console.log('Auth token refreshed successfully');
        return true;
      }
    }
    
    console.warn('Token refresh failed');
    return false;
  } catch (error) {
    console.error('Error refreshing auth token:', error);
    return false;
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
              name: username || 'User', // Use username as name if no dedicated name is available
              loadedFromLocalOnly: true // Flag to indicate this was built locally
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
      
      const parsedUser = JSON.parse(userJson);
      // Add flag to indicate this was loaded from local storage
      parsedUser.loadedFromLocalOnly = true;
      return parsedUser;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  },
  
  // Update user profile - connects to profile API
  async updateUserProfile(userData) {
    console.log('===== START updateUserProfile =====');
    try {
      // Get authentication token
      const token = await AsyncStorage.getItem('userToken');
      
      // Validate token exists
      if (!token) {
        console.warn('No authentication token found - user may need to login');
        throw new Error('Authentication required');
      }
      
      // Attempt to refresh token if needed
      await refreshAuthToken();
      
      // Validate input
      if (!userData) {
        throw new Error('No user data provided for update');
      }
      
      if (!userData.id && !userData._id) {
        console.error('No user ID provided in userData:', userData);
        throw new Error('User ID is required for profile update');
      }
      
      // Re-get the token in case it was refreshed
      const currentToken = await AsyncStorage.getItem('userToken');
      
      // Ensure userData has proper ID format
      const userDataToSend = {
        ...userData,
        // Ensure ID is included
        id: userData.id || userData._id,
      };
      
      console.log('Sending profile update with user ID:', userDataToSend.id);
      
      // Try the profile API endpoint
      try {
        // Attempt to refresh token explicitly before making the request
        try {
          await refreshAuthToken();
        } catch (refreshError) {
          console.warn('Token refresh attempt failed, will try with existing token:', refreshError);
        }
        
        // Re-get the token after potential refresh
        const currentToken = await AsyncStorage.getItem('userToken');
        if (!currentToken) {
          throw new Error('Authentication required: No valid token available');
        }
        
        const apiUrl = await getApiUrl();
        console.log(`Sending PUT request to ${apiUrl}/profiles`);
        
        const response = await fetch(`${apiUrl}/profiles`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`
          },
          body: JSON.stringify(userDataToSend)
        });
        
        console.log(`API Response status: ${response.status}`);
        
        // Get the response body content regardless of success/failure
        let responseData;
        try {
          // Try to parse as JSON regardless of success
          const textResponse = await response.text();
          console.log(`Response body (first 100 chars): ${textResponse.substring(0, 100)}${textResponse.length > 100 ? '...' : ''}`);
          
          try {
            responseData = JSON.parse(textResponse);
          } catch (jsonError) {
            console.warn(`Error parsing response as JSON: ${jsonError.message}`);
            responseData = { rawResponse: textResponse };
          }
        } catch (readError) {
          console.warn(`Error reading response body: ${readError.message}`);
          responseData = null;
        }
        
        if (response.ok) {
          const updatedProfile = responseData;
          console.log('Profile updated successfully. Profile data:', 
            updatedProfile ? JSON.stringify({
              id: updatedProfile.id,
              name: updatedProfile.name,
              // Omit potentially large avatar data
            }) : 'No profile data returned');
          
          // Format for consistency
          const updatedUser = {
            id: updatedProfile.user ? (typeof updatedProfile.user === 'string' ? updatedProfile.user : updatedProfile.user.id || updatedProfile.user._id) : userData.id,
            name: updatedProfile.name || userData.name,
            email: updatedProfile.user && updatedProfile.user.email || userData.email || '',
            username: updatedProfile.user && updatedProfile.user.username || userData.username || '',
            bio: updatedProfile.bio || userData.bio || '',
            longTermGoal: updatedProfile.longTermGoal || userData.longTermGoal || '',
            avatarUrl: updatedProfile.avatarUrl || userData.avatarUrl,
            activitySettings: updatedProfile.activitySettings || userData.activitySettings || {
              physicalActivities: [],
              mentalActivities: [],
              bonusActivities: []
            },
            status: updatedProfile.status || userData.status || 'Active',
            createdAt: updatedProfile.createdAt || userData.createdAt,
            updatedAt: updatedProfile.updatedAt || new Date().toISOString()
          };
          
          // Update local storage
          await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
          console.log('===== END updateUserProfile - SUCCESS =====');
          return updatedUser;
        } else {
          // If the primary /api/profiles endpoint fails, parse the error and throw it.
          const errorMessage = responseData && responseData.message 
            ? responseData.message 
            : `Failed to update profile. Status: ${response.status}`;
          
          const errorDetail = responseData && responseData.error
            ? responseData.error
            : 'No detailed error information available';
            
          console.error('Failed to update profile via /api/profiles:', errorMessage, errorDetail);
          throw new Error(errorMessage);
        }
      } catch (profileUpdateAttemptError) {
        // This catch handles errors from the fetch call itself (network error) 
        // or from parsing the JSON if the primary call failed.
        console.error('Error during primary profile update attempt (/api/profiles):', profileUpdateAttemptError);
        throw profileUpdateAttemptError; 
      }
    } catch (error) { // This is the outermost catch for userService.updateUserProfile
      console.error('Overall error in updateUserProfile:', error);
      
      // Handle fallback to local storage
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
        
        console.log('===== END updateUserProfile - FALLBACK SUCCESS =====');
        
        // Add flag to indicate this was a local-only update
        updatedUserData.fallbackOnly = true;
        return updatedUserData;
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        console.log('===== END updateUserProfile - COMPLETE FAILURE =====');
        throw error; // Throw original error if fallback fails
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
  },
  
  // Add refreshAuthToken to the user service object
  refreshAuthToken: refreshAuthToken
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

export { userService, groupService, profileService, refreshAuthToken };
