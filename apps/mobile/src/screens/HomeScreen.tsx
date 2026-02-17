import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/auth.store';
import { useBookingStore } from '../stores/booking.store';
import { useNotificationStore } from '../stores/notification.store';
import { practitionersApi } from '../services/api';
import { COLORS } from '../utils/constants';
import { formatDate, getInitials } from '../utils/helpers';
import BookingCard from '../components/BookingCard';
import StatusBadge from '../components/StatusBadge';
import type { MainStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore((s) => s.user);
  const { upcomingBookings, fetchUpcoming, isLoading } = useBookingStore();
  const { unreadCount, fetchUnreadCount } = useNotificationStore();

  const isPractitioner = user?.role === 'PRACTITIONER';
  const fullName = user ? `${user.firstName} ${user.lastName}` : 'User';

  const [refreshing, setRefreshing] = React.useState(false);
  const [isAvailable, setIsAvailable] = React.useState(
    user?.practitionerProfile?.isAvailable ?? false,
  );

  const loadData = useCallback(async () => {
    await Promise.all([fetchUpcoming(), fetchUnreadCount()]);
  }, [fetchUpcoming, fetchUnreadCount]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleToggleAvailability = async () => {
    try {
      const result = await practitionersApi.toggleAvailability();
      setIsAvailable(result.isAvailable);
    } catch {
      Alert.alert('Error', 'Failed to update availability. Please try again.');
    }
  };

  const pendingBookings = upcomingBookings.filter((b) => b.status === 'REQUESTED');
  const displayBookings = upcomingBookings.slice(0, 3);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{fullName}</Text>
          {isPractitioner && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {user?.practitionerProfile?.practitionerType?.replace(/_/g, ' ') ||
                  'Practitioner'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Text style={styles.notificationIcon}>{'\u2709'}</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarSmallText}>{getInitials(fullName)}</Text>
          </View>
        </View>
      </View>

      {/* Practitioner Availability Toggle */}
      {isPractitioner && (
        <View style={styles.availabilityCard}>
          <View style={styles.availabilityInfo}>
            <View
              style={[
                styles.availabilityDot,
                { backgroundColor: isAvailable ? COLORS.success : COLORS.gray400 },
              ]}
            />
            <View>
              <Text style={styles.availabilityTitle}>
                {isAvailable ? 'You are Available' : 'You are Offline'}
              </Text>
              <Text style={styles.availabilitySubtitle}>
                {isAvailable
                  ? 'Patients can see and book you'
                  : 'Toggle to start receiving bookings'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.availabilityToggle,
              isAvailable ? styles.availabilityToggleOn : styles.availabilityToggleOff,
            ]}
            onPress={handleToggleAvailability}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.availabilityToggleText,
                isAvailable
                  ? styles.availabilityToggleTextOn
                  : styles.availabilityToggleTextOff,
              ]}
            >
              {isAvailable ? 'Go Offline' : 'Go Online'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Practitioner Pending Requests */}
      {isPractitioner && pendingBookings.length > 0 && (
        <TouchableOpacity
          style={styles.pendingCard}
          onPress={() =>
            navigation.navigate(isPractitioner ? 'PractitionerTabs' : 'PatientTabs', {
              screen: 'Bookings',
            } as never)
          }
          activeOpacity={0.7}
        >
          <View style={styles.pendingIcon}>
            <Text style={styles.pendingIconText}>{pendingBookings.length}</Text>
          </View>
          <View style={styles.pendingInfo}>
            <Text style={styles.pendingTitle}>Pending Requests</Text>
            <Text style={styles.pendingSubtitle}>
              {pendingBookings.length} booking{pendingBookings.length !== 1 ? 's' : ''}{' '}
              awaiting your response
            </Text>
          </View>
          <Text style={styles.pendingArrow}>{'\u203A'}</Text>
        </TouchableOpacity>
      )}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActions}>
        {!isPractitioner && (
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() =>
              navigation.navigate('PatientTabs', { screen: 'Search' } as never)
            }
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.greenLight }]}>
              <Text style={[styles.actionIconText, { color: COLORS.primary }]}>
                {'\u2315'}
              </Text>
            </View>
            <Text style={styles.actionLabel}>Book Visit</Text>
          </TouchableOpacity>
        )}
        {!isPractitioner && (
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() =>
              navigation.navigate('PatientTabs', { screen: 'Records' } as never)
            }
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.blueLight }]}>
              <Text style={[styles.actionIconText, { color: COLORS.blue }]}>
                {'\u2630'}
              </Text>
            </View>
            <Text style={styles.actionLabel}>Records</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Emergency')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: COLORS.redLight }]}>
            <Text style={[styles.actionIconText, { color: COLORS.danger }]}>{'!'}</Text>
          </View>
          <Text style={styles.actionLabel}>Emergency</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Notifications')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: COLORS.yellowLight }]}>
            <Text style={[styles.actionIconText, { color: COLORS.yellow }]}>
              {'\u2709'}
            </Text>
          </View>
          <Text style={styles.actionLabel}>Alerts</Text>
        </TouchableOpacity>
      </View>

      {/* Upcoming Appointments */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate(isPractitioner ? 'PractitionerTabs' : 'PatientTabs', {
              screen: 'Bookings',
            } as never)
          }
        >
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>

      {displayBookings.length > 0 ? (
        displayBookings.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            currentUserRole={user?.role === 'PRACTITIONER' ? 'PRACTITIONER' : 'PATIENT'}
            onPress={(b) => navigation.navigate('BookingDetail', { bookingId: b.id })}
          />
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>{'\u2637'}</Text>
          <Text style={styles.emptyStateTitle}>No Upcoming Appointments</Text>
          <Text style={styles.emptyStateSubtitle}>
            {isPractitioner
              ? 'Your upcoming bookings will appear here.'
              : 'Search for a practitioner to book a home visit.'}
          </Text>
        </View>
      )}
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
    paddingTop: 56,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: COLORS.secondaryLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  roleBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    position: 'relative',
    padding: 4,
  },
  notificationIcon: {
    fontSize: 24,
    color: COLORS.textPrimary,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  avatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSmallText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  availabilityCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  availabilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  availabilityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  availabilityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  availabilitySubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  availabilityToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  availabilityToggleOn: {
    backgroundColor: COLORS.gray100,
  },
  availabilityToggleOff: {
    backgroundColor: COLORS.primary,
  },
  availabilityToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  availabilityToggleTextOn: {
    color: COLORS.textSecondary,
  },
  availabilityToggleTextOff: {
    color: COLORS.white,
  },
  pendingCard: {
    backgroundColor: COLORS.secondaryLight,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  pendingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pendingIconText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  pendingInfo: {
    flex: 1,
  },
  pendingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  pendingSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  pendingArrow: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: '300',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    minWidth: 70,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionIconText: {
    fontSize: 22,
    fontWeight: '700',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  emptyState: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateIcon: {
    fontSize: 40,
    color: COLORS.gray300,
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  emptyStateSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
