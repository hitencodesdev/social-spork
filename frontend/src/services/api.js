import axios from 'axios';

const API_BASE = '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach Authorization Bearer token automatically if logged in
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('spork_auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Authentication & Users
  login: async (email, password) => {
    const res = await apiClient.post('/auth/login', { email, password });
    return res.data;
  },

  getMe: async () => {
    const res = await apiClient.get('/auth/me');
    return res.data;
  },

  getUsers: async () => {
    const res = await apiClient.get('/auth/users');
    return res.data;
  },

  createUser: async (userData) => {
    const res = await apiClient.post('/auth/users', userData);
    return res.data;
  },

  updateUser: async (id, userData) => {
    const res = await apiClient.put(`/auth/users/${id}`, userData);
    return res.data;
  },

  deleteUser: async (id) => {
    const res = await apiClient.delete(`/auth/users/${id}`);
    return res.data;
  },

  // System Health
  getHealth: async () => {
    const res = await axios.get('/api/health');
    return res.data;
  },

  // Analytics
  getAnalyticsOverview: async () => {
    const res = await apiClient.get('/analytics/overview');
    return res.data;
  },

  // Complaints
  getComplaints: async (params = {}) => {
    const res = await apiClient.get('/complaints', { params });
    return res.data;
  },

  getComplaintById: async (id) => {
    const res = await apiClient.get(`/complaints/${id}`);
    return res.data;
  },

  retryComplaint: async (id) => {
    const res = await apiClient.post(`/complaints/${id}/retry`);
    return res.data;
  },

  ingestComplaint: async (data) => {
    const res = await apiClient.post('/complaints/ingest', data, {
      headers: {
        'X-API-Key': 'spork_secret_ingest_key_2026'
      }
    });
    return res.data;
  },

  // Restaurants
  getRestaurants: async (params = {}) => {
    const res = await apiClient.get('/restaurants', { params });
    return res.data;
  },

  getRestaurantById: async (id) => {
    const res = await apiClient.get(`/restaurants/${id}`);
    return res.data;
  },

  createRestaurant: async (data) => {
    const res = await apiClient.post('/restaurants', data);
    return res.data;
  },

  updateRestaurant: async (id, data) => {
    const res = await apiClient.put(`/restaurants/${id}`, data);
    return res.data;
  },

  getSampleTemplateUrl: () => {
    return `${API_BASE}/restaurants/sample-template`;
  },

  // Sync
  uploadExcelSync: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/sync/excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
  },

  getSyncHistory: async () => {
    const res = await apiClient.get('/sync/history');
    return res.data;
  },

  // WhatsApp Sender Settings
  getWhatsAppSettings: async () => {
    const res = await apiClient.get('/settings/whatsapp');
    return res.data;
  },

  updateWhatsAppSettings: async (data) => {
    const res = await apiClient.post('/settings/whatsapp', data);
    return res.data;
  },

  testSendWhatsApp: async (testPhone) => {
    const res = await apiClient.post('/settings/whatsapp/test-send', { testPhone });
    return res.data;
  }
};

export default api;
