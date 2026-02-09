/**
 * API Service for CivicLens
 * Handles all HTTP requests to the backend
 */

import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 errors - try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(
            `${api.defaults.baseURL}/auth/refresh-token`,
            { refreshToken }
          );
          
          // Backend returns: { success, data: { accessToken, refreshToken } }
          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }
          
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed - clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

/**
 * Auth API endpoints
 */
export const authApi = {
  /**
   * Register a new user
   */
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    // Backend returns: { success, data: { user, tokens: { accessToken, refreshToken } } }
    const { user, tokens } = response.data.data;
    
    // Store tokens
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    
    return { user, ...tokens };
  },

  /**
   * Login user
   */
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    // Backend returns: { success, data: { user, tokens: { accessToken, refreshToken } } }
    const { user, tokens } = response.data.data;
    
    // Store tokens
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    
    return { user, ...tokens };
  },

  /**
   * Logout user
   */
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },

  /**
   * Logout from all devices
   */
  logoutAll: async () => {
    try {
      await api.post('/auth/logout-all');
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },

  /**
   * Get current user profile
   */
  getMe: async () => {
    const response = await api.get('/auth/me');
    // Backend returns: { success, data: { user } }
    return response.data.data;
  },

  /**
   * Update user profile
   */
  updateProfile: async (data) => {
    const response = await api.patch('/auth/me', data);
    // Backend returns: { success, data: { user } }
    return response.data.data;
  },

  /**
   * Change password
   */
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.patch('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  /**
   * Request password reset
   */
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Reset password with token
   */
  resetPassword: async (token, newPassword) => {
    const response = await api.post(`/auth/reset-password/${token}`, {
      password: newPassword,
    });
    return response.data;
  },

  /**
   * Verify email
   */
  verifyEmail: async (token) => {
    const response = await api.get(`/auth/verify-email/${token}`);
    return response.data;
  },

  /**
   * Resend verification email
   */
  resendVerification: async () => {
    const response = await api.post('/auth/resend-verification');
    return response.data;
  },

  /**
   * Get all users (Admin only)
   */
  getUsers: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.role) queryParams.append('role', params.role);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    
    const response = await api.get(`/auth/users?${queryParams.toString()}`);
    return response.data;
  },

  /**
   * Create user (Admin only)
   */
  createUser: async (userData) => {
    const response = await api.post('/auth/users', userData);
    return response.data;
  },

  /**
   * Get user by ID (Admin only)
   */
  getUserById: async (id) => {
    const response = await api.get(`/auth/users/${id}`);
    return response.data;
  },

  /**
   * Update user (Admin only)
   */
  updateUser: async (id, data) => {
    const response = await api.patch(`/auth/users/${id}`, data);
    return response.data;
  },

  /**
   * Delete user (Admin only)
   */
  deleteUser: async (id) => {
    const response = await api.delete(`/auth/users/${id}`);
    return response.data;
  },

  /**
   * Delete own account (requires password)
   */
  deleteMe: async (password) => {
    const response = await api.delete('/auth/me', { data: { password } });
    return response.data;
  },

  /**
   * Alias for deleteMe for backward compatibility
   */
  deleteAccount: async (password) => {
    return authApi.deleteMe(password);
  },

  /**
   * Update user settings (notifications, privacy)
   * Note: This uses the updateProfile endpoint
   */
  updateSettings: async (settings) => {
    const response = await api.patch('/auth/me', settings);
    return response.data;
  },

  /**
   * Update user avatar
   * Note: Uses the updateProfile endpoint with multipart form data
   */
  updateAvatar: async (formData) => {
    const response = await api.patch('/auth/me', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

/**
 * Complaint API endpoints
 */
export const complaintsApi = {
  /**
   * Fetch complaints with optional filters
   * @param {Object} filters - Query parameters for filtering
   * @returns {Promise} - Array of complaints
   */
  getComplaints: async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.category) params.append('category', filters.category);
    if (filters.severity_min) params.append('severity_min', filters.severity_min);
    if (filters.severity_max) params.append('severity_max', filters.severity_max);
    if (filters.status) params.append('status', filters.status);
    if (filters.uc_id) params.append('uc_id', filters.uc_id);
    if (filters.town) params.append('town', filters.town);
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    if (filters.bounds) {
      params.append('sw_lat', filters.bounds.sw_lat);
      params.append('sw_lng', filters.bounds.sw_lng);
      params.append('ne_lat', filters.bounds.ne_lat);
      params.append('ne_lng', filters.bounds.ne_lng);
    }
    
    const response = await api.get(`/complaints?${params.toString()}`);
    return response.data;
  },

  /**
   * Fetch heatmap-optimized data
   * @param {Object} filters - Optional filters
   * @returns {Promise} - Array of [lat, lng, intensity]
   */
  getHeatmapData: async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.category) params.append('category', filters.category);
    if (filters.severity_min) params.append('severity_min', filters.severity_min);
    if (filters.status) params.append('status', filters.status);
    if (filters.bounds) {
      params.append('sw_lat', filters.bounds.sw_lat);
      params.append('sw_lng', filters.bounds.sw_lng);
      params.append('ne_lat', filters.bounds.ne_lat);
      params.append('ne_lng', filters.bounds.ne_lng);
    }
    
    const response = await api.get(`/complaints/heatmap?${params.toString()}`);
    return response.data;
  },

  /**
   * Get complaint by ID
   * @param {string} id - Complaint ID
   * @returns {Promise} - Single complaint object
   */
  getComplaintById: async (id) => {
    const response = await api.get(`/complaints/${id}`);
    return response.data;
  },

  /**
   * Get complaint statistics
   * @param {Object} filters - Optional filters
   * @returns {Promise} - Statistics object
   */
  getStats: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.uc_id) params.append('uc_id', filters.uc_id);
    if (filters.town) params.append('town', filters.town);
    
    const response = await api.get(`/complaints/stats?${params.toString()}`);
    return response.data;
  },

  /**
   * Get AI classification statistics
   * @returns {Promise} - AI stats object
   */
  getAIStats: async () => {
    const response = await api.get('/complaints/ai-stats');
    return response.data;
  },

  /**
   * Get global heatmap data
   * @returns {Promise} - Global heatmap data
   */
  getGlobalHeatmap: async () => {
    const response = await api.get('/complaints/heatmap/global');
    return response.data;
  },

  /**
   * Get profile-specific heatmap data
   * @param {string} entityId - UC or Town ID
   * @returns {Promise} - Profile heatmap data
   */
  getProfileHeatmap: async (entityId) => {
    const response = await api.get(`/complaints/heatmap/profile/${entityId}`);
    return response.data;
  },

  /**
   * Submit a new complaint
   * @param {Object} complaintData - Complaint data
   * @returns {Promise} - Created complaint
   */
  createComplaint: async (complaintData) => {
    const response = await api.post('/complaints', complaintData);
    return response.data;
  },

  /**
   * Update complaint status (Officer+)
   * @param {string} id - Complaint ID
   * @param {string} status - New status
   * @param {string} notes - Optional notes
   * @returns {Promise} - Updated complaint
   */
  updateStatus: async (id, status, notes = '') => {
    const response = await api.patch(`/complaints/${id}/status`, { status, notes });
    return response.data;
  },

  /**
   * Get current user's complaints
   * @param {Object} params - Pagination and filter params
   * @returns {Promise} - User's complaints
   */
  getMyComplaints: async (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.status) queryParams.append('status', params.status);
    if (params.search) queryParams.append('search', params.search);
    
    const response = await api.get(`/complaints/my?${queryParams.toString()}`);
    return response.data;
  },

  /**
   * Alias for getComplaintById for backward compatibility
   * @param {string} id - Complaint ID
   * @returns {Promise} - Single complaint object
   */
  getComplaint: async (id) => {
    const response = await api.get(`/complaints/${id}`);
    return response.data;
  },

  /**
   * Add comment to complaint
   * Note: Backend might not support this yet - placeholder
   * @param {string} id - Complaint ID
   * @param {Object} data - Comment data
   * @returns {Promise} - Updated complaint
   */
  addComment: async (id, data) => {
    const response = await api.post(`/complaints/${id}/comments`, data);
    return response.data;
  },

  /**
   * Delete complaint (citizen can delete own pending complaints)
   * Note: Backend might not support this yet - placeholder
   * @param {string} id - Complaint ID
   * @returns {Promise} - Success response
   */
  deleteComplaint: async (id) => {
    const response = await api.delete(`/complaints/${id}`);
    return response.data;
  },
};

/**
 * Territory API endpoints
 */
export const territoriesApi = {
  /**
   * Fetch territory boundaries (UC/Town)
   * @param {Object} params - Query parameters
   * @returns {Promise} - GeoJSON territories
   */
  getTerritories: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.level) queryParams.append('level', params.level);
    if (params.city) queryParams.append('city', params.city);
    if (params.town) queryParams.append('town', params.town);
    
    const response = await api.get(`/territories?${queryParams.toString()}`);
    return response.data;
  },

  /**
   * Fetch UC boundaries
   * @param {string} city - City name
   * @returns {Promise} - GeoJSON UC boundaries
   */
  getUCBoundaries: async (city = 'Karachi') => {
    const response = await api.get(`/territories?level=UC&city=${city}`);
    return response.data;
  },

  /**
   * Fetch Town boundaries
   * @param {string} city - City name
   * @returns {Promise} - GeoJSON Town boundaries
   */
  getTownBoundaries: async (city = 'Karachi') => {
    const response = await api.get(`/territories?level=Town&city=${city}`);
    return response.data;
  },

  /**
   * Get list of all UCs
   * @returns {Promise} - Array of UC objects
   */
  getUCList: async () => {
    const response = await api.get('/territories/ucs');
    return response.data;
  },

  /**
   * Get list of all Towns
   * @returns {Promise} - Array of Town objects
   */
  getTownList: async () => {
    const response = await api.get('/territories/towns');
    return response.data;
  },

  /**
   * Get list of all Cities
   * @returns {Promise} - Array of City objects
   */
  getCities: async () => {
    const response = await api.get('/territories/cities');
    return response.data;
  },

  /**
   * Get single territory by ID
   * @param {string} id - Territory ID
   * @returns {Promise} - Territory details
   */
  getTerritory: async (id) => {
    const response = await api.get(`/territories/${id}`);
    return response.data;
  },

  /**
   * Create new territory
   * @param {Object} data - Territory data (type, name, code, etc.)
   * @returns {Promise} - Created territory
   */
  createTerritory: async (data) => {
    const response = await api.post('/territories', data);
    return response.data;
  },

  /**
   * Update territory
   * @param {string} id - Territory ID
   * @param {Object} data - Updated data
   * @returns {Promise} - Updated territory
   */
  updateTerritory: async (id, data) => {
    const response = await api.put(`/territories/${id}`, data);
    return response.data;
  },

  /**
   * Delete (deactivate) territory
   * @param {string} id - Territory ID
   * @returns {Promise} - Success message
   */
  deleteTerritory: async (id) => {
    const response = await api.delete(`/territories/${id}`);
    return response.data;
  },
};

/**
 * Categories API
 */
export const categoriesApi = {
  /**
   * Get all complaint categories
   * @returns {Promise} - Array of categories
   */
  getCategories: async () => {
    const response = await api.get('/categories');
    return response.data;
  },

  /**
   * Get category statistics
   * @returns {Promise} - Category stats
   */
  getStats: async () => {
    const response = await api.get('/categories/stats');
    return response.data;
  },

  /**
   * Classify text using AI
   * @param {string} text - Text to classify
   * @returns {Promise} - Classification result
   */
  classifyText: async (text) => {
    const response = await api.post('/categories/classify', { text });
    return response.data;
  },

  /**
   * Get category by name
   * @param {string} name - Category name
   * @returns {Promise} - Category details
   */
  getByName: async (name) => {
    const response = await api.get(`/categories/${encodeURIComponent(name)}`);
    return response.data;
  },

  /**
   * Seed default categories (Admin only)
   * @returns {Promise} - Seeded categories
   */
  seedCategories: async () => {
    const response = await api.post('/categories/seed');
    return response.data;
  },
};

/**
 * Voice API endpoints
 */
export const voiceApi = {
  /**
   * Get speech service status
   * @returns {Promise} - Service status
   */
  getStatus: async () => {
    const response = await api.get('/voice/status');
    return response.data;
  },

  /**
   * Get supported languages
   * @returns {Promise} - Array of supported languages
   */
  getLanguages: async () => {
    const response = await api.get('/voice/languages');
    return response.data;
  },

  /**
   * Transcribe audio file
   * @param {File} audioFile - Audio file to transcribe
   * @param {string} language - Language code (optional)
   * @returns {Promise} - Transcription result
   */
  transcribe: async (audioFile, language = 'auto') => {
    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('language', language);
    
    const response = await api.post('/voice/transcribe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Submit voice complaint
   * @param {File} audioFile - Audio file
   * @param {Object} metadata - Additional complaint data
   * @returns {Promise} - Created complaint
   */
  submitVoiceComplaint: async (audioFile, metadata = {}) => {
    const formData = new FormData();
    formData.append('audio', audioFile);
    
    Object.entries(metadata).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
      }
    });
    
    const response = await api.post('/voice/complaint', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

/**
 * WhatsApp API endpoints
 */
export const whatsappApi = {
  /**
   * Get WhatsApp connection status
   * @returns {Promise} - Connection status
   */
  getStatus: async () => {
    const response = await api.get('/whatsapp/status');
    return response.data;
  },

  /**
   * Send location request link
   * @param {string} phoneNumber - Phone number to send link to
   * @returns {Promise} - Response with link info
   */
  sendLocationLink: async (phoneNumber) => {
    const response = await api.post('/whatsapp/send-location-link', { phoneNumber });
    return response.data;
  },
};

/**
 * Hierarchy API endpoints
 */
export const hierarchyApi = {
  /**
   * Find UC by coordinates (geo-fencing)
   * @param {number} longitude - Longitude coordinate
   * @param {number} latitude - Latitude coordinate
   * @returns {Promise} - UC assignment info with confidence
   */
  findUCByLocation: async (longitude, latitude) => {
    const response = await api.post('/hierarchy/find-uc', { longitude, latitude });
    return response.data;
  },

  /**
   * Get all UCs
   * @returns {Promise} - Array of UCs
   */
  getUCs: async () => {
    const response = await api.get('/hierarchy/ucs');
    return response.data;
  },

  /**
   * Get all Towns
   * @returns {Promise} - Array of Towns
   */
  getTowns: async () => {
    const response = await api.get('/hierarchy/towns');
    return response.data;
  },

  /**
   * Get all Cities
   * @returns {Promise} - Array of Cities
   */
  getCities: async () => {
    const response = await api.get('/hierarchy/cities');
    return response.data;
  },

  /**
   * Get UC by ID
   * @param {string} id - UC ID
   * @returns {Promise} - UC details
   */
  getUC: async (id) => {
    const response = await api.get(`/hierarchy/ucs/${id}`);
    return response.data;
  },

  /**
   * Get Town by ID
   * @param {string} id - Town ID
   * @returns {Promise} - Town details
   */
  getTown: async (id) => {
    const response = await api.get(`/hierarchy/towns/${id}`);
    return response.data;
  },

  /**
   * Get City by ID
   * @param {string} id - City ID
   * @returns {Promise} - City details
   */
  getCity: async (id) => {
    const response = await api.get(`/hierarchy/cities/${id}`);
    return response.data;
  },

  /**
   * Get hierarchy tree
   * @param {string} cityId - Optional city ID filter
   * @returns {Promise} - Hierarchy tree
   */
  getHierarchyTree: async (cityId = null) => {
    const url = cityId ? `/hierarchy/tree?cityId=${cityId}` : '/hierarchy/tree';
    const response = await api.get(url);
    return response.data;
  },

  /**
   * Get UCs in a town
   * @param {string} townId - Town ID
   * @returns {Promise} - Array of UCs
   */
  getUCsByTown: async (townId) => {
    const response = await api.get(`/hierarchy/towns/${townId}/ucs`);
    return response.data;
  },

  /**
   * Get Towns in a city
   * @param {string} cityId - City ID
   * @returns {Promise} - Array of Towns
   */
  getTownsByCity: async (cityId) => {
    const response = await api.get(`/hierarchy/cities/${cityId}/towns`);
    return response.data;
  },

  /**
   * Assign mayor to city
   * @param {string} cityId - City ID
   * @param {string} userId - User ID (must be mayor role)
   * @returns {Promise} - Assignment result
   */
  assignMayorToCity: async (cityId, userId) => {
    const response = await api.patch(`/hierarchy/cities/${cityId}/assign-mayor`, { userId });
    return response.data;
  },

  /**
   * Assign town chairman to town
   * @param {string} townId - Town ID
   * @param {string} userId - User ID (must be town_chairman role)
   * @returns {Promise} - Assignment result
   */
  assignTownChairman: async (townId, userId) => {
    const response = await api.patch(`/hierarchy/towns/${townId}/assign-chairman`, { userId });
    return response.data;
  },

  /**
   * Assign UC chairman to UC
   * @param {string} ucId - UC ID
   * @param {string} userId - User ID (must be uc_chairman role)
   * @returns {Promise} - Assignment result
   */
  assignUCChairman: async (ucId, userId) => {
    const response = await api.patch(`/hierarchy/ucs/${ucId}/assign-chairman`, { userId });
    return response.data;
  },
};

/**
 * Analytics API endpoints
 */
export const analyticsApi = {
  /**
   * Get UC-level analytics
   * @param {string} ucId - UC ID
   * @param {number} days - Number of days to analyze (default: 30)
   * @returns {Promise} - UC analytics data
   */
  getUCAnalytics: async (ucId, days = 30) => {
    const response = await api.get(`/analytics/uc/${ucId}?days=${days}`);
    return response.data;
  },

  /**
   * Get Town-level analytics
   * @param {string} townId - Town ID
   * @param {number} days - Number of days to analyze (default: 30)
   * @returns {Promise} - Town analytics data
   */
  getTownAnalytics: async (townId, days = 30) => {
    const response = await api.get(`/analytics/town/${townId}?days=${days}`);
    return response.data;
  },

  /**
   * Get City-level analytics
   * @param {string} cityId - City ID
   * @param {number} days - Number of days to analyze (default: 30)
   * @returns {Promise} - City analytics data
   */
  getCityAnalytics: async (cityId, days = 30) => {
    const response = await api.get(`/analytics/city/${cityId}?days=${days}`);
    return response.data;
  },

  /**
   * Get System-wide analytics (website_admin only)
   * @param {number} days - Number of days to analyze (default: 30)
   * @returns {Promise} - System analytics data
   */
  getSystemAnalytics: async (days = 30) => {
    const response = await api.get(`/analytics/system?days=${days}`);
    return response.data;
  },

  /**
   * Get SLA performance report
   * @returns {Promise} - SLA performance data
   */
  getSLAPerformance: async () => {
    const response = await api.get('/analytics/sla-performance');
    return response.data;
  },
};

/**
 * Invitation API endpoints
 */
export const invitationApi = {
  /**
   * Create a new invitation
   * @param {Object} data - Invitation data { email, role, targetEntityId }
   * @returns {Promise} - Invitation result with token
   */
  createInvitation: async (data) => {
    const response = await api.post('/invitations', data);
    return response.data;
  },

  /**
   * Get all pending invitations
   * @returns {Promise} - Array of pending invitations
   */
  getPendingInvitations: async () => {
    const response = await api.get('/invitations');
    return response.data;
  },

  /**
   * Validate an invitation token
   * @param {string} token - Invitation token
   * @returns {Promise} - Validation result
   */
  validateToken: async (token) => {
    const response = await api.get(`/invitations/validate/${token}`);
    return response.data;
  },

  /**
   * Accept invitation and register
   * @param {Object} data - Registration data with token
   * @returns {Promise} - User registration result
   */
  acceptInvitation: async (data) => {
    const response = await api.post('/invitations/accept', data);
    return response.data;
  },

  /**
   * Revoke an invitation
   * @param {string} id - Invitation ID
   * @returns {Promise} - Revocation result
   */
  revokeInvitation: async (id) => {
    const response = await api.delete(`/invitations/${id}`);
    return response.data;
  },

  /**
   * Resend an invitation
   * @param {string} id - Invitation ID
   * @returns {Promise} - Resend result
   */
  resendInvitation: async (id) => {
    const response = await api.post(`/invitations/${id}/resend`);
    return response.data;
  },

  /**
   * Get invitation statistics (admin only)
   * @returns {Promise} - Invitation stats
   */
  getStats: async () => {
    const response = await api.get('/invitations/stats');
    return response.data;
  },
};

/**
 * Health API
 */
export const healthApi = {
  /**
   * Check API health
   * @returns {Promise} - Health status
   */
  check: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

/**
 * Chat API endpoints
 * Real-time messaging for UC-Citizen and hierarchy communications
 */
export const chatApi = {
  /**
   * Get user's conversations
   * @param {Object} options - Query options (type, status, limit)
   * @returns {Promise} - Array of conversations
   */
  getConversations: async (options = {}) => {
    const params = new URLSearchParams();
    if (options.type) params.append('type', options.type);
    if (options.status) params.append('status', options.status);
    if (options.limit) params.append('limit', options.limit);
    
    const response = await api.get(`/chat/conversations?${params.toString()}`);
    return response.data;
  },

  /**
   * Get specific conversation
   * @param {string} conversationId - Conversation ID
   * @returns {Promise} - Conversation details
   */
  getConversation: async (conversationId) => {
    const response = await api.get(`/chat/conversations/${conversationId}`);
    return response.data;
  },

  /**
   * Start complaint discussion (UC Chairman only)
   * @param {string} complaintId - Complaint ID
   * @returns {Promise} - Created/existing conversation
   */
  startComplaintChat: async (complaintId) => {
    const response = await api.post('/chat/conversations/complaint', { complaintId });
    return response.data;
  },

  /**
   * Start hierarchy chat
   * @param {string} targetUserId - Target user ID
   * @param {string} subject - Conversation subject
   * @returns {Promise} - Created/existing conversation
   */
  startHierarchyChat: async (targetUserId, subject = '') => {
    const response = await api.post('/chat/conversations/hierarchy', { 
      targetUserId, 
      subject 
    });
    return response.data;
  },

  /**
   * Close a conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} reason - Reason for closing
   * @returns {Promise} - Closed conversation
   */
  closeConversation: async (conversationId, reason = '') => {
    const response = await api.post(`/chat/conversations/${conversationId}/close`, { reason });
    return response.data;
  },

  /**
   * Get messages for a conversation
   * @param {string} conversationId - Conversation ID
   * @param {Object} options - Pagination options (before, after, limit)
   * @returns {Promise} - Array of messages
   */
  getMessages: async (conversationId, options = {}) => {
    const params = new URLSearchParams();
    if (options.before) params.append('before', options.before);
    if (options.after) params.append('after', options.after);
    if (options.limit) params.append('limit', options.limit);
    
    const response = await api.get(
      `/chat/conversations/${conversationId}/messages?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Send a message
   * @param {string} conversationId - Conversation ID
   * @param {Object} messageData - Message data (content, type, attachments, replyTo, priority)
   * @returns {Promise} - Sent message
   */
  sendMessage: async (conversationId, messageData) => {
    const response = await api.post(
      `/chat/conversations/${conversationId}/messages`,
      messageData
    );
    return response.data;
  },

  /**
   * Edit a message
   * @param {string} messageId - Message ID
   * @param {string} content - New content
   * @returns {Promise} - Updated message
   */
  editMessage: async (messageId, content) => {
    const response = await api.put(`/chat/messages/${messageId}`, { content });
    return response.data;
  },

  /**
   * Delete a message
   * @param {string} messageId - Message ID
   * @returns {Promise} - Success response
   */
  deleteMessage: async (messageId) => {
    const response = await api.delete(`/chat/messages/${messageId}`);
    return response.data;
  },

  /**
   * Mark conversation as read
   * @param {string} conversationId - Conversation ID
   * @param {string} lastMessageId - Last read message ID (optional)
   * @returns {Promise} - Success response
   */
  markAsRead: async (conversationId, lastMessageId = null) => {
    const response = await api.put(`/chat/conversations/${conversationId}/read`, {
      lastMessageId
    });
    return response.data;
  },

  /**
   * Get total unread count
   * @returns {Promise} - Unread count
   */
  getUnreadCount: async () => {
    const response = await api.get('/chat/unread-count');
    return response.data;
  },

  /**
   * Get available chat targets for hierarchy chats
   * @returns {Promise} - Array of available targets
   */
  getChatTargets: async () => {
    const response = await api.get('/chat/targets');
    return response.data;
  },

  /**
   * Check if user can chat about a complaint
   * @param {string} complaintId - Complaint ID
   * @returns {Promise} - Access info
   */
  checkComplaintAccess: async (complaintId) => {
    const response = await api.get(`/chat/complaint/${complaintId}/access`);
    return response.data;
  },

  /**
   * Get conversation for a complaint (if exists)
   * @param {string} complaintId - Complaint ID
   * @returns {Promise} - Conversation or null
   */
  getComplaintConversation: async (complaintId) => {
    const response = await api.get(`/chat/complaint/${complaintId}/conversation`);
    return response.data;
  },
};

export default api;
