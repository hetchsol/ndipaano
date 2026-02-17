import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { User } from '../services/api';
import { COLORS } from '../utils/constants';
import { formatCurrency, formatDistance, getInitials } from '../utils/helpers';

interface PractitionerCardProps {
  practitioner: User;
  distance?: number;
  onBook: (practitioner: User) => void;
  onPress: (practitioner: User) => void;
}

export default function PractitionerCard({
  practitioner,
  distance,
  onBook,
  onPress,
}: PractitionerCardProps) {
  const fullName = `${practitioner.firstName} ${practitioner.lastName}`;
  const initials = getInitials(fullName);
  const profile = practitioner.practitionerProfile;

  const typeLabel = profile?.practitionerType
    ?.replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.5;
    const stars: string[] = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push('\u2605');
    }
    if (hasHalf) {
      stars.push('\u2606');
    }
    while (stars.length < 5) {
      stars.push('\u2606');
    }
    return stars.join('');
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(practitioner)}
      activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {fullName}
          </Text>
          <Text style={styles.type} numberOfLines={1}>
            {typeLabel || 'Practitioner'}
          </Text>
          <View style={styles.ratingRow}>
            <Text style={styles.stars}>{renderStars(profile?.rating || 0)}</Text>
            <Text style={styles.ratingText}>
              {profile?.rating?.toFixed(1) || '0.0'} ({profile?.totalReviews || 0})
            </Text>
          </View>
        </View>
        {profile?.isAvailable && (
          <View style={styles.availableBadge}>
            <View style={styles.availableDot} />
            <Text style={styles.availableText}>Available</Text>
          </View>
        )}
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomRow}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Fee</Text>
          <Text style={styles.detailValue}>
            {formatCurrency(profile?.consultationFee || 0)}
          </Text>
        </View>
        {distance !== undefined && (
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Distance</Text>
            <Text style={styles.detailValue}>{formatDistance(distance)}</Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => onBook(practitioner)}
          activeOpacity={0.7}
        >
          <Text style={styles.bookButtonText}>Book</Text>
        </TouchableOpacity>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  type: {
    fontSize: 13,
    color: COLORS.secondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    fontSize: 14,
    color: COLORS.secondaryLight,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
    marginRight: 4,
  },
  availableText: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailItem: {
    marginRight: 20,
  },
  detailLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  bookButton: {
    marginLeft: 'auto',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  bookButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
