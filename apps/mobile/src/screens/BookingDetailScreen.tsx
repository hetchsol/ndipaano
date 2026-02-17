import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useAuthStore } from '../stores/auth.store';
import { useBookingStore } from '../stores/booking.store';
import { COLORS, BOOKING_STATUS } from '../utils/constants';
import { formatDate, formatCurrency, getInitials, getStatusLabel } from '../utils/helpers';
import StatusBadge from '../components/StatusBadge';
import {
  connectTracking,
  subscribeToBooking,
  onLocationUpdate,
  onBookingStatusChanged,
  disconnect as disconnectSocket,
  LocationUpdate,
} from '../services/socket';
import type { MainStackScreenProps } from '../navigation/types';

const STATUS_STEPS = [
  BOOKING_STATUS.REQUESTED,
  BOOKING_STATUS.ACCEPTED,
  BOOKING_STATUS.EN_ROUTE,
  BOOKING_STATUS.IN_PROGRESS,
  BOOKING_STATUS.COMPLETED,
];

export default function BookingDetailScreen({
  route,
  navigation,
}: MainStackScreenProps<'BookingDetail'>) {
  const { bookingId } = route.params;
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const {
    selectedBooking,
    fetchBookingById,
    acceptBooking,
    rejectBooking,
    cancelBooking,
    completeBooking,
    isLoading,
  } = useBookingStore();

  const isPractitioner = user?.role === 'PRACTITIONER';
  const [refreshing, setRefreshing] = useState(false);
  const [practitionerLocation, setPractitionerLocation] = useState<LocationUpdate | null>(
    null,
  );

  const loadBooking = useCallback(async () => {
    await fetchBookingById(bookingId);
  }, [bookingId, fetchBookingById]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  // Real-time tracking via socket
  useEffect(() => {
    if (
      !selectedBooking ||
      !token ||
      (selectedBooking.status !== BOOKING_STATUS.EN_ROUTE &&
        selectedBooking.status !== BOOKING_STATUS.IN_PROGRESS)
    ) {
      return;
    }

    const socket = connectTracking(token);
    subscribeToBooking(bookingId);

    const unsubLocation = onLocationUpdate((data) => {
      if (data.bookingId === bookingId) {
        setPractitionerLocation(data);
      }
    });

    const unsubStatus = onBookingStatusChanged((data) => {
      if (data.bookingId === bookingId) {
        loadBooking();
      }
    });

    return () => {
      unsubLocation();
      unsubStatus();
      disconnectSocket();
    };
  }, [selectedBooking?.status, bookingId, token, loadBooking]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBooking();
    setRefreshing(false);
  };

  const handleAccept = () => {
    Alert.alert('Accept Booking', 'Are you sure you want to accept this booking?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept',
        onPress: async () => {
          try {
            await acceptBooking(bookingId);
            await loadBooking();
          } catch {
            Alert.alert('Error', 'Failed to accept booking.');
          }
        },
      },
    ]);
  };

  const handleReject = () => {
    Alert.alert('Reject Booking', 'Are you sure you want to reject this booking?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            await rejectBooking(bookingId, 'Rejected by practitioner');
            await loadBooking();
          } catch {
            Alert.alert('Error', 'Failed to reject booking.');
          }
        },
      },
    ]);
  };

  const handleCancel = () => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelBooking(bookingId, 'Cancelled by user');
            await loadBooking();
          } catch {
            Alert.alert('Error', 'Failed to cancel booking.');
          }
        },
      },
    ]);
  };

  const handleComplete = () => {
    Alert.alert('Complete Booking', 'Mark this booking as completed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          try {
            await completeBooking(bookingId);
            await loadBooking();
          } catch {
            Alert.alert('Error', 'Failed to complete booking.');
          }
        },
      },
    ]);
  };

  if (!selectedBooking && isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!selectedBooking) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Booking not found</Text>
      </View>
    );
  }

  const booking = selectedBooking;
  const otherParty = isPractitioner ? booking.patient : booking.practitioner;
  const otherPartyName = otherParty
    ? `${otherParty.firstName} ${otherParty.lastName}`
    : 'Unknown';
  const currentStepIndex = STATUS_STEPS.indexOf(booking.status);
  const isCancelled =
    booking.status === BOOKING_STATUS.CANCELLED ||
    booking.status === BOOKING_STATUS.REJECTED;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Status Badge */}
      <View style={styles.statusRow}>
        <StatusBadge status={booking.status} />
        <Text style={styles.bookingId}>#{booking.id.slice(0, 8)}</Text>
      </View>

      {/* Status Timeline */}
      {!isCancelled && (
        <View style={styles.timeline}>
          {STATUS_STEPS.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            return (
              <View key={step} style={styles.timelineStep}>
                <View style={styles.timelineIndicatorRow}>
                  <View
                    style={[
                      styles.timelineDot,
                      isCompleted && styles.timelineDotCompleted,
                      isCurrent && styles.timelineDotCurrent,
                    ]}
                  >
                    {isCompleted && <Text style={styles.timelineCheck}>{'\u2713'}</Text>}
                  </View>
                  {index < STATUS_STEPS.length - 1 && (
                    <View
                      style={[
                        styles.timelineLine,
                        isCompleted && styles.timelineLineCompleted,
                      ]}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.timelineLabel,
                    isCompleted && styles.timelineLabelCompleted,
                    isCurrent && styles.timelineLabelCurrent,
                  ]}
                >
                  {getStatusLabel(step)}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Map Placeholder for tracking */}
      {(booking.status === BOOKING_STATUS.EN_ROUTE ||
        booking.status === BOOKING_STATUS.IN_PROGRESS) && (
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapPlaceholderIcon}>{'\u{1F5FA}'}</Text>
          <Text style={styles.mapPlaceholderTitle}>Live Tracking</Text>
          {practitionerLocation ? (
            <Text style={styles.mapPlaceholderText}>
              Practitioner location: {practitionerLocation.latitude.toFixed(4)},{' '}
              {practitionerLocation.longitude.toFixed(4)}
            </Text>
          ) : (
            <Text style={styles.mapPlaceholderText}>
              Waiting for practitioner location updates...
            </Text>
          )}
        </View>
      )}

      {/* Other Party Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoCardTitle}>
          {isPractitioner ? 'Patient' : 'Practitioner'}
        </Text>
        <View style={styles.personRow}>
          <View style={styles.personAvatar}>
            <Text style={styles.personAvatarText}>{getInitials(otherPartyName)}</Text>
          </View>
          <View style={styles.personInfo}>
            <Text style={styles.personName}>{otherPartyName}</Text>
            {otherParty?.phone && (
              <Text style={styles.personPhone}>{otherParty.phone}</Text>
            )}
            {!isPractitioner && otherParty?.practitionerProfile && (
              <Text style={styles.personType}>
                {otherParty.practitionerProfile.practitionerType
                  ?.replace(/_/g, ' ')
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Booking Details */}
      <View style={styles.infoCard}>
        <Text style={styles.infoCardTitle}>Booking Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Service</Text>
          <Text style={styles.detailValue}>
            {booking.serviceType
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase())}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date & Time</Text>
          <Text style={styles.detailValue}>{formatDate(booking.scheduledDate)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Address</Text>
          <Text style={styles.detailValue}>{booking.address || 'Not specified'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Fee</Text>
          <Text style={[styles.detailValue, styles.feeValue]}>
            {formatCurrency(booking.fee)}
          </Text>
        </View>
        {booking.notes && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Notes</Text>
            <Text style={styles.detailValue}>{booking.notes}</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {/* Practitioner: Accept/Reject when REQUESTED */}
        {isPractitioner && booking.status === BOOKING_STATUS.REQUESTED && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={handleReject}
              activeOpacity={0.7}
            >
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAccept}
              activeOpacity={0.7}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Practitioner: Complete when IN_PROGRESS */}
        {isPractitioner && booking.status === BOOKING_STATUS.IN_PROGRESS && (
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={handleComplete}
            activeOpacity={0.7}
          >
            <Text style={styles.completeButtonText}>Mark as Completed</Text>
          </TouchableOpacity>
        )}

        {/* Patient: Cancel when REQUESTED or ACCEPTED */}
        {!isPractitioner &&
          (booking.status === BOOKING_STATUS.REQUESTED ||
            booking.status === BOOKING_STATUS.ACCEPTED) && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel Booking</Text>
            </TouchableOpacity>
          )}

        {/* Practitioner: Cancel when ACCEPTED */}
        {isPractitioner && booking.status === BOOKING_STATUS.ACCEPTED && (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancel Booking</Text>
          </TouchableOpacity>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  bookingId: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  timeline: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  timelineStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  timelineIndicatorRow: {
    alignItems: 'center',
    marginRight: 12,
    width: 24,
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotCompleted: {
    backgroundColor: COLORS.primary,
  },
  timelineDotCurrent: {
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: COLORS.greenLight,
  },
  timelineCheck: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  timelineLine: {
    width: 2,
    height: 20,
    backgroundColor: COLORS.gray200,
  },
  timelineLineCompleted: {
    backgroundColor: COLORS.primary,
  },
  timelineLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    paddingTop: 3,
  },
  timelineLabelCompleted: {
    color: COLORS.textPrimary,
  },
  timelineLabelCurrent: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  mapPlaceholder: {
    backgroundColor: COLORS.gray100,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  mapPlaceholderIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  mapPlaceholderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  mapPlaceholderText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 14,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  personAvatarText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  personPhone: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  personType: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '500',
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  feeValue: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  actions: {
    marginTop: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  acceptButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
  rejectButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.danger,
  },
  rejectButtonText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.danger,
  },
  cancelButtonText: {
    color: COLORS.danger,
    fontSize: 15,
    fontWeight: '700',
  },
  completeButton: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  completeButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
