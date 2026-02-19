import {
  UserRole,
  PractitionerType,
  BookingStatus,
  PaymentStatus,
  PaymentMethod,
  ServiceType,
  ConsentType,
  Gender,
  BloodType,
  InsuranceProvider,
  MessageType,
  DayOfWeek,
} from './enums';

// ─── Authentication ──────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterPatientRequest {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  consentDataProcessing: boolean;
  consentTerms: boolean;
}

export interface RegisterPractitionerRequest extends RegisterPatientRequest {
  practitionerType: PractitionerType;
  hpczRegistrationNumber: string;
  serviceRadiusKm: number;
  baseConsultationFee: number;
}

// ─── Bookings ────────────────────────────────────────────────────────────────

export interface BookingRequest {
  practitionerId: string;
  serviceType: ServiceType;
  scheduledAt: string;
  address: string;
  lat: number;
  lng: number;
  notes?: string;
}

export interface BookingResponse {
  id: string;
  patientId: string;
  practitionerId: string;
  serviceType: ServiceType;
  status: BookingStatus;
  scheduledAt: string;
  address: string;
  lat: number;
  lng: number;
  notes?: string;
  estimatedFee: number;
  actualFee?: number;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

// ─── Practitioner Search ─────────────────────────────────────────────────────

export interface PractitionerSearchQuery {
  type?: PractitionerType;
  lat: number;
  lng: number;
  radius?: number;
  minRating?: number;
  maxFee?: number;
  language?: string;
  gender?: Gender;
  availability?: string;
}

// ─── Payments ────────────────────────────────────────────────────────────────

export interface PaymentRequest {
  bookingId: string;
  amount: number;
  method: PaymentMethod;
  phone?: string;
  insuranceProvider?: InsuranceProvider;
  insurancePolicyNumber?: string;
}

export interface PaymentWebhookPayload {
  transactionId: string;
  externalReference: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  method: PaymentMethod;
  phone?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ─── Generic API Responses ───────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// ─── User Profiles ───────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  gender: Gender;
  dateOfBirth: string;
  avatarUrl?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PractitionerProfile extends UserProfile {
  practitionerType: PractitionerType;
  hpczRegistrationNumber: string;
  isHpczVerified: boolean;
  bio?: string;
  languages: string[];
  specializations: string[];
  serviceRadiusKm: number;
  baseConsultationFee: number;
  averageRating: number;
  totalReviews: number;
  totalBookings: number;
  currentLat?: number;
  currentLng?: number;
  isAvailable: boolean;
}

export interface PatientProfile extends UserProfile {
  bloodType?: BloodType;
  allergies: string[];
  chronicConditions: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  insuranceProvider?: InsuranceProvider;
  insurancePolicyNumber?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

// ─── Medical Records ─────────────────────────────────────────────────────────

export interface MedicalRecord {
  id: string;
  patientId: string;
  practitionerId: string;
  bookingId: string;
  diagnosis: string;
  symptoms: string[];
  notes: string;
  vitalSigns?: {
    bloodPressureSystolic?: number;
    bloodPressureDiastolic?: number;
    heartRate?: number;
    temperature?: number;
    oxygenSaturation?: number;
    weight?: number;
    height?: number;
  };
  prescriptions: Prescription[];
  followUpDate?: string;
  isConfidential: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Prescription {
  id: string;
  medicalRecordId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions?: string;
  isControlledSubstance: boolean;
  zamraSchedule?: string;
  createdAt: string;
}

// ─── Consent & Audit ─────────────────────────────────────────────────────────

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  version: string;
  ipAddress: string;
  userAgent: string;
  grantedAt: string;
  revokedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

// ─── Chat & Messaging ──────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  bookingId: string;
  patientId: string;
  practitionerId: string;
  isActive: boolean;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: ChatMessage;
  unreadCount?: number;
  otherParty?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  isEncrypted: boolean;
  readAt?: string;
  deletedAt?: string;
  createdAt: string;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

// ─── Scheduling ─────────────────────────────────────────────────────────────

export interface TimeSlot {
  startTime: string; // ISO datetime
  endTime: string;   // ISO datetime
  available: boolean;
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  availableSlots: number;
  totalSlots: number;
  isBlackout: boolean;
}

export interface AvailabilityWindow {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  isActive: boolean;
}

export interface BlackoutDate {
  id: string;
  date: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
}
