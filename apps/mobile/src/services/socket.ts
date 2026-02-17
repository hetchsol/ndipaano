import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LocationUpdate {
  bookingId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  heading?: number;
  speed?: number;
}

export interface TrackingEvents {
  locationUpdate: (data: LocationUpdate) => void;
  practitionerArrived: (data: { bookingId: string }) => void;
  bookingStatusChanged: (data: { bookingId: string; status: string }) => void;
}

// ─── Socket Connection Factory ───────────────────────────────────────────────

let trackingSocket: Socket | null = null;

/**
 * Connect to the /tracking namespace with authentication.
 */
export function connectTracking(token: string): Socket {
  if (trackingSocket?.connected) {
    return trackingSocket;
  }

  trackingSocket = io(`${SOCKET_URL}/tracking`, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  trackingSocket.on('connect', () => {
    console.log('[Socket] Connected to tracking namespace');
  });

  trackingSocket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
  });

  trackingSocket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  trackingSocket.on('reconnect', (attemptNumber) => {
    console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
  });

  return trackingSocket;
}

/**
 * Subscribe to location updates for a specific booking.
 * Joins the booking room on the server to receive real-time location data.
 */
export function subscribeToBooking(bookingId: string): void {
  if (!trackingSocket?.connected) {
    console.warn('[Socket] Not connected. Cannot subscribe to booking:', bookingId);
    return;
  }
  trackingSocket.emit('joinBookingRoom', { bookingId });
  console.log('[Socket] Subscribed to booking:', bookingId);
}

/**
 * Unsubscribe from location updates for a specific booking.
 */
export function unsubscribeFromBooking(bookingId: string): void {
  if (!trackingSocket?.connected) {
    return;
  }
  trackingSocket.emit('leaveBookingRoom', { bookingId });
  console.log('[Socket] Unsubscribed from booking:', bookingId);
}

/**
 * Send a location update for a booking (used by practitioners).
 */
export function sendLocationUpdate(
  bookingId: string,
  latitude: number,
  longitude: number,
  heading?: number,
  speed?: number,
): void {
  if (!trackingSocket?.connected) {
    console.warn('[Socket] Not connected. Cannot send location update.');
    return;
  }
  const update: LocationUpdate = {
    bookingId,
    latitude,
    longitude,
    timestamp: new Date().toISOString(),
    heading,
    speed,
  };
  trackingSocket.emit('locationUpdate', update);
}

/**
 * Listen for location updates from the practitioner.
 */
export function onLocationUpdate(callback: (data: LocationUpdate) => void): () => void {
  if (!trackingSocket) {
    console.warn('[Socket] Not connected. Cannot listen for location updates.');
    return () => {};
  }
  trackingSocket.on('locationUpdate', callback);
  return () => {
    trackingSocket?.off('locationUpdate', callback);
  };
}

/**
 * Listen for practitioner arrival events.
 */
export function onPractitionerArrived(
  callback: (data: { bookingId: string }) => void,
): () => void {
  if (!trackingSocket) {
    return () => {};
  }
  trackingSocket.on('practitionerArrived', callback);
  return () => {
    trackingSocket?.off('practitionerArrived', callback);
  };
}

/**
 * Listen for booking status change events.
 */
export function onBookingStatusChanged(
  callback: (data: { bookingId: string; status: string }) => void,
): () => void {
  if (!trackingSocket) {
    return () => {};
  }
  trackingSocket.on('bookingStatusChanged', callback);
  return () => {
    trackingSocket?.off('bookingStatusChanged', callback);
  };
}

/**
 * Cleanly disconnect the tracking socket.
 */
export function disconnect(): void {
  if (trackingSocket) {
    trackingSocket.removeAllListeners();
    trackingSocket.disconnect();
    trackingSocket = null;
    console.log('[Socket] Disconnected and cleaned up');
  }
}

/**
 * Check if the tracking socket is currently connected.
 */
export function isConnected(): boolean {
  return trackingSocket?.connected ?? false;
}
