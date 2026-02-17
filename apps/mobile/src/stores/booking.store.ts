import { create } from 'zustand';
import { bookingsApi, Booking, CreateBookingDto } from '../services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BookingQuery {
  status?: string;
  page?: number;
  limit?: number;
}

interface BookingState {
  bookings: Booking[];
  upcomingBookings: Booking[];
  selectedBooking: Booking | null;
  isLoading: boolean;
  error: string | null;
  totalBookings: number;
  currentPage: number;

  // Actions
  fetchBookings: (query?: BookingQuery) => Promise<void>;
  fetchUpcoming: () => Promise<void>;
  createBooking: (dto: CreateBookingDto) => Promise<Booking>;
  cancelBooking: (id: string, reason?: string) => Promise<void>;
  acceptBooking: (id: string) => Promise<void>;
  rejectBooking: (id: string, reason?: string) => Promise<void>;
  completeBooking: (id: string) => Promise<void>;
  fetchBookingById: (id: string) => Promise<void>;
  clearSelectedBooking: () => void;
  updateBookingInList: (booking: Booking) => void;
  clearError: () => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useBookingStore = create<BookingState>((set, get) => ({
  bookings: [],
  upcomingBookings: [],
  selectedBooking: null,
  isLoading: false,
  error: null,
  totalBookings: 0,
  currentPage: 1,

  fetchBookings: async (query?: BookingQuery) => {
    set({ isLoading: true, error: null });
    try {
      const response = await bookingsApi.list(query);
      set({
        bookings: response.data,
        totalBookings: response.total,
        currentPage: response.page,
        isLoading: false,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to fetch bookings.';
      set({ isLoading: false, error: message });
    }
  },

  fetchUpcoming: async () => {
    set({ isLoading: true, error: null });
    try {
      const upcoming = await bookingsApi.getUpcoming();
      set({ upcomingBookings: upcoming, isLoading: false });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to fetch upcoming bookings.';
      set({ isLoading: false, error: message });
    }
  },

  createBooking: async (dto: CreateBookingDto) => {
    set({ isLoading: true, error: null });
    try {
      const booking = await bookingsApi.create(dto);
      const { bookings, upcomingBookings } = get();
      set({
        bookings: [booking, ...bookings],
        upcomingBookings: [booking, ...upcomingBookings],
        selectedBooking: booking,
        isLoading: false,
      });
      return booking;
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to create booking.';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  cancelBooking: async (id: string, reason?: string) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await bookingsApi.cancel(id, reason);
      get().updateBookingInList(updated);
      set({ isLoading: false });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to cancel booking.';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  acceptBooking: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await bookingsApi.accept(id);
      get().updateBookingInList(updated);
      set({ isLoading: false });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to accept booking.';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  rejectBooking: async (id: string, reason?: string) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await bookingsApi.reject(id, reason);
      get().updateBookingInList(updated);
      set({ isLoading: false });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to reject booking.';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  completeBooking: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await bookingsApi.complete(id);
      get().updateBookingInList(updated);
      set({ isLoading: false });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to complete booking.';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  fetchBookingById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const booking = await bookingsApi.getById(id);
      set({ selectedBooking: booking, isLoading: false });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to fetch booking details.';
      set({ isLoading: false, error: message });
    }
  },

  clearSelectedBooking: () => set({ selectedBooking: null }),

  updateBookingInList: (booking: Booking) => {
    const { bookings, upcomingBookings, selectedBooking } = get();

    const updatedBookings = bookings.map((b) => (b.id === booking.id ? booking : b));
    const updatedUpcoming = upcomingBookings.map((b) => (b.id === booking.id ? booking : b));

    set({
      bookings: updatedBookings,
      upcomingBookings: updatedUpcoming,
      selectedBooking: selectedBooking?.id === booking.id ? booking : selectedBooking,
    });
  },

  clearError: () => set({ error: null }),
}));
