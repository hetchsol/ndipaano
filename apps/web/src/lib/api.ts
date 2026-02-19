import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

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
      const token = localStorage.getItem('ndipaano_token');
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
        const refreshToken = localStorage.getItem('ndipaano_refresh_token');
        if (refreshToken) {
          try {
            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken,
            });
            const { accessToken } = response.data.data;
            localStorage.setItem('ndipaano_token', accessToken);
            // Update the cookie so middleware stays in sync
            document.cookie = `ndipaano_token=${accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
            if (error.config && error.config.headers) {
              error.config.headers.Authorization = `Bearer ${accessToken}`;
              return api(error.config);
            }
          } catch {
            localStorage.removeItem('ndipaano_token');
            localStorage.removeItem('ndipaano_refresh_token');
            localStorage.removeItem('ndipaano_user');
            document.cookie = 'ndipaano_token=; path=/; max-age=0';
            document.cookie = 'ndipaano_role=; path=/; max-age=0';
            window.location.href = '/login';
          }
        } else {
          localStorage.removeItem('ndipaano_token');
          localStorage.removeItem('ndipaano_user');
          document.cookie = 'ndipaano_token=; path=/; max-age=0';
          document.cookie = 'ndipaano_role=; path=/; max-age=0';
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

  registerPatient: (data: {
    email?: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    dateOfBirth: string;
    gender: string;
    nationality: string;
    nrc?: string;
    consentDataProcessing: boolean;
    consentTerms: boolean;
  }) => api.post('/auth/register/patient', data),

  registerPractitioner: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    practitionerType: string;
    hpczRegistrationNumber: string;
    serviceRadiusKm?: number;
    baseConsultationFee?: number;
    consentDataProcessing: boolean;
    consentTerms: boolean;
  }) => api.post('/auth/register/practitioner', data),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),

  forgotPassword: (identifier: string) =>
    api.post('/auth/password/reset-request', { identifier }),

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
    scheduledAt: string;
    serviceType: string;
    address?: string;
    notes?: string;
  }) => api.post('/bookings', data),

  cancel: (id: string, reason?: string) =>
    api.patch(`/bookings/${id}/cancel`, { reason }),

  updateStatus: (id: string, status: string) =>
    api.patch(`/bookings/${id}/status`, { status }),

  addNotes: (id: string, notes: string) =>
    api.post(`/bookings/${id}/notes`, { notes }),
};

// --- Diagnostic Tests API ---
export const diagnosticTestsAPI = {
  search: (params?: {
    category?: string;
    practitionerType?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => api.get('/diagnostic-tests', { params }),

  getCategories: () => api.get('/diagnostic-tests/categories'),

  getByPractitionerType: (type: string) =>
    api.get(`/diagnostic-tests/by-practitioner-type/${type}`),
};

// --- Practitioners API ---
export const practitionersAPI = {
  search: (params?: {
    practitionerType?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
    minRating?: number;
    maxFee?: number;
    isAvailable?: boolean;
    offersHomeVisits?: boolean;
    offersClinicVisits?: boolean;
    diagnosticTestId?: string;
    page?: number;
    limit?: number;
  }) => api.get('/practitioners/search', { params }),

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

  getOperatingCenters: () =>
    api.get('/practitioners/operating-centers'),

  createOperatingCenter: (data: { name: string; address: string; city: string; phone?: string }) =>
    api.post('/practitioners/operating-centers', data),

  updateOperatingCenter: (id: string, data: { name?: string; address?: string; city?: string; phone?: string }) =>
    api.put(`/practitioners/operating-centers/${id}`, data),

  deleteOperatingCenter: (id: string) =>
    api.delete(`/practitioners/operating-centers/${id}`),
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

// --- Scheduling API ---
export const schedulingAPI = {
  // Practitioner availability
  getMyAvailability: () => api.get('/scheduling/availability'),

  createAvailability: (data: {
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    isActive?: boolean;
  }) => api.post('/scheduling/availability', data),

  updateAvailability: (id: string, data: {
    startTime?: string;
    endTime?: string;
    isActive?: boolean;
  }) => api.put(`/scheduling/availability/${id}`, data),

  deleteAvailability: (id: string) =>
    api.delete(`/scheduling/availability/${id}`),

  setBulkAvailability: (slots: Array<{
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    isActive?: boolean;
  }>) => api.post('/scheduling/availability/bulk', { slots }),

  // Blackouts
  getBlackouts: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/scheduling/blackouts', { params }),

  createBlackout: (data: {
    date: string;
    startTime?: string;
    endTime?: string;
    reason?: string;
  }) => api.post('/scheduling/blackouts', data),

  deleteBlackout: (id: string) =>
    api.delete(`/scheduling/blackouts/${id}`),

  // Public slot queries
  getAvailableSlots: (practitionerId: string, startDate: string, endDate: string) =>
    api.get(`/scheduling/practitioners/${practitionerId}/slots`, {
      params: { startDate, endDate },
    }),

  getCalendarView: (practitionerId: string, year: number, month: number) =>
    api.get(`/scheduling/practitioners/${practitionerId}/calendar`, {
      params: { year, month },
    }),

  // Reschedule
  rescheduleBooking: (bookingId: string, data: {
    scheduledAt: string;
    reason?: string;
  }) => api.patch(`/scheduling/bookings/${bookingId}/reschedule`, data),

  // Settings
  getSettings: () => api.get('/scheduling/settings'),

  updateSettings: (data: {
    slotDurationMinutes?: number;
    bufferMinutes?: number;
  }) => api.patch('/scheduling/settings', data),
};

// --- Chat API ---
export const chatAPI = {
  listConversations: (params?: { page?: number; limit?: number }) =>
    api.get('/chat/conversations', { params }),

  getConversation: (id: string) =>
    api.get(`/chat/conversations/${id}`),

  getMessages: (conversationId: string, params?: { cursor?: string; limit?: number }) =>
    api.get(`/chat/conversations/${conversationId}/messages`, { params }),

  sendMessage: (conversationId: string, data: {
    type?: string;
    content: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
  }) => api.post(`/chat/conversations/${conversationId}/messages`, data),

  markAsRead: (conversationId: string) =>
    api.patch(`/chat/conversations/${conversationId}/read`),

  getUnreadCount: () => api.get('/chat/unread-count'),

  getUploadUrl: (data: { fileName: string; mimeType: string; fileSize: number }) =>
    api.post('/chat/upload-url', data),
};

// --- Telehealth API ---
export const telehealthAPI = {
  createSession: (data: { bookingId: string }) =>
    api.post('/telehealth/sessions', data),
  getSession: (id: string) =>
    api.get(`/telehealth/sessions/${id}`),
  startSession: (id: string) =>
    api.patch(`/telehealth/sessions/${id}/start`),
  endSession: (id: string, data?: { practitionerNotes?: string }) =>
    api.patch(`/telehealth/sessions/${id}/end`, data),
  recordConsent: (id: string, data: { recordingConsent: boolean }) =>
    api.patch(`/telehealth/sessions/${id}/consent`, data),
  getMySessions: (params?: { page?: number; limit?: number }) =>
    api.get('/telehealth/my-sessions', { params }),
};

// --- Lab Results API ---
export const labResultsAPI = {
  createOrder: (data: { patientId: string; diagnosticTestId: string; bookingId?: string; priority?: string; clinicalNotes?: string }) =>
    api.post('/lab-results/orders', data),
  listOrders: (params?: { page?: number; limit?: number; status?: string; patientId?: string }) =>
    api.get('/lab-results/orders', { params }),
  getOrder: (id: string) =>
    api.get(`/lab-results/orders/${id}`),
  updateOrderStatus: (id: string, data: { status: string; cancelledReason?: string }) =>
    api.patch(`/lab-results/orders/${id}/status`, data),
  createResult: (data: { labOrderId: string; resultValue: string; resultUnit?: string; referenceRangeMin?: string; referenceRangeMax?: string; referenceRangeText?: string; interpretation: string; practitionerNotes?: string }) =>
    api.post('/lab-results/results', data),
  getResult: (id: string) =>
    api.get(`/lab-results/results/${id}`),
  getPatientOrders: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get('/lab-results/patient/orders', { params }),
  getPatientResults: (params?: { page?: number; limit?: number }) =>
    api.get('/lab-results/patient/results', { params }),
  getResultTrend: (testId: string) =>
    api.get(`/lab-results/patient/trends/${testId}`),
};

export default api;
