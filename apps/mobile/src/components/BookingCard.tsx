import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Booking } from '../services/api';
import { COLORS } from '../utils/constants';
import { formatDate, getInitials } from '../utils/helpers';
import StatusBadge from './StatusBadge';

interface BookingCardProps {
  booking: Booking;
  currentUserRole: 'PATIENT' | 'PRACTITIONER';
  onPress: (booking: Booking) => void;
}

export default function BookingCard({ booking, currentUserRole, onPress }: BookingCardProps) {
  const otherParty =
    currentUserRole === 'PATIENT' ? booking.practitioner : booking.patient;
  const otherPartyName = otherParty
    ? `${otherParty.firstName} ${otherParty.lastName}`
    : 'Unknown';
  const initials = getInitials(otherPartyName);

  const serviceLabel = booking.serviceType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(booking)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.name} numberOfLines={1}>
              {otherPartyName}
            </Text>
            <Text style={styles.serviceType} numberOfLines={1}>
              {serviceLabel}
            </Text>
          </View>
        </View>
        <StatusBadge status={booking.status} size="small" />
      </View>

      <View style={styles.divider} />

      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Date</Text>
          <Text style={styles.footerValue} numberOfLines={1}>
            {formatDate(booking.scheduledDate)}
          </Text>
        </View>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Address</Text>
          <Text style={styles.footerValue} numberOfLines={1}>
            {booking.address || 'Not specified'}
          </Text>
        </View>
        <View style={styles.feeContainer}>
          <Text style={styles.fee}>ZMW {booking.fee?.toFixed(2) || '0.00'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  serviceType: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  footerItem: {
    flex: 1,
    marginRight: 8,
  },
  footerLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footerValue: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  feeContainer: {
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  fee: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
