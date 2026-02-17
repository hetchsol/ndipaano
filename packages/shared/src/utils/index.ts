import { COUNTRY_CODE, CURRENCY, PLATFORM_COMMISSION_PERCENT } from '../constants/zambia';

/**
 * Normalizes a Zambian phone number to the international format +260XXXXXXXXX.
 *
 * Accepted input formats:
 * - +260XXXXXXXXX  (already international)
 * - 260XXXXXXXXX   (missing +)
 * - 0XXXXXXXXX     (local format)
 * - XXXXXXXXX      (just the subscriber number)
 *
 * @param phone - The phone number string to normalize
 * @returns The phone number in +260XXXXXXXXX format
 * @throws Error if the phone number cannot be normalized to a valid format
 */
export function formatZambianPhone(phone: string): string {
  // Strip all whitespace, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-().]/g, '');

  let normalized: string;

  if (cleaned.startsWith('+260')) {
    normalized = cleaned;
  } else if (cleaned.startsWith('260')) {
    normalized = `+${cleaned}`;
  } else if (cleaned.startsWith('0')) {
    normalized = `${COUNTRY_CODE}${cleaned.slice(1)}`;
  } else if (cleaned.length === 9) {
    normalized = `${COUNTRY_CODE}${cleaned}`;
  } else {
    throw new Error(
      `Unable to normalize phone number "${phone}" to Zambian format. Expected formats: +260XXXXXXXXX, 0XXXXXXXXX, or 9-digit subscriber number.`
    );
  }

  if (!isValidZambianPhone(normalized)) {
    throw new Error(
      `Normalized phone number "${normalized}" is not a valid Zambian phone number.`
    );
  }

  return normalized;
}

/**
 * Validates whether a phone number is a valid Zambian mobile number.
 * Must be in the format +260 followed by exactly 9 digits.
 *
 * @param phone - The phone number string to validate
 * @returns true if the phone number matches +260XXXXXXXXX
 */
export function isValidZambianPhone(phone: string): boolean {
  return /^\+260[0-9]{9}$/.test(phone);
}

/**
 * Formats a numeric amount as Zambian Kwacha currency string.
 *
 * @param amount - The amount to format
 * @returns Formatted string like "ZMW 1,234.56"
 */
export function formatCurrency(amount: number): string {
  const formatted = amount.toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${CURRENCY} ${formatted}`;
}

/**
 * Calculates the platform commission and practitioner payout for a given amount.
 *
 * @param amount - The total booking amount in ZMW
 * @param rate - Commission rate as a percentage (default: PLATFORM_COMMISSION_PERCENT)
 * @returns An object with the commission amount and the practitioner payout
 */
export function calculateCommission(
  amount: number,
  rate: number = PLATFORM_COMMISSION_PERCENT
): { commission: number; payout: number } {
  const commission = Math.round(amount * (rate / 100) * 100) / 100;
  const payout = Math.round((amount - commission) * 100) / 100;
  return { commission, payout };
}

/**
 * Calculates the great-circle distance between two geographic points
 * using the Haversine formula.
 *
 * @param lat1 - Latitude of the first point in decimal degrees
 * @param lng1 - Longitude of the first point in decimal degrees
 * @param lat2 - Latitude of the second point in decimal degrees
 * @param lng2 - Longitude of the second point in decimal degrees
 * @returns Distance between the two points in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const EARTH_RADIUS_KM = 6371;

  const toRadians = (degrees: number): number => degrees * (Math.PI / 180);

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_KM * c * 100) / 100;
}
