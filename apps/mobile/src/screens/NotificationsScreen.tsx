import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNotificationStore } from '../stores/notification.store';
import { COLORS } from '../utils/constants';
import { formatRelativeTime } from '../utils/helpers';
import EmptyState from '../components/EmptyState';
import type { AppNotification } from '../services/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getNotificationIcon(type: string): string {
  switch (type) {
    case 'BOOKING_REQUESTED':
      return '\u2637';
    case 'BOOKING_ACCEPTED':
      return '\u2713';
    case 'BOOKING_REJECTED':
      return '\u2715';
    case 'BOOKING_CANCELLED':
      return '\u2715';
    case 'BOOKING_COMPLETED':
      return '\u2605';
    case 'BOOKING_EN_ROUTE':
      return '\u27A4';
    case 'BOOKING_IN_PROGRESS':
      return '\u231B';
    case 'PAYMENT':
    case 'PAYMENT_RECEIVED':
      return '\u2696';
    case 'MEDICAL_RECORD':
      return '\u2630';
    case 'PRESCRIPTION':
      return '\u2695';
    case 'EMERGENCY':
      return '!';
    case 'SYSTEM':
      return '\u2699';
    default:
      return '\u2709';
  }
}

function getNotificationIconColor(type: string): { bg: string; fg: string } {
  switch (type) {
    case 'BOOKING_REQUESTED':
      return { bg: COLORS.blueLight, fg: COLORS.blue };
    case 'BOOKING_ACCEPTED':
      return { bg: COLORS.greenLight, fg: COLORS.success };
    case 'BOOKING_REJECTED':
    case 'BOOKING_CANCELLED':
      return { bg: COLORS.redLight, fg: COLORS.danger };
    case 'BOOKING_COMPLETED':
      return { bg: COLORS.greenLight, fg: COLORS.primary };
    case 'BOOKING_EN_ROUTE':
      return { bg: COLORS.orangeLight, fg: COLORS.orange };
    case 'BOOKING_IN_PROGRESS':
      return { bg: COLORS.yellowLight, fg: COLORS.yellow };
    case 'PAYMENT':
    case 'PAYMENT_RECEIVED':
      return { bg: COLORS.greenLight, fg: COLORS.primary };
    case 'MEDICAL_RECORD':
      return { bg: COLORS.blueLight, fg: COLORS.blue };
    case 'PRESCRIPTION':
      return { bg: COLORS.greenLight, fg: COLORS.primary };
    case 'EMERGENCY':
      return { bg: COLORS.redLight, fg: COLORS.danger };
    default:
      return { bg: COLORS.gray100, fg: COLORS.gray500 };
  }
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    fetchUnreadCount,
  } = useNotificationStore();

  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    await Promise.all([fetchNotifications(1), fetchUnreadCount()]);
  }, [fetchNotifications, fetchUnreadCount]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: AppNotification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
  };

  const renderNotification = ({ item }: { item: AppNotification }) => {
    const icon = getNotificationIcon(item.type);
    const iconColors = getNotificationIconColor(item.type);
    const isUnread = !item.isRead;

    return (
      <TouchableOpacity
        style={[styles.notificationCard, isUnread && styles.notificationCardUnread]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        {/* Unread indicator */}
        {isUnread && <View style={styles.unreadDot} />}

        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: iconColors.bg }]}>
          <Text style={[styles.iconText, { color: iconColors.fg }]}>{icon}</Text>
        </View>

        {/* Content */}
        <View style={styles.notificationContent}>
          <Text
            style={[styles.notificationTitle, isUnread && styles.notificationTitleUnread]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={styles.notificationBody} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.notificationTime}>{formatRelativeTime(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ─── Loading state ─────────────────────────────────────────────────────────

  if (isLoading && notifications.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadCountBadge}>
              <Text style={styles.unreadCountText}>{unreadCount} unread</Text>
            </View>
          )}
        </View>
        <Text style={styles.headerSubtitle}>
          Stay updated on your bookings and health
        </Text>
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={'\u2709'}
            title="No Notifications"
            subtitle="You're all caught up! New notifications about bookings, records, and alerts will appear here."
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  unreadCountBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unreadCountText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 68,
  },

  // ─── Notification card ────────────────────────────────────────────────────
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 4,
    position: 'relative',
  },
  notificationCardUnread: {
    backgroundColor: COLORS.greenLight,
    marginHorizontal: -8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  unreadDot: {
    position: 'absolute',
    top: 18,
    left: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconText: {
    fontSize: 18,
    fontWeight: '700',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  notificationTitleUnread: {
    fontWeight: '700',
  },
  notificationBody: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
