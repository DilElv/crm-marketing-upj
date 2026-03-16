// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Helper untuk API calls dengan authentication
const apiCall = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };

  const isFormData = options.body instanceof FormData;
  if (!isFormData) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  // For auth endpoints, don't redirect on 401 (it's expected for invalid credentials)
  if (response.status === 401 && !endpoint.includes('/auth/')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

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

  create: (nameOrPayload, templateName, targetLeadStatus, parameters = []) => {
    const payload = typeof nameOrPayload === 'object' && nameOrPayload !== null
      ? nameOrPayload
      : { name: nameOrPayload, templateName, targetLeadStatus, parameters };

    return apiCall('/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update: (id, data) =>
    apiCall(`/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    apiCall(`/campaigns/${id}`, { method: 'DELETE' }),

  getStats: (id) =>
    apiCall(`/campaigns/${id}/stats`, { method: 'GET' }),

  previewContacts: (id) =>
    apiCall(`/campaigns/${id}/preview-contacts`, { method: 'GET' }),

  updateLeadSelection: (id, leadIds) =>
    apiCall(`/campaigns/${id}/leads`, {
      method: 'PUT',
      body: JSON.stringify({ leadIds }),
    }),

  importLeads: (id, file, mapping = null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (mapping) {
      formData.append('mapping', JSON.stringify(mapping));
    }

    return apiCall(`/campaigns/${id}/import-leads`, {
      method: 'POST',
      body: formData,
    });
  },

  downloadImportTemplate: async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/campaigns/import-template`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      let message = 'Failed to download campaign import template';
      try {
        const data = await response.json();
        message = data.message || message;
      } catch (err) {
        // Ignore non-JSON response parsing errors.
      }
      throw new Error(message);
    }

    return response.blob();
  },
};

// Lead Services
export const leadService = {
  getAll: (page = 1, limit = 10, filters = {}) => {
    const searchParams = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        searchParams.append(key, String(value));
      }
    });

    return apiCall(`/leads?${searchParams.toString()}`, { method: 'GET' });
  },

  getById: (id) =>
    apiCall(`/leads/${id}`, { method: 'GET' }),

  getHistory: (id) =>
    apiCall(`/leads/${id}/history`, { method: 'GET' }),

  create: (data) =>
    apiCall('/leads', {
      method: 'POST',
      body: JSON.stringify(data),
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

export const dashboardService = {
  getOverview: () =>
    apiCall('/dashboard/overview', { method: 'GET' }),
};

export const blastService = {
  previewTargets: (campaignId) =>
    apiCall(`/blast/${campaignId}/preview`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  start: (campaignId, payload = {}) =>
    apiCall(`/blast/${campaignId}/start`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  retryFailed: (campaignId, payload = {}) =>
    apiCall(`/blast/${campaignId}/retry-failed`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getStatus: (campaignId) =>
    apiCall(`/blast/${campaignId}/status`, { method: 'GET' }),
};

export const reportService = {
  getCampaignResult: (campaignId) =>
    apiCall(`/reports/campaigns/${campaignId}/result`, { method: 'GET' }),

  getCsvExportUrl: (campaignId) =>
    `${API_BASE_URL}/reports/campaigns/${campaignId}/export/csv`,

  getPdfExportUrl: (campaignId) =>
    `${API_BASE_URL}/reports/campaigns/${campaignId}/export/pdf`,
};

export const importService = {
  downloadTemplate: async () => {
    const response = await fetch(`${API_BASE_URL}/import/template`);
    if (!response.ok) throw new Error('Failed to download template');
    return response.blob();
  },

  previewCsv: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiCall('/import/csv/preview', {
      method: 'POST',
      body: formData,
    });
  },

  commitPreview: (previewId) =>
    apiCall('/import/csv/commit', {
      method: 'POST',
      body: JSON.stringify({ previewId }),
    }),

  importDirect: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiCall('/import/csv', {
      method: 'POST',
      body: formData,
    });
  },
};
