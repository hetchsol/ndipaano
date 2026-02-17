import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useAuthStore } from '../stores/auth.store';
import { COLORS, PRACTITIONER_TYPES } from '../utils/constants';
import { isValidEmail, isValidZambianPhone } from '../utils/helpers';
import type { RegisterPatientDto, RegisterPractitionerDto } from '../services/api';
import type { AuthStackScreenProps } from '../navigation/types';

type RegistrationRole = 'PATIENT' | 'PRACTITIONER';

export default function RegisterScreen({ navigation }: AuthStackScreenProps<'Register'>) {
  const { register, isLoading, error, clearError } = useAuthStore();

  const [role, setRole] = useState<RegistrationRole>('PATIENT');

  // Common fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');

  // Practitioner fields
  const [practitionerType, setPractitionerType] = useState('DOCTOR');
  const [hpczNumber, setHpczNumber] = useState('');
  const [serviceRadiusKm, setServiceRadiusKm] = useState('10');
  const [consultationFee, setConsultationFee] = useState('');

  // Consent
  const [consentDataProcessing, setConsentDataProcessing] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showPractitionerTypes, setShowPractitionerTypes] = useState(false);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!firstName.trim()) errors.firstName = 'First name is required';
    if (!lastName.trim()) errors.lastName = 'Last name is required';
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!isValidEmail(email)) {
      errors.email = 'Enter a valid email address';
    }
    if (!phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!isValidZambianPhone(phone)) {
      errors.phone = 'Enter a valid Zambian phone number';
    }
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    if (!dateOfBirth.trim()) {
      errors.dateOfBirth = 'Date of birth is required';
    }

    if (role === 'PRACTITIONER') {
      if (!hpczNumber.trim()) errors.hpczNumber = 'HPCZ registration number is required';
      if (!consultationFee || parseFloat(consultationFee) <= 0) {
        errors.consultationFee = 'Enter a valid consultation fee';
      }
    }

    if (!consentDataProcessing) {
      errors.consentDataProcessing = 'You must consent to data processing';
    }
    if (!consentTerms) {
      errors.consentTerms = 'You must accept the terms and conditions';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    clearError();
    if (!validate()) return;

    const baseDto: RegisterPatientDto = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      password,
      dateOfBirth,
      gender,
      consentDataProcessing,
      consentTerms,
    };

    try {
      if (role === 'PRACTITIONER') {
        const practitionerDto: RegisterPractitionerDto = {
          ...baseDto,
          practitionerType,
          hpczNumber: hpczNumber.trim(),
          serviceRadiusKm: parseInt(serviceRadiusKm, 10),
          consultationFee: parseFloat(consultationFee),
        };
        await register(practitionerDto, 'PRACTITIONER');
      } else {
        await register(baseDto, 'PATIENT');
      }
    } catch {
      // Error is handled by the store
    }
  };

  const clearFieldError = (field: string) => {
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const selectedTypeLabel =
    PRACTITIONER_TYPES.find((t) => t.value === practitionerType)?.label || 'Select Type';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>{'\u2190'} Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Account</Text>
          <Text style={styles.headerSubtitle}>Join Ndiipano Medical Home Care</Text>
        </View>

        {/* Role Toggle */}
        <View style={styles.roleToggle}>
          <TouchableOpacity
            style={[styles.roleButton, role === 'PATIENT' && styles.roleButtonActive]}
            onPress={() => setRole('PATIENT')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.roleButtonText,
                role === 'PATIENT' && styles.roleButtonTextActive,
              ]}
            >
              Patient
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleButton, role === 'PRACTITIONER' && styles.roleButtonActive]}
            onPress={() => setRole('PRACTITIONER')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.roleButtonText,
                role === 'PRACTITIONER' && styles.roleButtonTextActive,
              ]}
            >
              Practitioner
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Name Fields */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                style={[styles.input, validationErrors.firstName && styles.inputError]}
                placeholder="John"
                placeholderTextColor={COLORS.textMuted}
                value={firstName}
                onChangeText={(t) => {
                  setFirstName(t);
                  clearFieldError('firstName');
                }}
              />
              {validationErrors.firstName ? (
                <Text style={styles.fieldError}>{validationErrors.firstName}</Text>
              ) : null}
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                style={[styles.input, validationErrors.lastName && styles.inputError]}
                placeholder="Banda"
                placeholderTextColor={COLORS.textMuted}
                value={lastName}
                onChangeText={(t) => {
                  setLastName(t);
                  clearFieldError('lastName');
                }}
              />
              {validationErrors.lastName ? (
                <Text style={styles.fieldError}>{validationErrors.lastName}</Text>
              ) : null}
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, validationErrors.email && styles.inputError]}
              placeholder="you@example.com"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                clearFieldError('email');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {validationErrors.email ? (
              <Text style={styles.fieldError}>{validationErrors.email}</Text>
            ) : null}
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={[styles.input, validationErrors.phone && styles.inputError]}
              placeholder="+260 97 123 4567"
              placeholderTextColor={COLORS.textMuted}
              value={phone}
              onChangeText={(t) => {
                setPhone(t);
                clearFieldError('phone');
              }}
              keyboardType="phone-pad"
            />
            <Text style={styles.hint}>Zambian format: +260...</Text>
            {validationErrors.phone ? (
              <Text style={styles.fieldError}>{validationErrors.phone}</Text>
            ) : null}
          </View>

          {/* Date of Birth */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth</Text>
            <TextInput
              style={[styles.input, validationErrors.dateOfBirth && styles.inputError]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
              value={dateOfBirth}
              onChangeText={(t) => {
                setDateOfBirth(t);
                clearFieldError('dateOfBirth');
              }}
            />
            {validationErrors.dateOfBirth ? (
              <Text style={styles.fieldError}>{validationErrors.dateOfBirth}</Text>
            ) : null}
          </View>

          {/* Gender */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderRow}>
              {(['MALE', 'FEMALE', 'OTHER'] as const).map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderButton, gender === g && styles.genderButtonActive]}
                  onPress={() => setGender(g)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.genderButtonText,
                      gender === g && styles.genderButtonTextActive,
                    ]}
                  >
                    {g.charAt(0) + g.slice(1).toLowerCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, validationErrors.password && styles.inputError]}
              placeholder="At least 8 characters"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                clearFieldError('password');
              }}
              secureTextEntry
            />
            {validationErrors.password ? (
              <Text style={styles.fieldError}>{validationErrors.password}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={[styles.input, validationErrors.confirmPassword && styles.inputError]}
              placeholder="Repeat your password"
              placeholderTextColor={COLORS.textMuted}
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                clearFieldError('confirmPassword');
              }}
              secureTextEntry
            />
            {validationErrors.confirmPassword ? (
              <Text style={styles.fieldError}>{validationErrors.confirmPassword}</Text>
            ) : null}
          </View>

          {/* Practitioner-specific fields */}
          {role === 'PRACTITIONER' && (
            <View style={styles.practitionerSection}>
              <Text style={styles.sectionTitle}>Professional Details</Text>

              {/* Practitioner Type */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Practitioner Type</Text>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowPractitionerTypes(!showPractitionerTypes)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.selectText}>{selectedTypeLabel}</Text>
                </TouchableOpacity>
                {showPractitionerTypes && (
                  <View style={styles.dropdown}>
                    {PRACTITIONER_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type.value}
                        style={[
                          styles.dropdownItem,
                          practitionerType === type.value && styles.dropdownItemActive,
                        ]}
                        onPress={() => {
                          setPractitionerType(type.value);
                          setShowPractitionerTypes(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            practitionerType === type.value &&
                              styles.dropdownItemTextActive,
                          ]}
                        >
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {/* HPCZ Number */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>HPCZ Registration Number</Text>
                <TextInput
                  style={[styles.input, validationErrors.hpczNumber && styles.inputError]}
                  placeholder="e.g., HPCZ/12345"
                  placeholderTextColor={COLORS.textMuted}
                  value={hpczNumber}
                  onChangeText={(t) => {
                    setHpczNumber(t);
                    clearFieldError('hpczNumber');
                  }}
                  autoCapitalize="characters"
                />
                <Text style={styles.hint}>
                  Health Professions Council of Zambia registration
                </Text>
                {validationErrors.hpczNumber ? (
                  <Text style={styles.fieldError}>{validationErrors.hpczNumber}</Text>
                ) : null}
              </View>

              {/* Service Radius */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Service Radius (km)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10"
                  placeholderTextColor={COLORS.textMuted}
                  value={serviceRadiusKm}
                  onChangeText={setServiceRadiusKm}
                  keyboardType="numeric"
                />
              </View>

              {/* Consultation Fee */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Consultation Fee (ZMW)</Text>
                <TextInput
                  style={[
                    styles.input,
                    validationErrors.consultationFee && styles.inputError,
                  ]}
                  placeholder="250.00"
                  placeholderTextColor={COLORS.textMuted}
                  value={consultationFee}
                  onChangeText={(t) => {
                    setConsultationFee(t);
                    clearFieldError('consultationFee');
                  }}
                  keyboardType="decimal-pad"
                />
                {validationErrors.consultationFee ? (
                  <Text style={styles.fieldError}>{validationErrors.consultationFee}</Text>
                ) : null}
              </View>
            </View>
          )}

          {/* Consent Checkboxes */}
          <View style={styles.consentSection}>
            <View style={styles.consentRow}>
              <Switch
                value={consentDataProcessing}
                onValueChange={setConsentDataProcessing}
                trackColor={{ false: COLORS.gray300, true: COLORS.primaryLight }}
                thumbColor={consentDataProcessing ? COLORS.primary : COLORS.gray400}
              />
              <Text style={styles.consentText}>
                I consent to the processing of my personal and health data in accordance with
                Zambia's Data Protection Act
              </Text>
            </View>
            {validationErrors.consentDataProcessing ? (
              <Text style={styles.fieldError}>
                {validationErrors.consentDataProcessing}
              </Text>
            ) : null}

            <View style={styles.consentRow}>
              <Switch
                value={consentTerms}
                onValueChange={setConsentTerms}
                trackColor={{ false: COLORS.gray300, true: COLORS.primaryLight }}
                thumbColor={consentTerms ? COLORS.primary : COLORS.gray400}
              />
              <Text style={styles.consentText}>
                I accept the Terms of Service and Privacy Policy
              </Text>
            </View>
            {validationErrors.consentTerms ? (
              <Text style={styles.fieldError}>{validationErrors.consentTerms}</Text>
            ) : null}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Login Link */}
        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.loginLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  roleToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray100,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  roleButtonActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  roleButtonTextActive: {
    color: COLORS.white,
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  errorContainer: {
    backgroundColor: COLORS.redLight,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.danger,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.gray50,
  },
  inputError: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.redLight,
  },
  fieldError: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 4,
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  selectText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  dropdown: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownItemActive: {
    backgroundColor: COLORS.greenLight,
  },
  dropdownItemText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  dropdownItemTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.gray50,
  },
  genderButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.greenLight,
  },
  genderButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  genderButtonTextActive: {
    color: COLORS.primary,
  },
  practitionerSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 20,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.secondary,
    marginBottom: 16,
  },
  consentSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  loginText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
  },
});
