import { create } from 'zustand';
import { notificationsApi, AppNotification } from '../services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  totalNotifications: number;
  currentPage: number;

  // Actions
  fetchNotifications: (page?: number) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  addNotification: (notification: AppNotification) => void;
  clearError: () => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  totalNotifications: 0,
  currentPage: 1,

  fetchNotifications: async (page: number = 1) => {
    set({ isLoading: true, error: null });
    try {
      const response = await notificationsApi.list({ page, limit: 20 });
      set({
        notifications: page === 1 ? response.data : [...get().notifications, ...response.data],
        totalNotifications: response.total,
        currentPage: response.page,
        isLoading: false,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to fetch notifications.';
      set({ isLoading: false, error: message });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      const { notifications, unreadCount } = get();
      const updatedNotifications = notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n,
      );
      const wasUnread = notifications.find((n) => n.id === id && !n.isRead);
      set({
        notifications: updatedNotifications,
        unreadCount: wasUnread ? Math.max(0, unreadCount - 1) : unreadCount,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to mark notification as read.';
      set({ error: message });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const response = await notificationsApi.getUnreadCount();
      set({ unreadCount: response.count });
    } catch {
      // Silently fail for unread count - non-critical
    }
  },

  addNotification: (notification: AppNotification) => {
    const { notifications, unreadCount } = get();
    set({
      notifications: [notification, ...notifications],
      unreadCount: notification.isRead ? unreadCount : unreadCount + 1,
    });
  },

  clearError: () => set({ error: null }),
}));
