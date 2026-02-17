import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - attach JWT token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('ndiipano_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const refreshToken = localStorage.getItem('ndiipano_refresh_token');
        if (refreshToken) {
          try {
            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken,
            });
            const { token } = response.data.data;
            localStorage.setItem('ndiipano_token', token);
            if (error.config && error.config.headers) {
              error.config.headers.Authorization = `Bearer ${token}`;
              return api(error.config);
            }
          } catch {
            localStorage.removeItem('ndiipano_token');
            localStorage.removeItem('ndiipano_refresh_token');
            localStorage.removeItem('ndiipano_user');
            window.location.href = '/login';
          }
        } else {
          localStorage.removeItem('ndiipano_token');
          localStorage.removeItem('ndiipano_user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// --- Auth API ---
export const authAPI = {
  login: (data: { email: string; password: string; twoFactorCode?: string }) =>
    api.post('/auth/login', data),

  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: 'patient' | 'practitioner';
    practitionerType?: string;
    licenseNumber?: string;
  }) => api.post('/auth/register', data),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (data: { token: string; password: string }) =>
    api.post('/auth/reset-password', data),

  verifyEmail: (token: string) =>
    api.post('/auth/verify-email', { token }),

  enable2FA: () => api.post('/auth/2fa/enable'),

  verify2FA: (code: string) => api.post('/auth/2fa/verify', { code }),
};

// --- Bookings API ---
export const bookingsAPI = {
  list: (params?: {
    status?: string;
    page?: number;
    limit?: number;
    role?: string;
  }) => api.get('/bookings', { params }),

  getById: (id: string) => api.get(`/bookings/${id}`),

  create: (data: {
    practitionerId: string;
    dateTime: string;
    type: 'home_visit' | 'virtual';
    address?: string;
    notes?: string;
    symptoms?: string[];
  }) => api.post('/bookings', data),

  cancel: (id: string, reason?: string) =>
    api.patch(`/bookings/${id}/cancel`, { reason }),

  updateStatus: (id: string, status: string) =>
    api.patch(`/bookings/${id}/status`, { status }),

  addNotes: (id: string, notes: string) =>
    api.post(`/bookings/${id}/notes`, { notes }),
};

// --- Practitioners API ---
export const practitionersAPI = {
  search: (params?: {
    type?: string;
    location?: string;
    rating?: number;
    minFee?: number;
    maxFee?: number;
    available?: boolean;
    page?: number;
    limit?: number;
    query?: string;
  }) => api.get('/practitioners', { params }),

  getById: (id: string) => api.get(`/practitioners/${id}`),

  getAvailability: (id: string, date: string) =>
    api.get(`/practitioners/${id}/availability`, { params: { date } }),

  getReviews: (id: string, params?: { page?: number; limit?: number }) =>
    api.get(`/practitioners/${id}/reviews`, { params }),

  updateProfile: (data: FormData) =>
    api.patch('/practitioners/profile', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  uploadDocument: (data: FormData) =>
    api.post('/practitioners/documents', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// --- Medical Records API ---
export const medicalRecordsAPI = {
  list: (params?: { page?: number; limit?: number; type?: string }) =>
    api.get('/medical-records', { params }),

  getById: (id: string) => api.get(`/medical-records/${id}`),

  download: (id: string) =>
    api.get(`/medical-records/${id}/download`, { responseType: 'blob' }),

  share: (id: string, data: { practitionerId: string; expiresAt?: string }) =>
    api.post(`/medical-records/${id}/share`, data),

  revokeAccess: (id: string, practitionerId: string) =>
    api.delete(`/medical-records/${id}/share/${practitionerId}`),
};

// --- Prescriptions API ---
export const prescriptionsAPI = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/prescriptions', { params }),

  getById: (id: string) => api.get(`/prescriptions/${id}`),

  requestRefill: (id: string) => api.post(`/prescriptions/${id}/refill`),
};

// --- Notifications API ---
export const notificationsAPI = {
  list: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    api.get('/notifications', { params }),

  markRead: (id: string) => api.patch(`/notifications/${id}/read`),

  markAllRead: () => api.patch('/notifications/read-all'),

  getUnreadCount: () => api.get('/notifications/unread-count'),
};

// --- Users API ---
export const usersAPI = {
  getProfile: () => api.get('/users/profile'),

  updateProfile: (data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    address?: string;
    emergencyContact?: { name: string; phone: string; relationship: string };
  }) => api.patch('/users/profile', data),

  updateAvatar: (data: FormData) =>
    api.patch('/users/avatar', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getConsents: () => api.get('/users/consents'),

  updateConsent: (data: { type: string; granted: boolean }) =>
    api.post('/users/consents', data),

  requestDataExport: () => api.post('/users/data-export'),

  requestDataDeletion: () => api.post('/users/data-deletion'),
};

// --- Admin API ---
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),

  getUsers: (params?: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
    search?: string;
  }) => api.get('/admin/users', { params }),

  getUserById: (id: string) => api.get(`/admin/users/${id}`),

  updateUserStatus: (id: string, status: string) =>
    api.patch(`/admin/users/${id}/status`, { status }),

  getVerifications: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/admin/verifications', { params }),

  reviewVerification: (id: string, data: { status: 'approved' | 'rejected'; notes?: string }) =>
    api.patch(`/admin/verifications/${id}`, data),

  getAuditLogs: (params?: { page?: number; limit?: number; action?: string }) =>
    api.get('/admin/audit-logs', { params }),

  getDataRequests: (params?: { page?: number; limit?: number; type?: string }) =>
    api.get('/admin/data-requests', { params }),

  processDataRequest: (id: string, data: { action: 'approve' | 'reject' }) =>
    api.patch(`/admin/data-requests/${id}`, data),

  getPharmacies: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/admin/pharmacies', { params }),

  createPharmacy: (data: { name: string; address: string; phone: string; email: string }) =>
    api.post('/admin/pharmacies', data),

  updatePharmacy: (id: string, data: { name?: string; address?: string; phone?: string; status?: string }) =>
    api.patch(`/admin/pharmacies/${id}`, data),
};

// --- Payments API ---
export const paymentsAPI = {
  initiate: (data: {
    bookingId: string;
    amount: number;
    method: 'mobile_money' | 'card' | 'bank_transfer';
    provider?: string;
    phone?: string;
  }) => api.post('/payments/initiate', data),

  list: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/payments', { params }),

  getById: (id: string) => api.get(`/payments/${id}`),

  getEarnings: (params?: { period?: string; startDate?: string; endDate?: string }) =>
    api.get('/payments/earnings', { params }),

  requestPayout: (data: { amount: number; method: string; accountDetails: Record<string, string> }) =>
    api.post('/payments/payout', data),
};

export default api;
