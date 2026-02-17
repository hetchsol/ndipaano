import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL, STORAGE_KEYS } from '../utils/constants';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  requires2FA?: boolean;
}

export interface RegisterPatientDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  consentDataProcessing: boolean;
  consentTerms: boolean;
}

export interface RegisterPractitionerDto extends RegisterPatientDto {
  practitionerType: string;
  hpczNumber: string;
  serviceRadiusKm: number;
  consultationFee: number;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'PATIENT' | 'PRACTITIONER' | 'ADMIN';
  avatarUrl?: string;
  dateOfBirth?: string;
  gender?: string;
  practitionerProfile?: PractitionerProfile;
  patientProfile?: PatientProfile;
}

export interface PractitionerProfile {
  id: string;
  practitionerType: string;
  hpczNumber: string;
  serviceRadiusKm: number;
  consultationFee: number;
  rating: number;
  totalReviews: number;
  isAvailable: boolean;
  specializations: string[];
  latitude?: number;
  longitude?: number;
}

export interface PatientProfile {
  id: string;
  bloodType?: string;
  allergies: string[];
  emergencyContacts: EmergencyContact[];
  chronicConditions: string[];
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface Booking {
  id: string;
  patientId: string;
  practitionerId: string;
  serviceType: string;
  status: string;
  scheduledDate: string;
  address: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  fee: number;
  patient?: User;
  practitioner?: User;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingDto {
  practitionerId: string;
  serviceType: string;
  scheduledDate: string;
  address: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface PractitionerSearchParams {
  query?: string;
  type?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  minRating?: number;
  page?: number;
  limit?: number;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  practitionerId: string;
  bookingId: string;
  diagnosis: string;
  notes: string;
  vitals?: Record<string, string>;
  practitioner?: User;
  createdAt: string;
}

export interface Prescription {
  id: string;
  medicalRecordId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  isDispensed: boolean;
  dispensedAt?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, string>;
  isRead: boolean;
  createdAt: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Navigation callback for 401 handling ────────────────────────────────────

let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(callback: () => void): void {
  onUnauthorized = callback;
}

// ─── Axios Instance ──────────────────────────────────────────────────────────

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // SecureStore not available (e.g., during testing)
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      try {
        await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
      } catch {
        // Ignore SecureStore errors during cleanup
      }
      if (onUnauthorized) {
        onUnauthorized();
      }
    }
    return Promise.reject(error);
  },
);

// ─── Auth API ────────────────────────────────────────────────────────────────

export const authApi = {
  login: (dto: LoginDto) =>
    apiClient.post<LoginResponse>('/auth/login', dto).then((r) => r.data),

  registerPatient: (dto: RegisterPatientDto) =>
    apiClient.post<LoginResponse>('/auth/register/patient', dto).then((r) => r.data),

  registerPractitioner: (dto: RegisterPractitionerDto) =>
    apiClient.post<LoginResponse>('/auth/register/practitioner', dto).then((r) => r.data),

  refresh: (refreshToken: string) =>
    apiClient
      .post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken })
      .then((r) => r.data),

  setup2FA: () =>
    apiClient.post<{ qrCode: string; secret: string }>('/auth/2fa/setup').then((r) => r.data),

  verify2FA: (code: string) =>
    apiClient.post<LoginResponse>('/auth/2fa/verify', { code }).then((r) => r.data),
};

// ─── Bookings API ────────────────────────────────────────────────────────────

export const bookingsApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Booking>>('/bookings', { params }).then((r) => r.data),

  create: (dto: CreateBookingDto) =>
    apiClient.post<Booking>('/bookings', dto).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<Booking>(`/bookings/${id}`).then((r) => r.data),

  accept: (id: string) =>
    apiClient.patch<Booking>(`/bookings/${id}/accept`).then((r) => r.data),

  reject: (id: string, reason?: string) =>
    apiClient.patch<Booking>(`/bookings/${id}/reject`, { reason }).then((r) => r.data),

  cancel: (id: string, reason?: string) =>
    apiClient.patch<Booking>(`/bookings/${id}/cancel`, { reason }).then((r) => r.data),

  complete: (id: string) =>
    apiClient.patch<Booking>(`/bookings/${id}/complete`).then((r) => r.data),

  getUpcoming: () =>
    apiClient.get<Booking[]>('/bookings/upcoming').then((r) => r.data),
};

// ─── Practitioners API ───────────────────────────────────────────────────────

export const practitionersApi = {
  search: (params: PractitionerSearchParams) =>
    apiClient
      .get<PaginatedResponse<User>>('/practitioners/search', { params })
      .then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<User>(`/practitioners/${id}`).then((r) => r.data),

  getProfile: () =>
    apiClient.get<PractitionerProfile>('/practitioners/profile').then((r) => r.data),

  updateProfile: (data: Partial<PractitionerProfile>) =>
    apiClient.patch<PractitionerProfile>('/practitioners/profile', data).then((r) => r.data),

  updateLocation: (latitude: number, longitude: number) =>
    apiClient
      .patch<void>('/practitioners/location', { latitude, longitude })
      .then((r) => r.data),

  toggleAvailability: () =>
    apiClient
      .patch<{ isAvailable: boolean }>('/practitioners/availability/toggle')
      .then((r) => r.data),
};

// ─── Medical Records API ─────────────────────────────────────────────────────

export const medicalRecordsApi = {
  list: (params?: { page?: number; limit?: number }) =>
    apiClient
      .get<PaginatedResponse<MedicalRecord>>('/medical-records', { params })
      .then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<MedicalRecord>(`/medical-records/${id}`).then((r) => r.data),
};

// ─── Prescriptions API ──────────────────────────────────────────────────────

export const prescriptionsApi = {
  list: (params?: { page?: number; limit?: number }) =>
    apiClient
      .get<PaginatedResponse<Prescription>>('/prescriptions', { params })
      .then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<Prescription>(`/prescriptions/${id}`).then((r) => r.data),
};

// ─── Notifications API ──────────────────────────────────────────────────────

export const notificationsApi = {
  list: (params?: { page?: number; limit?: number }) =>
    apiClient
      .get<PaginatedResponse<AppNotification>>('/notifications', { params })
      .then((r) => r.data),

  markRead: (id: string) =>
    apiClient.patch<void>(`/notifications/${id}/read`).then((r) => r.data),

  getUnreadCount: () =>
    apiClient.get<{ count: number }>('/notifications/unread-count').then((r) => r.data),
};

// ─── Users API ───────────────────────────────────────────────────────────────

export const usersApi = {
  getProfile: () =>
    apiClient.get<User>('/users/profile').then((r) => r.data),

  updateProfile: (data: Partial<User>) =>
    apiClient.patch<User>('/users/profile', data).then((r) => r.data),

  updatePatientProfile: (data: Partial<PatientProfile>) =>
    apiClient.patch<PatientProfile>('/users/patient-profile', data).then((r) => r.data),
};

// ─── Payments API ────────────────────────────────────────────────────────────

export const paymentsApi = {
  initiate: (bookingId: string, provider: string) =>
    apiClient
      .post<Payment>('/payments/initiate', { bookingId, provider })
      .then((r) => r.data),

  list: (params?: { page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Payment>>('/payments', { params }).then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<Payment>(`/payments/${id}`).then((r) => r.data),
};

// ─── Emergency API ───────────────────────────────────────────────────────────

export const emergencyApi = {
  triggerPanic: (latitude: number, longitude: number) =>
    apiClient
      .post<{ success: boolean }>('/emergency/panic', { latitude, longitude })
      .then((r) => r.data),

  getContacts: () =>
    apiClient.get<EmergencyContact[]>('/emergency/contacts').then((r) => r.data),

  addContact: (contact: EmergencyContact) =>
    apiClient.post<EmergencyContact>('/emergency/contacts', contact).then((r) => r.data),
};

export default apiClient;
