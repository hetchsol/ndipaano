import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { practitionersApi, User, CreateBookingDto } from '../services/api';
import { useBookingStore } from '../stores/booking.store';
import { COLORS, SERVICE_TYPES } from '../utils/constants';
import { formatCurrency, getInitials } from '../utils/helpers';
import type { MainStackScreenProps } from '../navigation/types';

export default function BookingScreen({
  route,
  navigation,
}: MainStackScreenProps<'Booking'>) {
  const { practitionerId, practitionerName } = route.params;
  const { createBooking, isLoading: bookingLoading } = useBookingStore();

  const [practitioner, setPractitioner] = useState<User | null>(null);
  const [isLoadingPractitioner, setIsLoadingPractitioner] = useState(true);

  const [serviceType, setServiceType] = useState('');
  const [showServiceTypes, setShowServiceTypes] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadPractitioner();
  }, [practitionerId]);

  const loadPractitioner = async () => {
    setIsLoadingPractitioner(true);
    try {
      const data = await practitionersApi.getById(practitionerId);
      setPractitioner(data);
    } catch {
      Alert.alert('Error', 'Failed to load practitioner details.');
    } finally {
      setIsLoadingPractitioner(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!serviceType) newErrors.serviceType = 'Please select a service type';
    if (!scheduledDate.trim()) newErrors.scheduledDate = 'Please enter a date';
    if (!scheduledTime.trim()) newErrors.scheduledTime = 'Please enter a time';
    if (!address.trim()) newErrors.address = 'Please enter your address';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirmBooking = async () => {
    if (!validate()) return;

    const dateTimeString = `${scheduledDate}T${scheduledTime}:00`;

    const dto: CreateBookingDto = {
      practitionerId,
      serviceType,
      scheduledDate: dateTimeString,
      address: address.trim(),
      notes: notes.trim() || undefined,
    };

    try {
      const booking = await createBooking(dto);
      Alert.alert('Booking Created', 'Your booking request has been sent to the practitioner.', [
        {
          text: 'View Details',
          onPress: () => navigation.replace('BookingDetail', { bookingId: booking.id }),
        },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to create booking. Please try again.');
    }
  };

  const selectedServiceLabel =
    SERVICE_TYPES.find((s) => s.value === serviceType)?.label || 'Select a service';

  const profile = practitioner?.practitionerProfile;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Practitioner Info Card */}
      {isLoadingPractitioner ? (
        <View style={styles.practitionerCard}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : practitioner ? (
        <View style={styles.practitionerCard}>
          <View style={styles.practitionerAvatar}>
            <Text style={styles.practitionerAvatarText}>
              {getInitials(practitionerName)}
            </Text>
          </View>
          <View style={styles.practitionerInfo}>
            <Text style={styles.practitionerName}>{practitionerName}</Text>
            <Text style={styles.practitionerType}>
              {profile?.practitionerType?.replace(/_/g, ' ').replace(/\b\w/g, (c) =>
                c.toUpperCase(),
              ) || 'Practitioner'}
            </Text>
            <View style={styles.practitionerMeta}>
              <Text style={styles.practitionerRating}>
                {'\u2605'} {profile?.rating?.toFixed(1) || '0.0'} ({profile?.totalReviews || 0}{' '}
                reviews)
              </Text>
              <Text style={styles.practitionerFee}>
                {formatCurrency(profile?.consultationFee || 0)}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Booking Form */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Book Appointment</Text>

        {/* Service Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Service Type</Text>
          <TouchableOpacity
            style={[styles.selectInput, errors.serviceType && styles.inputError]}
            onPress={() => setShowServiceTypes(!showServiceTypes)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.selectText,
                !serviceType && styles.placeholderText,
              ]}
            >
              {selectedServiceLabel}
            </Text>
            <Text style={styles.selectArrow}>{showServiceTypes ? '\u25B2' : '\u25BC'}</Text>
          </TouchableOpacity>
          {errors.serviceType && (
            <Text style={styles.fieldError}>{errors.serviceType}</Text>
          )}
          {showServiceTypes && (
            <View style={styles.dropdown}>
              {SERVICE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.dropdownItem,
                    serviceType === type.value && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setServiceType(type.value);
                    setShowServiceTypes(false);
                    if (errors.serviceType) {
                      setErrors((prev) => ({ ...prev, serviceType: '' }));
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      serviceType === type.value && styles.dropdownItemTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date</Text>
          <TextInput
            style={[styles.input, errors.scheduledDate && styles.inputError]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.textMuted}
            value={scheduledDate}
            onChangeText={(t) => {
              setScheduledDate(t);
              if (errors.scheduledDate) setErrors((prev) => ({ ...prev, scheduledDate: '' }));
            }}
          />
          {errors.scheduledDate && (
            <Text style={styles.fieldError}>{errors.scheduledDate}</Text>
          )}
        </View>

        {/* Time */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Time</Text>
          <TextInput
            style={[styles.input, errors.scheduledTime && styles.inputError]}
            placeholder="HH:MM (24hr)"
            placeholderTextColor={COLORS.textMuted}
            value={scheduledTime}
            onChangeText={(t) => {
              setScheduledTime(t);
              if (errors.scheduledTime) setErrors((prev) => ({ ...prev, scheduledTime: '' }));
            }}
          />
          {errors.scheduledTime && (
            <Text style={styles.fieldError}>{errors.scheduledTime}</Text>
          )}
        </View>

        {/* Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              errors.address && styles.inputError,
            ]}
            placeholder="Enter your home address for the visit"
            placeholderTextColor={COLORS.textMuted}
            value={address}
            onChangeText={(t) => {
              setAddress(t);
              if (errors.address) setErrors((prev) => ({ ...prev, address: '' }));
            }}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />
          {errors.address && <Text style={styles.fieldError}>{errors.address}</Text>}
        </View>

        {/* Notes */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Additional Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Any special instructions or health information..."
            placeholderTextColor={COLORS.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Fee Summary */}
        {profile?.consultationFee && (
          <View style={styles.feeSummary}>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Consultation Fee</Text>
              <Text style={styles.feeValue}>
                {formatCurrency(profile.consultationFee)}
              </Text>
            </View>
            <View style={styles.feeDivider} />
            <View style={styles.feeRow}>
              <Text style={styles.feeTotalLabel}>Total</Text>
              <Text style={styles.feeTotalValue}>
                {formatCurrency(profile.consultationFee)}
              </Text>
            </View>
          </View>
        )}

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.confirmButton, bookingLoading && styles.confirmButtonDisabled]}
          onPress={handleConfirmBooking}
          disabled={bookingLoading}
          activeOpacity={0.7}
        >
          {bookingLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Booking</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  practitionerCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  practitionerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  practitionerAvatarText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
  },
  practitionerInfo: {
    flex: 1,
  },
  practitionerName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  practitionerType: {
    fontSize: 13,
    color: COLORS.secondary,
    fontWeight: '500',
    marginTop: 2,
  },
  practitionerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 12,
  },
  practitionerRating: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  practitionerFee: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
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
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 20,
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
  textArea: {
    minHeight: 60,
    paddingTop: 12,
  },
  selectInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    backgroundColor: COLORS.gray50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  placeholderText: {
    color: COLORS.textMuted,
  },
  selectArrow: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  dropdown: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    marginTop: 4,
    maxHeight: 250,
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
  fieldError: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 4,
  },
  feeSummary: {
    backgroundColor: COLORS.gray50,
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    marginTop: 4,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  feeValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  feeDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
  },
  feeTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  feeTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  confirmButton: {
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
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
