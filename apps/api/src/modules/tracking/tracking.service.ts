import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TrackingService {
  private readonly logger = new Logger(TrackingService.name);

  /**
   * Average speed assumption for ETA calculations (km/h).
   * Based on typical urban driving speed in Zambian cities.
   */
  private readonly AVERAGE_SPEED_KMH = 30;

  constructor(private readonly prisma: PrismaService) {}

  // ===========================================================================
  // Update Location
  // ===========================================================================

  /**
   * Upsert (create or update) a BookingTracking record with the practitioner's
   * current GPS coordinates. Also recalculates the estimated arrival time
   * based on the distance to the booking location.
   */
  async updateLocation(bookingId: string, lat: number, lng: number) {
    // Fetch the booking to get the destination coordinates
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        locationLat: true,
        locationLng: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${bookingId} not found`);
    }

    // Calculate ETA if destination coordinates are available
    let estimatedArrivalMinutes: number | null = null;
    if (booking.locationLat != null && booking.locationLng != null) {
      estimatedArrivalMinutes = this.calculateETA(
        lat,
        lng,
        booking.locationLat,
        booking.locationLng,
      );
    }

    const tracking = await this.prisma.bookingTracking.upsert({
      where: { bookingId },
      create: {
        bookingId,
        practitionerLat: lat,
        practitionerLng: lng,
        estimatedArrivalMinutes,
      },
      update: {
        practitionerLat: lat,
        practitionerLng: lng,
        estimatedArrivalMinutes,
      },
    });

    this.logger.debug(
      `Updated location for booking ${bookingId}: (${lat}, ${lng}), ETA: ${estimatedArrivalMinutes ?? 'N/A'} min`,
    );

    return tracking;
  }

  // ===========================================================================
  // Get Location
  // ===========================================================================

  /**
   * Get the current tracking data for a booking.
   */
  async getLocation(bookingId: string) {
    const tracking = await this.prisma.bookingTracking.findUnique({
      where: { bookingId },
    });

    if (!tracking) {
      throw new NotFoundException(
        `No tracking data found for booking ${bookingId}`,
      );
    }

    return tracking;
  }

  // ===========================================================================
  // Calculate ETA
  // ===========================================================================

  /**
   * Calculate estimated time of arrival (in minutes) using the Haversine formula
   * for distance calculation, assuming an average speed of 30 km/h.
   *
   * This is a simplified estimate suitable for urban areas. For production use,
   * integrate with a routing API (e.g., Google Maps, Mapbox) for accurate ETAs.
   */
  calculateETA(
    practitionerLat: number,
    practitionerLng: number,
    destinationLat: number,
    destinationLng: number,
  ): number {
    const distanceKm = this.haversineDistance(
      practitionerLat,
      practitionerLng,
      destinationLat,
      destinationLng,
    );

    // Time = Distance / Speed, convert hours to minutes
    const timeMinutes = (distanceKm / this.AVERAGE_SPEED_KMH) * 60;

    // Round up to the nearest whole minute, minimum 1 minute
    return Math.max(1, Math.ceil(timeMinutes));
  }

  // ===========================================================================
  // Haversine Distance
  // ===========================================================================

  /**
   * Calculate the great-circle distance between two points on Earth
   * using the Haversine formula.
   *
   * @returns Distance in kilometers
   */
  private haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const EARTH_RADIUS_KM = 6371;

    const toRadians = (degrees: number) => degrees * (Math.PI / 180);

    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_KM * c;
  }
}
