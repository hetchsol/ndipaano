import { Platform } from 'react-native';

// API Configuration
export const API_URL = Platform.select({
  android: 'http://10.0.2.2:4000/api',
  ios: 'http://localhost:4000/api',
  default: 'http://localhost:4000/api',
});

export const SOCKET_URL = Platform.select({
  android: 'http://10.0.2.2:4000',
  ios: 'http://localhost:4000',
  default: 'http://localhost:4000',
});

// Secure Store Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'ndipaano_access_token',
  REFRESH_TOKEN: 'ndipaano_refresh_token',
  USER_DATA: 'ndipaano_user_data',
} as const;

// Colors - matching web theme
export const COLORS = {
  primary: '#166534',
  primaryLight: '#22C55E',
  primaryDark: '#14532D',
  secondary: '#B45309',
  secondaryLight: '#F59E0B',
  secondaryDark: '#92400E',
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  red: '#DC2626',
  redLight: '#FEE2E2',
  green: '#16A34A',
  greenLight: '#DCFCE7',
  blue: '#2563EB',
  blueLight: '#DBEAFE',
  yellow: '#CA8A04',
  yellowLight: '#FEF9C3',
  orange: '#EA580C',
  orangeLight: '#FED7AA',
  background: '#F0FDF4',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  danger: '#DC2626',
  success: '#16A34A',
  warning: '#F59E0B',
  info: '#2563EB',
} as const;

// Screen Names
export const SCREENS = {
  LOGIN: 'Login',
  REGISTER: 'Register',
  HOME: 'Home',
  SEARCH: 'Search',
  BOOKING: 'Booking',
  BOOKING_DETAIL: 'BookingDetail',
  BOOKINGS_LIST: 'BookingsList',
  MEDICAL_RECORDS: 'MedicalRecords',
  PRESCRIPTIONS: 'Prescriptions',
  PROFILE: 'Profile',
  NOTIFICATIONS: 'Notifications',
  EMERGENCY: 'Emergency',
  EARNINGS: 'Earnings',
} as const;

// Booking Status
export const BOOKING_STATUS = {
  REQUESTED: 'REQUESTED',
  ACCEPTED: 'ACCEPTED',
  EN_ROUTE: 'EN_ROUTE',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED',
} as const;

// Practitioner Types
export const PRACTITIONER_TYPES = [
  { label: 'Doctor', value: 'DOCTOR' },
  { label: 'Nurse', value: 'NURSE' },
  { label: 'Clinical Officer', value: 'CLINICAL_OFFICER' },
  { label: 'Physiotherapist', value: 'PHYSIOTHERAPIST' },
  { label: 'Pharmacist', value: 'PHARMACIST' },
  { label: 'Lab Technician', value: 'LAB_TECHNICIAN' },
  { label: 'Midwife', value: 'MIDWIFE' },
] as const;

// Service Types
export const SERVICE_TYPES = [
  { label: 'General Consultation', value: 'GENERAL_CONSULTATION' },
  { label: 'Nursing Care', value: 'NURSING_CARE' },
  { label: 'Physiotherapy', value: 'PHYSIOTHERAPY' },
  { label: 'Lab Tests', value: 'LAB_TESTS' },
  { label: 'Medication Delivery', value: 'MEDICATION_DELIVERY' },
  { label: 'Wound Care', value: 'WOUND_CARE' },
  { label: 'Post-Operative Care', value: 'POST_OPERATIVE_CARE' },
  { label: 'Maternal Care', value: 'MATERNAL_CARE' },
] as const;

// Zambian Emergency Numbers
export const EMERGENCY_NUMBERS = {
  POLICE: '999',
  AMBULANCE: '991',
  FIRE: '993',
} as const;
