import { z } from 'zod';
import {
  PractitionerType,
  BookingStatus,
  ServiceType,
  Gender,
  PaymentMethod,
  InsuranceProvider,
} from '../types/enums';

// ─── Reusable Field Validators ───────────────────────────────────────────────

/**
 * Validates Zambian phone numbers in the format +260XXXXXXXXX (12 characters total).
 * Accepts optional leading +260 or 0 prefix and normalizes internally.
 */
export const zambianPhoneSchema = z
  .string()
  .regex(
    /^\+260[0-9]{9}$/,
    'Phone number must be in Zambian format: +260XXXXXXXXX'
  );

export const emailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email must be at most 255 characters')
  .transform((val) => val.toLowerCase().trim());

/**
 * Password must be at least 8 characters and contain at least one uppercase letter,
 * one lowercase letter, one digit, and one special character.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[^A-Za-z0-9]/,
    'Password must contain at least one special character'
  );

// ─── Authentication Schemas ──────────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerPatientSchema = z.object({
  email: emailSchema,
  phone: zambianPhoneSchema,
  password: passwordSchema,
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must be at most 100 characters')
    .trim(),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be at most 100 characters')
    .trim(),
  dateOfBirth: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      'Date of birth must be in YYYY-MM-DD format'
    )
    .refine((val) => {
      const date = new Date(val);
      const now = new Date();
      return date < now;
    }, 'Date of birth must be in the past'),
  gender: z.nativeEnum(Gender),
  consentDataProcessing: z.literal(true, {
    errorMap: () => ({
      message: 'You must consent to data processing to register',
    }),
  }),
  consentTerms: z.literal(true, {
    errorMap: () => ({
      message: 'You must accept the terms of service to register',
    }),
  }),
});

export const registerPractitionerSchema = registerPatientSchema.extend({
  practitionerType: z.nativeEnum(PractitionerType),
  hpczRegistrationNumber: z
    .string()
    .min(1, 'HPCZ registration number is required')
    .max(50, 'HPCZ registration number must be at most 50 characters')
    .trim(),
  serviceRadiusKm: z
    .number()
    .min(1, 'Service radius must be at least 1 km')
    .max(100, 'Service radius must be at most 100 km'),
  baseConsultationFee: z
    .number()
    .min(0, 'Consultation fee cannot be negative')
    .max(100000, 'Consultation fee must be at most 100,000 ZMW'),
});

// ─── Booking Schemas ─────────────────────────────────────────────────────────

export const createBookingSchema = z.object({
  practitionerId: z.string().uuid('Invalid practitioner ID'),
  serviceType: z.nativeEnum(ServiceType),
  scheduledAt: z
    .string()
    .datetime({ message: 'Scheduled time must be a valid ISO 8601 datetime' })
    .refine((val) => {
      const scheduled = new Date(val);
      const now = new Date();
      return scheduled > now;
    }, 'Scheduled time must be in the future'),
  address: z
    .string()
    .min(1, 'Address is required')
    .max(500, 'Address must be at most 500 characters')
    .trim(),
  lat: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  lng: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  notes: z
    .string()
    .max(1000, 'Notes must be at most 1000 characters')
    .trim()
    .optional(),
});

export const updateBookingStatusSchema = z.object({
  status: z.nativeEnum(BookingStatus),
  reason: z
    .string()
    .max(500, 'Reason must be at most 500 characters')
    .trim()
    .optional(),
});

// ─── Medical Record Schemas ──────────────────────────────────────────────────

export const createMedicalRecordSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  bookingId: z.string().uuid('Invalid booking ID'),
  diagnosis: z
    .string()
    .min(1, 'Diagnosis is required')
    .max(2000, 'Diagnosis must be at most 2000 characters')
    .trim(),
  symptoms: z
    .array(z.string().min(1).max(200).trim())
    .min(1, 'At least one symptom is required')
    .max(50, 'At most 50 symptoms allowed'),
  notes: z
    .string()
    .max(5000, 'Notes must be at most 5000 characters')
    .trim()
    .default(''),
  vitalSigns: z
    .object({
      bloodPressureSystolic: z.number().min(50).max(300).optional(),
      bloodPressureDiastolic: z.number().min(30).max(200).optional(),
      heartRate: z.number().min(20).max(300).optional(),
      temperature: z.number().min(30).max(45).optional(),
      oxygenSaturation: z.number().min(0).max(100).optional(),
      weight: z.number().min(0.5).max(500).optional(),
      height: z.number().min(20).max(300).optional(),
    })
    .optional(),
  prescriptions: z
    .array(
      z.object({
        medicationName: z
          .string()
          .min(1, 'Medication name is required')
          .max(200)
          .trim(),
        dosage: z.string().min(1, 'Dosage is required').max(100).trim(),
        frequency: z.string().min(1, 'Frequency is required').max(100).trim(),
        duration: z.string().min(1, 'Duration is required').max(100).trim(),
        quantity: z.number().int().min(1, 'Quantity must be at least 1'),
        instructions: z.string().max(500).trim().optional(),
        isControlledSubstance: z.boolean().default(false),
        zamraSchedule: z.string().max(20).trim().optional(),
      })
    )
    .default([]),
  followUpDate: z
    .string()
    .datetime({ message: 'Follow-up date must be a valid ISO 8601 datetime' })
    .optional(),
  isConfidential: z.boolean().default(false),
});

// ─── Prescription Schema ─────────────────────────────────────────────────────

export const createPrescriptionSchema = z.object({
  medicalRecordId: z.string().uuid('Invalid medical record ID'),
  medicationName: z
    .string()
    .min(1, 'Medication name is required')
    .max(200, 'Medication name must be at most 200 characters')
    .trim(),
  dosage: z
    .string()
    .min(1, 'Dosage is required')
    .max(100, 'Dosage must be at most 100 characters')
    .trim(),
  frequency: z
    .string()
    .min(1, 'Frequency is required')
    .max(100, 'Frequency must be at most 100 characters')
    .trim(),
  duration: z
    .string()
    .min(1, 'Duration is required')
    .max(100, 'Duration must be at most 100 characters')
    .trim(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  instructions: z
    .string()
    .max(500, 'Instructions must be at most 500 characters')
    .trim()
    .optional(),
  isControlledSubstance: z.boolean().default(false),
  zamraSchedule: z
    .string()
    .max(20, 'ZAMRA schedule must be at most 20 characters')
    .trim()
    .optional(),
});

// ─── Practitioner Search Schema ──────────────────────────────────────────────

export const practitionerSearchSchema = z.object({
  type: z.nativeEnum(PractitionerType).optional(),
  lat: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  lng: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  radius: z
    .number()
    .min(1, 'Radius must be at least 1 km')
    .max(100, 'Radius must be at most 100 km')
    .default(25),
  minRating: z
    .number()
    .min(0, 'Minimum rating must be at least 0')
    .max(5, 'Minimum rating must be at most 5')
    .optional(),
  maxFee: z
    .number()
    .min(0, 'Maximum fee cannot be negative')
    .optional(),
  language: z
    .string()
    .max(50)
    .trim()
    .optional(),
  gender: z.nativeEnum(Gender).optional(),
  availability: z
    .string()
    .datetime({
      message: 'Availability must be a valid ISO 8601 datetime',
    })
    .optional(),
});

// ─── Payment Schema ──────────────────────────────────────────────────────────

export const paymentRequestSchema = z.object({
  bookingId: z.string().uuid('Invalid booking ID'),
  amount: z.number().positive('Amount must be positive'),
  method: z.nativeEnum(PaymentMethod),
  phone: zambianPhoneSchema.optional(),
  insuranceProvider: z.nativeEnum(InsuranceProvider).optional(),
  insurancePolicyNumber: z
    .string()
    .max(100, 'Insurance policy number must be at most 100 characters')
    .trim()
    .optional(),
});

// ─── Inferred Types ──────────────────────────────────────────────────────────

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterPatientInput = z.infer<typeof registerPatientSchema>;
export type RegisterPractitionerInput = z.infer<typeof registerPractitionerSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
export type CreateMedicalRecordInput = z.infer<typeof createMedicalRecordSchema>;
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type PractitionerSearchInput = z.infer<typeof practitionerSearchSchema>;
export type PaymentRequestInput = z.infer<typeof paymentRequestSchema>;
