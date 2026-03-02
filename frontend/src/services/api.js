// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Helper untuk API calls dengan authentication
const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'API Error');
  }

  return data;
};

// Auth Services
export const authService = {
  register: (name, email, password, role = 'MARKETING') =>
    apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    }),

  login: (email, password) =>
    apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
};

// Campaign Services
export const campaignService = {
  getAll: (page = 1, limit = 10) =>
    apiCall(`/campaigns?page=${page}&limit=${limit}`, { method: 'GET' }),

  getById: (id) =>
    apiCall(`/campaigns/${id}`, { method: 'GET' }),

  create: (name, templateName, targetLeadStatus, parameters = []) =>
    apiCall('/campaigns', {
      method: 'POST',
      body: JSON.stringify({ name, templateName, targetLeadStatus, parameters }),
    }),

  update: (id, data) =>
    apiCall(`/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    apiCall(`/campaigns/${id}`, { method: 'DELETE' }),

  getStats: (id) =>
    apiCall(`/campaigns/${id}/stats`, { method: 'GET' }),
};

// Lead Services
export const leadService = {
  getAll: (page = 1, limit = 10) =>
    apiCall(`/leads?page=${page}&limit=${limit}`, { method: 'GET' }),

  getById: (id) =>
    apiCall(`/leads/${id}`, { method: 'GET' }),

  create: (full_name, phone_number, email, city) =>
    apiCall('/leads', {
      method: 'POST',
      body: JSON.stringify({ full_name, phone_number, email, city }),
    }),

  update: (id, data) =>
    apiCall(`/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    apiCall(`/leads/${id}`, { method: 'DELETE' }),
};

// Template Services
export const templateService = {
  getAll: () =>
    apiCall('/templates', { method: 'GET' }),

  getByName: (name) =>
    apiCall(`/templates/${name}`, { method: 'GET' }),

  create: (name, body, parameters = []) =>
    apiCall('/templates', {
      method: 'POST',
      body: JSON.stringify({ name, body, parameters }),
    }),

  delete: (name) =>
    apiCall(`/templates/${name}`, { method: 'DELETE' }),
};

// Automation Services
export const automationService = {
  getAll: () =>
    apiCall('/automations', { method: 'GET' }),

  getById: (id) =>
    apiCall(`/automations/${id}`, { method: 'GET' }),

  create: (name, trigger, actions) =>
    apiCall('/automations', {
      method: 'POST',
      body: JSON.stringify({ name, trigger, actions }),
    }),

  update: (id, data) =>
    apiCall(`/automations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    apiCall(`/automations/${id}`, { method: 'DELETE' }),
};
