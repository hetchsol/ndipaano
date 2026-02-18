'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Eye, EyeOff, UserPlus } from 'lucide-react';

/**
 * Calculate age from a date-of-birth string (YYYY-MM-DD).
 */
function getAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

const patientSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  phone: z.string().min(10, 'Please enter a valid Zambian phone number'),
  sex: z.string().min(1, 'Please select your sex'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  nationality: z.string().min(1, 'Nationality is required'),
  nrc: z.string().optional().or(z.literal('')),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  consentDataProcessing: z.boolean().refine((val) => val === true, {
    message: 'You must consent to data processing to register',
  }),
  consentTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms of service',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).refine((data) => {
  // Non-Zambian: passport is required
  if (data.nationality !== 'Zambian') {
    return !!data.nrc && data.nrc.trim().length > 0;
  }
  // Zambian aged 18+: NRC is required
  if (data.dateOfBirth && getAge(data.dateOfBirth) >= 18) {
    return !!data.nrc && data.nrc.trim().length > 0;
  }
  // Zambian under 18: NRC not required
  return true;
}, {
  message: 'This field is required',
  path: ['nrc'],
});

const practitionerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid Zambian phone number'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  practitionerType: z.string().min(1, 'Please select your profession type'),
  licenseNumber: z.string().min(1, 'License number is required'),
  consentDataProcessing: z.boolean().refine((val) => val === true, {
    message: 'You must consent to data processing to register',
  }),
  consentTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms of service',
  }),
  consentVerification: z.boolean().refine((val) => val === true, {
    message: 'You must consent to credential verification',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type PatientFormData = z.infer<typeof patientSchema>;
type PractitionerFormData = z.infer<typeof practitionerSchema>;

const sexOptions = [
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

const nationalityOptions = [
  { value: 'Zambian', label: 'Zambian' },
  { value: 'Other', label: 'Other (Non-Zambian)' },
];

const practitionerTypes = [
  { value: 'doctor', label: 'Doctor (General Practitioner)' },
  { value: 'specialist', label: 'Specialist Doctor' },
  { value: 'nurse', label: 'Registered Nurse' },
  { value: 'midwife', label: 'Midwife' },
  { value: 'physiotherapist', label: 'Physiotherapist' },
  { value: 'pharmacist', label: 'Pharmacist' },
  { value: 'clinical_officer', label: 'Clinical Officer' },
  { value: 'lab_technician', label: 'Laboratory Technician' },
  { value: 'counselor', label: 'Mental Health Counselor' },
  { value: 'dentist', label: 'Dentist' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [activeTab, setActiveTab] = useState('patient');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const patientForm = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      consentDataProcessing: false,
      consentTerms: false,
    },
  });

  const practitionerForm = useForm<PractitionerFormData>({
    resolver: zodResolver(practitionerSchema),
    defaultValues: {
      consentDataProcessing: false,
      consentTerms: false,
      consentVerification: false,
    },
  });

  const onPatientSubmit = async (data: PatientFormData) => {
    setIsLoading(true);
    try {
      const result = await registerUser({
        email: data.email || undefined,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: 'patient',
        gender: data.sex,
        dateOfBirth: data.dateOfBirth,
        nationality: data.nationality,
        nrc: data.nrc || undefined,
      });
      toast.success('Account created successfully! Welcome to Ndipaano!.');
      if (result?.memberId) {
        toast.success(`Your Member ID is ${result.memberId}`, { duration: 10000 });
      }
      router.push('/patient/dashboard');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onPractitionerSubmit = async (data: PractitionerFormData) => {
    setIsLoading(true);
    try {
      await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: 'practitioner',
        practitionerType: data.practitionerType,
        licenseNumber: data.licenseNumber,
      });
      toast.success('Account created! Your credentials will be verified within 48 hours.');
      router.push('/practitioner/dashboard');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
      <p className="mt-2 text-sm text-gray-500">
        Choose your account type to get started.
      </p>

      <Tabs defaultValue="patient" value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="w-full">
          <TabsTrigger value="patient" className="flex-1">
            Client
          </TabsTrigger>
          <TabsTrigger value="practitioner" className="flex-1">
            Practitioner
          </TabsTrigger>
        </TabsList>

        {/* Patient Registration */}
        <TabsContent value="patient">
          <form onSubmit={patientForm.handleSubmit(onPatientSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                placeholder="John"
                error={patientForm.formState.errors.firstName?.message}
                {...patientForm.register('firstName')}
              />
              <Input
                label="Last Name"
                placeholder="Banda"
                error={patientForm.formState.errors.lastName?.message}
                {...patientForm.register('lastName')}
              />
            </div>

            <Input
              label="Email Address (Optional)"
              type="email"
              placeholder="john@example.com"
              error={patientForm.formState.errors.email?.message}
              {...patientForm.register('email')}
            />

            <Input
              label="Phone Number"
              type="tel"
              placeholder="+260 97X XXX XXX"
              error={patientForm.formState.errors.phone?.message}
              {...patientForm.register('phone')}
            />

            <Select
              label="Sex"
              options={sexOptions}
              placeholder="Select your sex"
              error={patientForm.formState.errors.sex?.message}
              {...patientForm.register('sex')}
            />

            <Input
              label="Date of Birth"
              type="date"
              error={patientForm.formState.errors.dateOfBirth?.message}
              {...patientForm.register('dateOfBirth')}
            />

            <Select
              label="Nationality"
              options={nationalityOptions}
              placeholder="Select your nationality"
              error={patientForm.formState.errors.nationality?.message}
              {...patientForm.register('nationality')}
            />

            {(() => {
              const nationality = patientForm.watch('nationality');
              const dob = patientForm.watch('dateOfBirth');
              const isZambian = nationality === 'Zambian';
              const age = dob ? getAge(dob) : 0;
              const isOptional = isZambian && dob && age < 18;
              const label = !isZambian
                ? 'Passport Number'
                : age >= 18
                  ? 'NRC Number'
                  : 'NRC Number (Optional — under 18)';
              const placeholder = !isZambian
                ? 'e.g., AB1234567'
                : 'e.g., 123456/78/1';

              // Hide field entirely if nationality not yet selected
              if (!nationality) return null;

              return (
                <Input
                  label={label}
                  placeholder={placeholder}
                  error={patientForm.formState.errors.nrc?.message}
                  {...patientForm.register('nrc')}
                />
              );
            })()}

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                error={patientForm.formState.errors.password?.message}
                {...patientForm.register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter your password"
              error={patientForm.formState.errors.confirmPassword?.message}
              {...patientForm.register('confirmPassword')}
            />

            {/* DPA Consent Checkboxes */}
            <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Data Protection Consent
              </p>

              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-700 focus:ring-primary-700"
                  {...patientForm.register('consentDataProcessing')}
                />
                <span className="text-xs text-gray-600">
                  I consent to the processing of my personal and health data as described in the{' '}
                  <Link href="/consent" className="text-primary-700 underline">
                    Privacy Policy
                  </Link>
                  , in compliance with the Zambia Data Protection Act, 2021.
                </span>
              </label>
              {patientForm.formState.errors.consentDataProcessing && (
                <p className="text-xs text-red-600">
                  {patientForm.formState.errors.consentDataProcessing.message}
                </p>
              )}

              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-700 focus:ring-primary-700"
                  {...patientForm.register('consentTerms')}
                />
                <span className="text-xs text-gray-600">
                  I accept the{' '}
                  <Link href="#" className="text-primary-700 underline">
                    Terms of Service
                  </Link>{' '}
                  and understand how my data will be used.
                </span>
              </label>
              {patientForm.formState.errors.consentTerms && (
                <p className="text-xs text-red-600">
                  {patientForm.formState.errors.consentTerms.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              <UserPlus className="mr-2 h-4 w-4" />
              Create Client Account
            </Button>
          </form>
        </TabsContent>

        {/* Practitioner Registration */}
        <TabsContent value="practitioner">
          <form onSubmit={practitionerForm.handleSubmit(onPractitionerSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                placeholder="Jane"
                error={practitionerForm.formState.errors.firstName?.message}
                {...practitionerForm.register('firstName')}
              />
              <Input
                label="Last Name"
                placeholder="Mwale"
                error={practitionerForm.formState.errors.lastName?.message}
                {...practitionerForm.register('lastName')}
              />
            </div>

            <Input
              label="Email Address"
              type="email"
              placeholder="jane@example.com"
              error={practitionerForm.formState.errors.email?.message}
              {...practitionerForm.register('email')}
            />

            <Input
              label="Phone Number"
              type="tel"
              placeholder="+260 97X XXX XXX"
              error={practitionerForm.formState.errors.phone?.message}
              {...practitionerForm.register('phone')}
            />

            <Select
              label="Profession Type"
              options={practitionerTypes}
              placeholder="Select your profession"
              error={practitionerForm.formState.errors.practitionerType?.message}
              {...practitionerForm.register('practitionerType')}
            />

            <Input
              label="HPCZ License Number"
              placeholder="e.g., HPCZ-DR-12345"
              error={practitionerForm.formState.errors.licenseNumber?.message}
              helperText="This will be verified with the Health Professions Council of Zambia"
              {...practitionerForm.register('licenseNumber')}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                error={practitionerForm.formState.errors.password?.message}
                {...practitionerForm.register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter your password"
              error={practitionerForm.formState.errors.confirmPassword?.message}
              {...practitionerForm.register('confirmPassword')}
            />

            {/* DPA Consent Checkboxes */}
            <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Data Protection Consent
              </p>

              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-700 focus:ring-primary-700"
                  {...practitionerForm.register('consentDataProcessing')}
                />
                <span className="text-xs text-gray-600">
                  I consent to the processing of my personal data as described in the{' '}
                  <Link href="/consent" className="text-primary-700 underline">
                    Privacy Policy
                  </Link>
                  , in compliance with the Zambia Data Protection Act, 2021.
                </span>
              </label>
              {practitionerForm.formState.errors.consentDataProcessing && (
                <p className="text-xs text-red-600">
                  {practitionerForm.formState.errors.consentDataProcessing.message}
                </p>
              )}

              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-700 focus:ring-primary-700"
                  {...practitionerForm.register('consentTerms')}
                />
                <span className="text-xs text-gray-600">
                  I accept the{' '}
                  <Link href="#" className="text-primary-700 underline">
                    Terms of Service
                  </Link>{' '}
                  and Practitioner Agreement.
                </span>
              </label>
              {practitionerForm.formState.errors.consentTerms && (
                <p className="text-xs text-red-600">
                  {practitionerForm.formState.errors.consentTerms.message}
                </p>
              )}

              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-700 focus:ring-primary-700"
                  {...practitionerForm.register('consentVerification')}
                />
                <span className="text-xs text-gray-600">
                  I consent to the verification of my professional credentials with HPCZ and authorize
                  Ndipaano to perform background checks as required.
                </span>
              </label>
              {practitionerForm.formState.errors.consentVerification && (
                <p className="text-xs text-red-600">
                  {practitionerForm.formState.errors.consentVerification.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              <UserPlus className="mr-2 h-4 w-4" />
              Create Practitioner Account
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary-700 hover:text-primary-800">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
