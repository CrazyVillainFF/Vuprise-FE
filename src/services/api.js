import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    console.log(`[VUPRISE API] ${config.method?.toUpperCase()} -> ${config.baseURL}${config.url}`);
    const token = localStorage.getItem('nexora_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Format errors and handle expired auth
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If unauthorized / token expired and not on public pages
    if (error.response && error.response.status === 401) {
      const isAuthRoute = window.location.pathname.includes('/signin') || window.location.pathname.includes('/signup');
      if (!isAuthRoute && localStorage.getItem('nexora_token')) {
        console.warn('Session expired or unauthorized. Clearing stored auth.');
        localStorage.removeItem('nexora_token');
        localStorage.removeItem('nexora_user');
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }

    console.error('[VUPRISE API Error]', error.config?.url, error.response?.status, error.message);
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected network error occurred. Please try again.';

    const normalizedError = new Error(message);
    normalizedError.code = error.code;
    normalizedError.response = error.response;
    return Promise.reject(normalizedError);
  }
);

// ================= AUTH APIs =================
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updatePassword: (data) => api.put('/auth/updatepassword', data),
  requestPasswordReset: (email) => api.post('/auth/password-reset/request', { email }),
  verifyPasswordResetCode: (email, code) => api.post('/auth/password-reset/verify', { email, code }),
  completePasswordReset: (data) => api.post('/auth/password-reset/complete', data),
};

// ================= USER APIs =================
export const userAPI = {
  getUsers: (params) => api.get('/users', { params }),
  getSuggested: () => api.get('/users/suggested'),
  getUserById: (id) => api.get(`/users/${id}`),
  updateProfile: (data) => api.put('/users/profile', data),
  uploadAvatar: (formData) =>
    api.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadCover: (formData) =>
    api.post('/users/cover', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  search: (query) => api.get('/users/search', { params: { q: query } }),
  updateSettings: (data) => api.put('/users/settings', data),
};

// ================= POST APIs =================
export const postAPI = {
  createPost: (formDataOrData, config = {}) => {
    const isFormData = formDataOrData instanceof FormData;
    return api.post('/posts', formDataOrData, {
      ...config,
      headers: { ...(config.headers || {}), ...(isFormData ? { 'Content-Type': 'multipart/form-data' } : {}) },
    });
  },
  signVideoUpload: (data, config = {}) => api.post('/posts/video-upload/sign', data, config),
  completeVideoUpload: (data, config = {}) => api.post('/posts/video-upload/complete', data, config),
  getFeed: (params) => api.get('/posts/feed', { params }),
  getUserPosts: (userId, params) => api.get(`/posts/user/${userId}`, { params }),
  getPostById: (id) => api.get(`/posts/${id}`),
  updatePost: (id, formDataOrData, config = {}) => {
    const isFormData = formDataOrData instanceof FormData;
    return api.put(`/posts/${id}`, formDataOrData, {
      ...config,
      headers: { ...(config.headers || {}), ...(isFormData ? { 'Content-Type': 'multipart/form-data' } : {}) },
    });
  },
  deletePost: (id) => api.delete(`/posts/${id}`),
  toggleLike: (id) => api.post(`/posts/${id}/like`),
};

// ================= COMMENT APIs =================
export const commentAPI = {
  addComment: (postId, data) => api.post(`/posts/${postId}/comments`, data),
  getPostComments: (postId) => api.get(`/posts/${postId}/comments`),
  updateComment: (commentId, data) => api.put(`/comments/${commentId}`, data),
  deleteComment: (commentId) => api.delete(`/comments/${commentId}`),
};

// ================= CONNECTION APIs =================
export const connectionAPI = {
  sendRequest: (userId) => api.post(`/connections/${userId}`),
  acceptRequest: (requestIdOrUserId) => api.put(`/connections/${requestIdOrUserId}/accept`),
  rejectOrRemove: (requestIdOrUserId) => api.delete(`/connections/${requestIdOrUserId}`),
  getConnections: () => api.get('/connections'),
};

export const groupAPI = {
  list: () => api.get('/groups'),
  get: (id) => api.get(`/groups/${id}`),
  create: (data) => api.post('/groups', data, { headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {} }),
  update: (id, data) => api.patch(`/groups/${id}`, data, { headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {} }),
  invite: (id, userId) => api.post(`/groups/${id}/invitations/${userId}`),
  respond: (id, action) => api.post(`/groups/${id}/invitations/${action}`),
  setRole: (id, userId, role) => api.patch(`/groups/${id}/members/${userId}/role`, { role }),
  remove: (id, userId) => api.delete(`/groups/${id}/members/${userId}`),
  delete: (id) => api.delete(`/groups/${id}`),
  getMessages: (id, params = {}) => api.get(`/groups/${id}/messages`, { params }),
  sendMessage: (id, data) => api.post(`/groups/${id}/messages`, data, { headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {} }),
  updateMessage: (id, messageId, text) => api.put(`/groups/${id}/messages/${messageId}`, { text }),
  deleteMessage: (id, messageId, scope) => api.delete(`/groups/${id}/messages/${messageId}`, { params: { scope } }),
};

// ================= NOTIFICATION APIs =================
export const notificationAPI = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
};

export const messageAPI = {
  getContacts: () => api.get('/messages/contacts'),
  getOwnKey: () => api.get('/messages/keys/me'),
  saveOwnKey: (publicKey, signingPublicKey) => api.put('/messages/keys/me', { publicKey, signingPublicKey }),
  getOwnKeyBackups: () => api.get('/messages/keys/backups'),
  saveOwnKeyBackup: (backup) => api.post('/messages/keys/backups', backup),
  getConversations: () => api.get('/messages/conversations'),
  openConversation: (userId) => api.post(`/messages/conversations/${userId}`),
  deleteConversation: (conversationId) => api.delete(`/messages/conversations/${conversationId}`),
  updateConversationName: (conversationId, name) => api.patch(`/messages/conversations/${conversationId}`, { name }),
  getMessages: (conversationId) => api.get(`/messages/conversations/${conversationId}/messages`),
  deleteMessage: (conversationId, messageId, scope) => api.delete(`/messages/conversations/${conversationId}/messages/${messageId}`, { params: { scope } }),
  updateMessage: (conversationId, messageId, text) => api.put(`/messages/conversations/${conversationId}/messages/${messageId}`, { text }),
  sendMessage: (conversationId, payload) => api.post(`/messages/conversations/${conversationId}/messages`, payload, { headers: payload instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {} }),
  syncLegacyMessages: (conversationId, messages) => api.post(`/messages/conversations/${conversationId}/messages/sync-legacy`, { messages }),
};

export default api;
