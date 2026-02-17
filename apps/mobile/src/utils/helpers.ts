import { format, formatDistanceToNow, isToday, isTomorrow, parseISO } from 'date-fns';
import { BOOKING_STATUS, COLORS } from './constants';

/**
 * Format a date string for display.
 * Shows "Today", "Tomorrow", or a formatted date string.
 */
export function formatDate(dateString: string, formatStr?: string): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (isToday(date)) {
      return `Today, ${format(date, 'h:mm a')}`;
    }
    if (isTomorrow(date)) {
      return `Tomorrow, ${format(date, 'h:mm a')}`;
    }
    return format(date, formatStr || 'MMM d, yyyy h:mm a');
  } catch {
    return dateString;
  }
}

/**
 * Format a date as relative time (e.g., "2 hours ago").
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return dateString;
  }
}

/**
 * Format a number as Zambian Kwacha currency.
 */
export function formatCurrency(amount: number): string {
  return `ZMW ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

/**
 * Format a Zambian phone number for display.
 */
export function formatPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('260') && cleaned.length === 12) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `0${cleaned.slice(1, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  return phone;
}

/**
 * Get the display color for a booking status.
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case BOOKING_STATUS.REQUESTED:
      return COLORS.blue;
    case BOOKING_STATUS.ACCEPTED:
      return COLORS.primary;
    case BOOKING_STATUS.EN_ROUTE:
      return COLORS.orange;
    case BOOKING_STATUS.IN_PROGRESS:
      return COLORS.secondary;
    case BOOKING_STATUS.COMPLETED:
      return COLORS.success;
    case BOOKING_STATUS.CANCELLED:
      return COLORS.gray500;
    case BOOKING_STATUS.REJECTED:
      return COLORS.danger;
    default:
      return COLORS.gray500;
  }
}

/**
 * Get a lighter background color for a booking status badge.
 */
export function getStatusBackgroundColor(status: string): string {
  switch (status) {
    case BOOKING_STATUS.REQUESTED:
      return COLORS.blueLight;
    case BOOKING_STATUS.ACCEPTED:
      return COLORS.greenLight;
    case BOOKING_STATUS.EN_ROUTE:
      return COLORS.orangeLight;
    case BOOKING_STATUS.IN_PROGRESS:
      return COLORS.yellowLight;
    case BOOKING_STATUS.COMPLETED:
      return COLORS.greenLight;
    case BOOKING_STATUS.CANCELLED:
      return COLORS.gray100;
    case BOOKING_STATUS.REJECTED:
      return COLORS.redLight;
    default:
      return COLORS.gray100;
  }
}

/**
 * Get initials from a user's name.
 */
export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Validate a Zambian phone number.
 */
export function isValidZambianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return (
    (cleaned.startsWith('260') && cleaned.length === 12) ||
    (cleaned.startsWith('0') && cleaned.length === 10)
  );
}

/**
 * Validate email format.
 */
export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Truncate text to a maximum length with ellipsis.
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Format a distance in kilometers.
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
}

/**
 * Get a human-readable label for booking status.
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case BOOKING_STATUS.REQUESTED:
      return 'Requested';
    case BOOKING_STATUS.ACCEPTED:
      return 'Accepted';
    case BOOKING_STATUS.EN_ROUTE:
      return 'En Route';
    case BOOKING_STATUS.IN_PROGRESS:
      return 'In Progress';
    case BOOKING_STATUS.COMPLETED:
      return 'Completed';
    case BOOKING_STATUS.CANCELLED:
      return 'Cancelled';
    case BOOKING_STATUS.REJECTED:
      return 'Rejected';
    default:
      return status;
  }
}
