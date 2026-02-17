import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/auth.store';
import { useBookingStore } from '../stores/booking.store';
import { COLORS, BOOKING_STATUS } from '../utils/constants';
import BookingCard from '../components/BookingCard';
import EmptyState from '../components/EmptyState';
import type { MainStackParamList } from '../navigation/types';
import type { Booking } from '../services/api';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

type TabKey = 'upcoming' | 'past' | 'cancelled';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function BookingsListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore((s) => s.user);
  const { bookings, fetchBookings, isLoading } = useBookingStore();

  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
  const [refreshing, setRefreshing] = useState(false);

  const loadBookings = useCallback(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  };

  const filteredBookings = bookings.filter((booking) => {
    switch (activeTab) {
      case 'upcoming':
        return [
          BOOKING_STATUS.REQUESTED,
          BOOKING_STATUS.ACCEPTED,
          BOOKING_STATUS.EN_ROUTE,
          BOOKING_STATUS.IN_PROGRESS,
        ].includes(booking.status as typeof BOOKING_STATUS[keyof typeof BOOKING_STATUS]);
      case 'past':
        return booking.status === BOOKING_STATUS.COMPLETED;
      case 'cancelled':
        return (
          booking.status === BOOKING_STATUS.CANCELLED ||
          booking.status === BOOKING_STATUS.REJECTED
        );
      default:
        return true;
    }
  });

  const handleBookingPress = (booking: Booking) => {
    navigation.navigate('BookingDetail', { bookingId: booking.id });
  };

  const renderBooking = ({ item }: { item: Booking }) => (
    <BookingCard
      booking={item}
      currentUserRole={user?.role === 'PRACTITIONER' ? 'PRACTITIONER' : 'PATIENT'}
      onPress={handleBookingPress}
    />
  );

  const getEmptyMessage = (): { title: string; subtitle: string; icon: string } => {
    switch (activeTab) {
      case 'upcoming':
        return {
          icon: '\u2637',
          title: 'No Upcoming Bookings',
          subtitle:
            user?.role === 'PRACTITIONER'
              ? 'You have no upcoming appointments. New booking requests will appear here.'
              : 'You have no upcoming appointments. Search for a practitioner to book a visit.',
        };
      case 'past':
        return {
          icon: '\u2713',
          title: 'No Past Bookings',
          subtitle: 'Your completed appointments will appear here.',
        };
      case 'cancelled':
        return {
          icon: '\u2715',
          title: 'No Cancelled Bookings',
          subtitle: 'You have no cancelled or rejected bookings.',
        };
    }
  };

  const emptyMessage = getEmptyMessage();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bookings List */}
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          renderItem={renderBooking}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={emptyMessage.icon}
              title={emptyMessage.title}
              subtitle={emptyMessage.subtitle}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.gray100,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
});
