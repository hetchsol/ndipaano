// ─── Enums ───────────────────────────────────────────────────────────────────
export {
  UserRole,
  PractitionerType,
  BookingStatus,
  PaymentStatus,
  PaymentMethod,
  ServiceType,
  ConsentType,
  DocumentType,
  NotificationChannel,
  DataRequestType,
  Gender,
  BloodType,
  InsuranceProvider,
  MessageType,
  DayOfWeek,
  ReminderType,
} from './types/enums';

// ─── Interfaces ──────────────────────────────────────────────────────────────
export type {
  LoginRequest,
  RegisterPatientRequest,
  RegisterPractitionerRequest,
  BookingRequest,
  BookingResponse,
  PractitionerSearchQuery,
  PaymentRequest,
  PaymentWebhookPayload,
  PaginatedResponse,
  ApiResponse,
  UserProfile,
  PractitionerProfile,
  PatientProfile,
  MedicalRecord,
  Prescription,
  ConsentRecord,
  AuditLogEntry,
  Conversation,
  ChatMessage,
  TimeSlot,
  CalendarDay,
  AvailabilityWindow,
  BlackoutDate,
} from './types/interfaces';

// ─── Validation Schemas ──────────────────────────────────────────────────────
export {
  zambianPhoneSchema,
  emailSchema,
  passwordSchema,
  loginSchema,
  registerPatientSchema,
  registerPractitionerSchema,
  createBookingSchema,
  updateBookingStatusSchema,
  createMedicalRecordSchema,
  createPrescriptionSchema,
  practitionerSearchSchema,
  paymentRequestSchema,
  createMessageSchema,
  createAvailabilitySchema,
  bulkAvailabilitySchema,
  createBlackoutSchema,
  rescheduleBookingSchema,
  updateSchedulingSettingsSchema,
} from './validation/schemas';

export type {
  LoginInput,
  RegisterPatientInput,
  RegisterPractitionerInput,
  CreateBookingInput,
  UpdateBookingStatusInput,
  CreateMedicalRecordInput,
  CreatePrescriptionInput,
  PractitionerSearchInput,
  PaymentRequestInput,
  CreateMessageInput,
  CreateAvailabilityInput,
  BulkAvailabilityInput,
  CreateBlackoutInput,
  RescheduleBookingInput,
  UpdateSchedulingSettingsInput,
} from './validation/schemas';

// ─── Constants ───────────────────────────────────────────────────────────────
export {
  ZAMBIAN_PROVINCES,
  ZAMBIAN_DISTRICTS,
  ZAMBIAN_LANGUAGES,
  HPCZ_CATEGORIES,
  ZAMRA_CONTROLLED_SUBSTANCES,
  CURRENCY,
  COUNTRY_CODE,
  EMERGENCY_NUMBERS,
  DEFAULT_SERVICE_RADIUS_KM,
  MAX_SERVICE_RADIUS_KM,
  PLATFORM_COMMISSION_PERCENT,
} from './constants/zambia';

// ─── Utilities ───────────────────────────────────────────────────────────────
export {
  formatZambianPhone,
  isValidZambianPhone,
  formatCurrency,
  calculateCommission,
  calculateDistance,
} from './utils/index';
